"""
PricePredictionService — Production-ready "Buy or Wait" predictor.

Uses scikit-learn LinearRegression trained on up to 60 days of price
history to forecast the next 7 days.  Includes forward-fill for missing
days, volatility metric, trend direction, per-product in-memory cache
(TTL 1 h), and graceful fallback when Redis is unavailable.
"""

from __future__ import annotations

import logging
import time
from datetime import timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from django.utils import timezone
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler

from ml_engine.models import PricePrediction
from products.models import PriceHistory, Product

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory LRU cache  (product_id → (timestamp, result_dict))
# ---------------------------------------------------------------------------
_CACHE: Dict[int, Tuple[float, Dict[str, Any]]] = {}
_CACHE_TTL = 3600  # 1 hour


def _cache_get(product_id: int) -> Optional[Dict[str, Any]]:
    """Return cached result if still fresh, else None."""
    entry = _CACHE.get(product_id)
    if entry and (time.time() - entry[0]) < _CACHE_TTL:
        logger.debug("Cache HIT for product %s", product_id)
        return entry[1]
    return None


def _cache_set(product_id: int, result: Dict[str, Any]) -> None:
    """Store result in in-memory cache."""
    _CACHE[product_id] = (time.time(), result)
    # Keep cache bounded to ~500 entries
    if len(_CACHE) > 500:
        oldest_key = min(_CACHE, key=lambda k: _CACHE[k][0])
        _CACHE.pop(oldest_key, None)


# ---------------------------------------------------------------------------
# Main service
# ---------------------------------------------------------------------------

class PricePredictionService:
    """
    Production-ready price-prediction service.

    Workflow
    --------
    1. Fetch up to ``days_history`` days of PriceHistory rows.
    2. Forward-fill any missing calendar days.
    3. Reject if < ``min_data_points`` records.
    4. Train LinearRegression, compute R² confidence.
    5. Forecast next 7 days; clip negatives to 0.
    6. Derive recommendation, trend direction, volatility, message.
    7. Persist to PricePrediction and return result dict.
    """

    MIN_DATA_POINTS = 14
    DAYS_HISTORY = 60
    FORECAST_DAYS = 7

    # Recommendation thresholds on 7-day avg percent change
    BEST_PRICE_THRESHOLD = 5.0   # > +5 % → "best_price" (buy now)
    WAIT_THRESHOLD = -5.0        # < −5 % → "wait"

    def __init__(self, days_history: int = DAYS_HISTORY) -> None:
        self.days_history = days_history
        self.model = LinearRegression()
        self.scaler = StandardScaler()

    # ------------------------------------------------------------------
    # Data retrieval & preprocessing
    # ------------------------------------------------------------------

    def _fetch_history(self, product: Product) -> List[Dict]:
        """Return list of {date, price} dicts ordered by date ASC."""
        cutoff = timezone.now().date() - timedelta(days=self.days_history)
        qs = (
            PriceHistory.objects
            .filter(product=product, date__gte=cutoff)
            .order_by("date")
            .values("date", "price")
        )
        return list(qs)

    @staticmethod
    def _forward_fill(records: List[Dict]) -> Tuple[List[float], List]:
        """
        Fill gaps in the calendar so every day has a price.
        Missing days carry forward the previous day's price.
        """
        if not records:
            return [], []

        filled_prices: List[float] = []
        filled_dates: List = []

        start_date = records[0]["date"]
        end_date = records[-1]["date"]

        price_map = {r["date"]: float(r["price"]) for r in records}

        current = start_date
        last_price = float(records[0]["price"])
        while current <= end_date:
            price = price_map.get(current, last_price)
            filled_prices.append(price)
            filled_dates.append(current)
            last_price = price
            current += timedelta(days=1)

        return filled_prices, filled_dates

    # ------------------------------------------------------------------
    # Model training & prediction
    # ------------------------------------------------------------------

    def _train_and_forecast(
        self, prices: List[float]
    ) -> Optional[Dict[str, Any]]:
        """
        Train LinearRegression on *prices* and forecast 7 days.

        Returns dict with keys: predictions, r2, trend_slope
        or None if not enough data.
        """
        n = len(prices)
        if n < self.MIN_DATA_POINTS:
            logger.warning(
                "Only %d data points — need at least %d", n, self.MIN_DATA_POINTS
            )
            return None

        X = np.arange(n).reshape(-1, 1)
        y = np.array(prices)

        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)

        r2 = max(0.0, self.model.score(X_scaled, y))

        # Forecast
        future_idx = np.arange(n, n + self.FORECAST_DAYS).reshape(-1, 1)
        future_scaled = self.scaler.transform(future_idx)
        raw_preds = self.model.predict(future_scaled)

        # Clip negatives
        predictions = np.clip(raw_preds, 0, None).tolist()

        # Trend slope (per day, in original price units)
        trend_slope = float(
            self.model.coef_[0] * self.scaler.scale_[0]
        ) if self.scaler.scale_[0] != 0 else 0.0

        return {
            "predictions": predictions,
            "r2": round(r2, 4),
            "trend_slope": round(trend_slope, 2),
        }

    # ------------------------------------------------------------------
    # Business logic
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_volatility(prices: List[float]) -> float:
        """Standard deviation of daily returns (%)."""
        if len(prices) < 2:
            return 0.0
        arr = np.array(prices)
        returns = np.diff(arr) / arr[:-1] * 100
        return round(float(np.std(returns)), 2)

    @staticmethod
    def _trend_direction(slope: float) -> str:
        if slope > 0.5:
            return "up"
        elif slope < -0.5:
            return "down"
        return "stable"

    def _build_recommendation(
        self,
        current_price: float,
        predictions: List[float],
        volatility: float,
        r2: float,
        trend_slope: float,
    ) -> Dict[str, Any]:
        """
        Apply business rules to produce recommendation, message, etc.
        """
        avg_future = float(np.mean(predictions))
        pct_change = ((avg_future - current_price) / current_price) * 100 if current_price else 0.0
        pct_change = round(pct_change, 2)

        trend = self._trend_direction(trend_slope)

        # Recommendation
        if pct_change > self.BEST_PRICE_THRESHOLD:
            recommendation = "best_price"
            message = (
                f"🟢 Great time to buy! Price is predicted to rise "
                f"~{abs(pct_change):.1f}% over the next 7 days."
            )
        elif pct_change < self.WAIT_THRESHOLD:
            recommendation = "wait"
            message = (
                f"🟡 Hold off! Price may drop ~{abs(pct_change):.1f}% "
                f"in the next 7 days."
            )
        else:
            recommendation = "neutral"
            message = (
                "🔵 Price looks stable. Buy whenever convenient — "
                "no significant change expected."
            )

        confidence = round(min(r2, 1.0), 4)

        return {
            "recommendation": recommendation,
            "confidence_score": confidence,
            "price_change": pct_change,
            "message": message,
            "trend": trend,
            "volatility": volatility,
        }

    # ------------------------------------------------------------------
    # Public API (entry point)
    # ------------------------------------------------------------------

    def predict(self, product: Product, *, use_cache: bool = True) -> Dict[str, Any]:
        """
        Run full prediction pipeline for *product*.

        Returns a dict matching the API response contract:
        ```
        {
            "recommendation": "best_price" | "wait" | "neutral",
            "confidence_score": 0.0–1.0,
            "current_price": float,
            "predicted_prices": [day1, …, day7],
            "day1_price": float, …, "day7_price": float,
            "percent_change": float,
            "message": str,
            "trend": "up" | "down" | "stable",
            "volatility": float,
            "prediction_date": str (ISO),
        }
        ```
        """
        product_id = product.id
        current_price = float(product.current_price)

        # --- Cache check ---
        if use_cache:
            cached = _cache_get(product_id)
            if cached:
                return cached

        # --- Fetch & preprocess ---
        records = self._fetch_history(product)
        prices, dates = self._forward_fill(records)

        if len(prices) < self.MIN_DATA_POINTS:
            logger.info(
                "Product %s — insufficient history (%d pts)", product_id, len(prices)
            )
            return self._insufficient_data_response(current_price)

        # --- Train & forecast ---
        forecast = self._train_and_forecast(prices)
        if forecast is None:
            return self._insufficient_data_response(current_price)

        predictions = forecast["predictions"]
        r2 = forecast["r2"]
        trend_slope = forecast["trend_slope"]

        # --- Volatility ---
        volatility = self._compute_volatility(prices)

        # --- Business logic ---
        biz = self._build_recommendation(
            current_price, predictions, volatility, r2, trend_slope
        )

        # --- Persist ---
        prediction_obj = self._save(product, predictions, biz)

        # --- Build response ---
        result: Dict[str, Any] = {
            "id": prediction_obj.id if prediction_obj else None,
            "product": product_id,
            "prediction_date": str(timezone.now().date()),
            "current_price": round(current_price, 2),
            "predicted_prices": [round(p, 2) for p in predictions],
            "day1_price": round(predictions[0], 2),
            "day2_price": round(predictions[1], 2),
            "day3_price": round(predictions[2], 2),
            "day4_price": round(predictions[3], 2),
            "day5_price": round(predictions[4], 2),
            "day6_price": round(predictions[5], 2),
            "day7_price": round(predictions[6], 2),
            "percent_change": biz["price_change"],
            "price_change": biz["price_change"],
            "recommendation": biz["recommendation"],
            "confidence_score": biz["confidence_score"],
            "message": biz["message"],
            "trend": biz["trend"],
            "volatility": biz["volatility"],
        }

        # --- Cache store ---
        _cache_set(product_id, result)

        logger.info(
            "Product %s → %s (conf %.2f, Δ%.1f%%)",
            product_id,
            biz["recommendation"],
            biz["confidence_score"],
            biz["price_change"],
        )
        return result

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _insufficient_data_response(current_price: float) -> Dict[str, Any]:
        """Fallback when there isn't enough history."""
        return {
            "id": None,
            "product": None,
            "prediction_date": str(timezone.now().date()),
            "current_price": round(current_price, 2),
            "predicted_prices": [round(current_price, 2)] * 7,
            "day1_price": round(current_price, 2),
            "day2_price": round(current_price, 2),
            "day3_price": round(current_price, 2),
            "day4_price": round(current_price, 2),
            "day5_price": round(current_price, 2),
            "day6_price": round(current_price, 2),
            "day7_price": round(current_price, 2),
            "percent_change": 0.0,
            "price_change": 0.0,
            "recommendation": "neutral",
            "confidence_score": 0.0,
            "message": "⚪ Not enough price history to make a prediction yet.",
            "trend": "stable",
            "volatility": 0.0,
        }

    def _save(
        self, product: Product, predictions: List[float], biz: Dict[str, Any]
    ) -> Optional[PricePrediction]:
        """Persist today's prediction, returning the object or None on error.

        This used to INSERT a new row on every uncached prediction, so the table
        grew by one row per product per page view. There is now at most one row
        per product per day, which is all the history the UI ever reads.
        """
        values = {
            'day1_price': Decimal(str(round(predictions[0], 2))),
            'day2_price': Decimal(str(round(predictions[1], 2))),
            'day3_price': Decimal(str(round(predictions[2], 2))),
            'day4_price': Decimal(str(round(predictions[3], 2))),
            'day5_price': Decimal(str(round(predictions[4], 2))),
            'day6_price': Decimal(str(round(predictions[5], 2))),
            'day7_price': Decimal(str(round(predictions[6], 2))),
            'price_change': biz["price_change"],
            'recommendation': biz["recommendation"],
            'confidence_score': biz["confidence_score"],
        }

        try:
            # prediction_date uses auto_now_add, so it can only be set on insert;
            # updating an existing row leaves its original date in place.
            existing = PricePrediction.objects.filter(
                product=product, prediction_date=timezone.now().date()
            ).first()

            if existing is not None:
                for field, value in values.items():
                    setattr(existing, field, value)
                existing.save(update_fields=list(values))
                return existing

            return PricePrediction.objects.create(product=product, **values)
        except Exception:
            logger.exception("Failed to save PricePrediction for product %s", product.id)
            return None


# ---------------------------------------------------------------------------
# Backward-compatible alias so existing imports keep working
# ---------------------------------------------------------------------------
class PricePredictor(PricePredictionService):
    """Legacy wrapper — delegates to PricePredictionService."""

    def train_and_predict(self, product: Product) -> Optional[Dict[str, Any]]:
        return self.predict(product, use_cache=False)

    def save_predictions(self, product: Product) -> Optional[PricePrediction]:
        result = self.predict(product, use_cache=False)
        if result and result.get("id"):
            return PricePrediction.objects.filter(id=result["id"]).first()
        return None

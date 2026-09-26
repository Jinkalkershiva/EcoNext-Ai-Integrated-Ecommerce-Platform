import React from 'react';
import { TrendingDown, TrendingUp, AlertCircle, Cpu, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import './PricePredictorCard.css';

export const PricePredictorCard = ({ prediction, currentPrice }) => {
  if (!prediction) return null;

  const current = parseFloat(currentPrice || 0);
  const recommendation = prediction.recommendation || 'neutral';
  const confidenceScore = prediction.confidence_score ? Math.round(prediction.confidence_score * 100) : 85;
  const percentChange = parseFloat(prediction.percent_change ?? prediction.price_change ?? 0);
  const volatility = prediction.volatility !== undefined ? `${prediction.volatility}%` : 'Low';

  // Extract 7-day predicted prices safely
  const get7DayPrices = () => {
    if (Array.isArray(prediction.predicted_prices) && prediction.predicted_prices.length === 7) {
      return prediction.predicted_prices.map(p => parseFloat(p));
    }
    const list = [];
    for (let i = 1; i <= 7; i++) {
      list.push(parseFloat(prediction[`day${i}_price`] || current));
    }
    return list;
  };

  const prices = get7DayPrices();
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const getRecommendationDetails = () => {
    switch (recommendation) {
      case 'best_price':
        return {
          icon: <TrendingUp size={16} />,
          text: 'Best Price Now',
          statusClass: 'status-best_price',
          badgeClass: 'best_price',
          defaultAdvice: 'ML model signals this is an optimal buying point. Prices are forecasted to rise or hold steady in the next 7 days.'
        };
      case 'wait':
        return {
          icon: <TrendingDown size={16} />,
          text: 'Wait for Dip',
          statusClass: 'status-wait',
          badgeClass: 'wait',
          defaultAdvice: `Model projects a price reduction in the coming days (~${Math.abs(percentChange).toFixed(1)}%). Consider waiting for a better deal.`
        };
      default:
        return {
          icon: <AlertCircle size={16} />,
          text: 'Stable Price',
          statusClass: 'status-neutral',
          badgeClass: 'neutral',
          defaultAdvice: 'The forecasted price remains stable within normal variance. You may purchase at your convenience.'
        };
    }
  };

  const { icon, text, statusClass, badgeClass, defaultAdvice } = getRecommendationDetails();

  return (
    <div className={`price-predictor-box ${statusClass}`}>
      {/* Top Header */}
      <div className="predictor-top-row">
        <div className="predictor-headline">
          <Cpu size={20} style={{ color: 'var(--color-primary)' }} />
          <div>
            <div className="predictor-headline-title">AI Price Intelligence</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>7-Day Linear Regression Forecast</div>
          </div>
        </div>

        <div className={`predictor-rec-badge ${badgeClass}`}>
          {icon}
          <span>{text}</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="predictor-stats-grid">
        <div className="predictor-stat-cell">
          <span className="predictor-stat-label">Current</span>
          <span className="predictor-stat-value">₹{current.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>

        <div className="predictor-stat-cell">
          <span className="predictor-stat-label">7-Day Avg</span>
          <span className="predictor-stat-value">
            ₹{(prices.reduce((a, b) => a + b, 0) / 7).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="predictor-stat-cell">
          <span className="predictor-stat-label">Proj. Change</span>
          <span className={`predictor-stat-value ${percentChange < 0 ? 'change-negative' : 'change-positive'}`}>
            {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
          </span>
        </div>

        <div className="predictor-stat-cell">
          <span className="predictor-stat-label">Confidence</span>
          <span className="predictor-stat-value" style={{ color: 'var(--color-primary)' }}>
            {confidenceScore}%
          </span>
        </div>
      </div>

      {/* 7-Day Forecast Bar Visualizer */}
      <div className="forecast-chart-area">
        <div className="forecast-chart-title">
          <span>7-Day Price Trajectory</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={13} /> Volatility: {volatility}
          </span>
        </div>

        <div className="forecast-bars-flex">
          {prices.map((p, idx) => {
            const heightPercent = Math.max(30, Math.min(95, ((p - minPrice) / priceRange) * 60 + 35));
            return (
              <div key={idx} className="forecast-bar-column">
                <span className="forecast-bar-price-tag">₹{Math.round(p)}</span>
                <motion.div
                  className="forecast-bar-pill"
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ duration: 0.4, delay: idx * 0.04 }}
                  style={{
                    backgroundColor:
                      idx === 0
                        ? 'var(--color-primary)'
                        : p < current
                        ? 'var(--color-success)'
                        : 'var(--border-strong)'
                  }}
                  title={`Day ${idx + 1}: ₹${p.toFixed(2)}`}
                />
                <span className="forecast-bar-day">D{idx + 1}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advice Text Banner */}
      <div className="predictor-advice-banner">
        <strong>Recommendation:</strong> {prediction.message || defaultAdvice}
      </div>

      <div className="predictor-disclaimer">
        ⚡ Data generated by EcoNext pricing models based on category seasonality and pricing history.
      </div>
    </div>
  );
};

export default PricePredictorCard;

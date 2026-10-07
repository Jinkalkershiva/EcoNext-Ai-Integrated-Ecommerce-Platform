import React, { useState, useEffect } from 'react';
import './PriceRangeSlider.css';

export const PriceRangeSlider = ({
  min = 0,
  max = 5000,
  step = 50,
  valueMin = '',
  valueMax = '',
  onChange,
}) => {
  const [minVal, setMinVal] = useState(valueMin !== '' ? Number(valueMin) : min);
  const [maxVal, setMaxVal] = useState(valueMax !== '' ? Number(valueMax) : max);

  useEffect(() => {
    setMinVal(valueMin !== '' ? Number(valueMin) : min);
  }, [valueMin, min]);

  useEffect(() => {
    setMaxVal(valueMax !== '' ? Number(valueMax) : max);
  }, [valueMax, max]);

  const minPercent = Math.min(100, Math.max(0, ((minVal - min) / (max - min)) * 100));
  const maxPercent = Math.min(100, Math.max(0, ((maxVal - min) / (max - min)) * 100));

  const handleMinRangeChange = (e) => {
    const val = Math.min(Number(e.target.value), maxVal - step);
    setMinVal(val);
    if (onChange) {
      onChange({ price_min: val, price_max: maxVal });
    }
  };

  const handleMaxRangeChange = (e) => {
    const val = Math.max(Number(e.target.value), minVal + step);
    setMaxVal(val);
    if (onChange) {
      onChange({ price_min: minVal, price_max: val });
    }
  };

  const handleMinInputChange = (e) => {
    const val = e.target.value === '' ? '' : Number(e.target.value);
    if (val === '') {
      setMinVal(min);
      if (onChange) onChange({ price_min: '', price_max: maxVal });
      return;
    }
    const clamped = Math.min(Math.max(min, val), maxVal - step);
    setMinVal(clamped);
    if (onChange) onChange({ price_min: clamped, price_max: maxVal });
  };

  const handleMaxInputChange = (e) => {
    const val = e.target.value === '' ? '' : Number(e.target.value);
    if (val === '') {
      setMaxVal(max);
      if (onChange) onChange({ price_min: minVal, price_max: '' });
      return;
    }
    const clamped = Math.max(Math.min(max, val), minVal + step);
    setMaxVal(clamped);
    if (onChange) onChange({ price_min: minVal, price_max: clamped });
  };

  return (
    <div className="price-slider-container">
      {/* Visual Slider Bar with Dual Thumbs */}
      <div className="price-slider-track-wrap">
        <div className="price-slider-rail" />
        <div
          className="price-slider-fill"
          style={{
            left: `${minPercent}%`,
            width: `${Math.max(0, maxPercent - minPercent)}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minVal}
          onChange={handleMinRangeChange}
          className="price-slider-range-input"
          aria-label="Minimum price"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxVal}
          onChange={handleMaxRangeChange}
          className="price-slider-range-input"
          aria-label="Maximum price"
        />
      </div>

      {/* Numeric Number Input Fields */}
      <div className="price-slider-inputs">
        <div className="price-slider-field">
          <span className="price-slider-currency">₹</span>
          <input
            type="number"
            className="price-slider-num-input"
            value={minVal}
            min={min}
            max={max}
            onChange={handleMinInputChange}
            placeholder={`${min}`}
            aria-label="Minimum price value"
          />
        </div>
        <span className="price-slider-divider">to</span>
        <div className="price-slider-field">
          <span className="price-slider-currency">₹</span>
          <input
            type="number"
            className="price-slider-num-input"
            value={maxVal}
            min={min}
            max={max}
            onChange={handleMaxInputChange}
            placeholder={`${max}`}
            aria-label="Maximum price value"
          />
        </div>
      </div>
    </div>
  );
};

export default PriceRangeSlider;

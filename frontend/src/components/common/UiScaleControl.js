import React from 'react';
import { useUiScale } from '../../context/ThemeContext';
import './UiScaleControl.css';

export const UiScaleControl = ({ className = '' }) => {
  const { scalePercent, increaseScale, decreaseScale, resetScale, minScale, maxScale } = useUiScale();

  const isMin = scalePercent <= Math.round(minScale * 100);
  const isMax = scalePercent >= Math.round(maxScale * 100);
  const isDefault = scalePercent === 100;

  return (
    <div
      className={`ui-scale-control ${className}`}
      role="group"
      aria-label="UI Display Scaling Controls"
      aria-valuenow={scalePercent}
      aria-valuemin={Math.round(minScale * 100)}
      aria-valuemax={Math.round(maxScale * 100)}
      title={`Current UI Scale: ${scalePercent}% (Shortcuts: Ctrl + / Ctrl - / Ctrl 0)`}
    >
      {/* Decrease Scale Button: [ A− ] */}
      <button
        type="button"
        className="ui-scale-btn ui-scale-btn-decrease"
        onClick={decreaseScale}
        disabled={isMin}
        aria-label={`Decrease font and UI size (Current: ${scalePercent}%)`}
        title="Decrease UI scale by 5% (Ctrl + -)"
      >
        <span className="ui-scale-text">A−</span>
      </button>

      {/* Percentage Display & Click-to-Reset Button: 100% */}
      <button
        type="button"
        className={`ui-scale-label-btn ${isDefault ? 'is-default' : 'is-scaled'}`}
        onClick={resetScale}
        aria-label={`Current UI Scale: ${scalePercent}%. Click to reset to 100%`}
        title={isDefault ? 'UI Scale: 100% (Default)' : `Current: ${scalePercent}%. Click to reset to 100% (Ctrl + 0)`}
      >
        <span className="ui-scale-percent" aria-live="polite">
          {scalePercent}%
        </span>
      </button>

      {/* Increase Scale Button: [ A+ ] */}
      <button
        type="button"
        className="ui-scale-btn ui-scale-btn-increase"
        onClick={increaseScale}
        disabled={isMax}
        aria-label={`Increase font and UI size (Current: ${scalePercent}%)`}
        title="Increase UI scale by 5% (Ctrl + =)"
      >
        <span className="ui-scale-text">A+</span>
      </button>
    </div>
  );
};

export default UiScaleControl;

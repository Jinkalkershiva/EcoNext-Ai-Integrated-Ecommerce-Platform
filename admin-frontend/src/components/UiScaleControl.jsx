import React from 'react';
import { useUiScale } from '../context/ThemeContext';
import { RotateCcw } from 'lucide-react';

export const UiScaleControl = ({ className = '', size = 'sm' }) => {
  const { scalePercent, increaseScale, decreaseScale, resetScale, minScale, maxScale } = useUiScale();

  const isMin = scalePercent <= Math.round(minScale * 100);
  const isMax = scalePercent >= Math.round(maxScale * 100);
  const isDefault = scalePercent === 100;

  return (
    <div
      className={`ui-scale-control-group ${className}`}
      role="group"
      aria-label="UI Display Scaling Controls"
      title="Adjust Admin UI Scale (Keyboard: Ctrl + / Ctrl - / Ctrl 0)"
    >
      {/* Decrease Scale Button: [ A− ] */}
      <button
        type="button"
        className="ui-scale-btn ui-scale-btn-decrease"
        onClick={decreaseScale}
        disabled={isMin}
        aria-label="Decrease UI scale (Ctrl + -)"
        title="Decrease UI scale (Ctrl + -)"
      >
        <span className="ui-scale-symbol font-medium">A−</span>
      </button>

      {/* Current Scale Display */}
      <span
        className="ui-scale-label font-mono font-bold"
        aria-live="polite"
        title={`Current UI Scale: ${scalePercent}%`}
      >
        {scalePercent}%
      </span>

      {/* Increase Scale Button: [ A+ ] */}
      <button
        type="button"
        className="ui-scale-btn ui-scale-btn-increase"
        onClick={increaseScale}
        disabled={isMax}
        aria-label="Increase UI scale (Ctrl + =)"
        title="Increase UI scale (Ctrl + =)"
      >
        <span className="ui-scale-symbol font-medium">A+</span>
      </button>

      {/* Reset to 100% Button */}
      <button
        type="button"
        className={`ui-scale-btn ui-scale-btn-reset ${isDefault ? 'disabled' : ''}`}
        onClick={resetScale}
        disabled={isDefault}
        aria-label="Reset UI scale to 100% (Ctrl + 0)"
        title="Reset UI scale to 100% (Ctrl + 0)"
      >
        <RotateCcw size={13} className="ui-scale-reset-icon" />
      </button>
    </div>
  );
};

export default UiScaleControl;

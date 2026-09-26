import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const ThemeLampToggle = ({ className = '', size = 'md' }) => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTheme();
    }
  };

  return (
    <button
      type="button"
      className={`theme-lamp-btn ${isLight ? 'lamp-on' : 'lamp-off'} size-${size} ${className}`}
      onClick={toggleTheme}
      onKeyDown={handleKeyDown}
      aria-label={`Toggle theme: currently ${isLight ? 'Light Mode (Lamp On)' : 'Dark Mode (Lamp Off)'}`}
      title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
    >
      <div className="lamp-graphic">
        {/* Lamp Base & Stem */}
        <div className="lamp-mount"></div>
        <div className="lamp-cord"></div>
        
        {/* Lamp Shade */}
        <div className="lamp-shade">
          {/* Internal Bulb / Filament */}
          <div className="lamp-bulb"></div>
        </div>

        {/* Warm Light Beam / Glow Area (Light Mode) */}
        <div className="lamp-light-beam"></div>
      </div>

      <span className="lamp-label">
        {isLight ? 'Light Mode' : 'Dark Mode'}
      </span>
    </button>
  );
};

export default ThemeLampToggle;

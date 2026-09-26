import React from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme, THEMES } from '../../context/ThemeContext';
import { motion } from 'framer-motion';
import './ThemeToggle.css';

export const ThemeToggle = ({ className = '' }) => {
  const { theme, setTheme } = useTheme();

  const options = [
    { id: THEMES.LIGHT, label: 'Light', icon: <Sun size={14} strokeWidth={2.2} /> },
    { id: THEMES.DARK, label: 'Dark', icon: <Moon size={14} strokeWidth={2.2} /> },
    { id: THEMES.WARM, label: 'Warm', icon: <Sparkles size={14} strokeWidth={2.2} /> },
  ];

  return (
    <div
      className={`theme-toggle-group ${className}`}
      role="radiogroup"
      aria-label="Color theme switcher"
    >
      {options.map((opt) => {
        const isActive = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`theme-toggle-btn ${isActive ? `active theme-${opt.id}` : ''}`}
            onClick={() => setTheme(opt.id)}
            title={`Switch to ${opt.label} mode`}
          >
            {opt.icon}
            <span className="theme-toggle-label">{opt.label}</span>
            {isActive && (
              <motion.div
                layoutId="theme-active-indicator"
                className="theme-active-indicator"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'var(--radius-full)',
                  zIndex: -1,
                }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;

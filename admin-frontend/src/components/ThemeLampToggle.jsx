import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, SunMedium } from 'lucide-react';

export const ThemeLampToggle = ({ className = '', size = 'md' }) => {
  const { theme, toggleTheme } = useTheme();

  const getThemeInfo = () => {
    switch (theme) {
      case 'dark':
        return { icon: Moon, label: 'Dark Mode', color: '#818cf8', next: 'Warm Mode' };
      case 'warm':
        return { icon: SunMedium, label: 'Warm Mode', color: '#f59e0b', next: 'Light Mode' };
      case 'colorful':
      default:
        return { icon: Sun, label: 'Light Mode', color: '#10b981', next: 'Dark Mode' };
    }
  };

  const current = getThemeInfo();
  const Icon = current.icon;

  return (
    <button
      type="button"
      className={`theme-lamp-btn theme-mode-${theme} size-${size} ${className}`}
      onClick={toggleTheme}
      aria-label={`Current theme: ${current.label}. Click to switch to ${current.next}`}
      title={`Current: ${current.label} • Click to switch to ${current.next}`}
    >
      <div className="theme-toggle-icon-wrap" style={{ color: current.color }}>
        <Icon size={16} />
      </div>
      <span className="lamp-label">{current.label}</span>
    </button>
  );
};

export default ThemeLampToggle;

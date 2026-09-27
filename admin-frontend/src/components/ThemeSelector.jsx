import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Palette, Moon, Flame, Sun, ChevronDown, Check } from 'lucide-react';

export const ThemeSelector = ({ className = '', size = 'md' }) => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const themeOptions = [
    {
      id: 'colorful',
      label: 'Light / Colorful',
      desc: 'Vibrant modern enterprise theme',
      icon: Palette,
      accentColor: '#10b981',
      badge: 'Colorful'
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      desc: 'Deep graphite & obsidian contrast',
      icon: Moon,
      accentColor: '#6366f1',
      badge: 'Dark'
    },
    {
      id: 'warm',
      label: 'Warm Mode',
      desc: 'Warm beige, amber & terracotta',
      icon: Flame,
      accentColor: '#d97706',
      badge: 'Warm'
    }
  ];

  const currentOption = themeOptions.find(t => t.id === theme) || themeOptions[0];
  const CurrentIcon = currentOption.icon;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`theme-selector-wrapper ${className}`} ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="theme-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`Theme: ${currentOption.label}`}
        title="Switch Admin Theme"
      >
        <div className="theme-icon-indicator" style={{ color: currentOption.accentColor }}>
          <CurrentIcon size={16} />
        </div>
        <span className="theme-current-label">{currentOption.label}</span>
        <ChevronDown size={14} className={`theme-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="theme-dropdown-menu">
          <div className="theme-dropdown-header">
            <span>Admin Theme Palette</span>
          </div>

          <div className="theme-options-list">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = opt.id === theme;

              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`theme-option-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                >
                  <div
                    className="theme-option-icon"
                    style={{
                      backgroundColor: `${opt.accentColor}18`,
                      color: opt.accentColor
                    }}
                  >
                    <Icon size={16} />
                  </div>

                  <div className="theme-option-info">
                    <div className="theme-option-title">
                      <span>{opt.label}</span>
                      {isSelected && <Check size={14} className="theme-check-icon" />}
                    </div>
                    <span className="theme-option-desc">{opt.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;

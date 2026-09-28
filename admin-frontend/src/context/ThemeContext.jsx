import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export const THEMES = {
  COLORFUL: 'colorful', // Light / Colorful Mode
  DARK: 'dark',         // Dark Mode
  WARM: 'warm',         // Warm Mode
};

const MIN_SCALE = 0.90;
const MAX_SCALE = 1.25;
const SCALE_STEP = 0.05;
const DEFAULT_SCALE = 1.0;

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('econext_admin_theme');
    if (saved === 'light') return 'colorful';
    if (saved && (saved === 'colorful' || saved === 'dark' || saved === 'warm')) {
      return saved;
    }
    return 'colorful'; // Default to modern colorful professional mode
  });

  const [uiScale, setUiScaleState] = useState(() => {
    const savedScale = localStorage.getItem('econext_admin_ui_scale');
    if (savedScale) {
      const parsed = parseFloat(savedScale);
      if (!isNaN(parsed) && parsed >= MIN_SCALE && parsed <= MAX_SCALE) {
        return Math.round(parsed * 100) / 100;
      }
    }
    return DEFAULT_SCALE;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('econext_admin_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', String(uiScale));
    document.documentElement.setAttribute('data-ui-scale', `${Math.round(uiScale * 100)}%`);
    localStorage.setItem('econext_admin_ui_scale', String(uiScale));
  }, [uiScale]);

  const setTheme = (newTheme) => {
    if (newTheme === 'light') newTheme = 'colorful';
    if (newTheme === 'colorful' || newTheme === 'dark' || newTheme === 'warm') {
      setThemeState(newTheme);
    }
  };

  const toggleTheme = () => {
    setThemeState(prev => {
      if (prev === 'colorful') return 'dark';
      if (prev === 'dark') return 'warm';
      return 'colorful';
    });
  };

  const setUiScale = useCallback((scale) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(scale * 100) / 100));
    setUiScaleState(clamped);
  }, []);

  const increaseScale = useCallback(() => {
    setUiScaleState(prev => {
      const next = Math.min(MAX_SCALE, Math.round((prev + SCALE_STEP) * 100) / 100);
      return next;
    });
  }, []);

  const decreaseScale = useCallback(() => {
    setUiScaleState(prev => {
      const next = Math.max(MIN_SCALE, Math.round((prev - SCALE_STEP) * 100) / 100);
      return next;
    });
  }, []);

  const resetScale = useCallback(() => {
    setUiScaleState(DEFAULT_SCALE);
  }, []);

  // Global Keyboard Shortcuts (Ctrl + =, Ctrl + -, Ctrl + 0)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Ctrl or Cmd key
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          increaseScale();
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          decreaseScale();
        } else if (e.key === '0') {
          e.preventDefault();
          resetScale();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [increaseScale, decreaseScale, resetScale]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        THEMES,
        uiScale,
        setUiScale,
        increaseScale,
        decreaseScale,
        resetScale,
        minScale: MIN_SCALE,
        maxScale: MAX_SCALE,
        scalePercent: Math.round(uiScale * 100)
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

export const useUiScale = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useUiScale must be used within a ThemeProvider');
  return {
    uiScale: context.uiScale,
    setUiScale: context.setUiScale,
    increaseScale: context.increaseScale,
    decreaseScale: context.decreaseScale,
    resetScale: context.resetScale,
    minScale: context.minScale,
    maxScale: context.maxScale,
    scalePercent: context.scalePercent
  };
};

export default ThemeContext;

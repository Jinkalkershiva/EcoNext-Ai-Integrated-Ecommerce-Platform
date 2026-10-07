import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  WARM: 'warm',
};

const MIN_SCALE = 0.90;
const MAX_SCALE = 1.25;
const SCALE_STEP = 0.05;
const DEFAULT_SCALE = 1.0;

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('econext_theme');
      if (
        savedTheme === THEMES.DARK ||
        savedTheme === THEMES.LIGHT ||
        savedTheme === THEMES.WARM
      ) {
        return savedTheme;
      }
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? THEMES.DARK
        : THEMES.LIGHT;
    } catch {
      return THEMES.LIGHT;
    }
  });

  const [uiScale, setUiScaleState] = useState(() => {
    try {
      const savedScale = localStorage.getItem('econext_ui_scale');
      if (savedScale) {
        const parsed = parseFloat(savedScale);
        if (!isNaN(parsed) && parsed >= MIN_SCALE && parsed <= MAX_SCALE) {
          return Math.round(parsed * 100) / 100;
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return DEFAULT_SCALE;
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('econext_theme', theme);
    } catch (e) {
      console.warn('Failed to save theme setting', e);
    }
  }, [theme]);

  useEffect(() => {
    try {
      document.documentElement.style.setProperty('--ui-scale', String(uiScale));
      document.documentElement.setAttribute('data-ui-scale', `${Math.round(uiScale * 100)}%`);
      localStorage.setItem('econext_ui_scale', String(uiScale));
    } catch (e) {
      console.warn('Failed to save UI scale setting', e);
    }
  }, [uiScale]);

  const setTheme = (newTheme) => {
    if (newTheme === THEMES.LIGHT || newTheme === THEMES.DARK || newTheme === THEMES.WARM) {
      setThemeState(newTheme);
    }
  };

  // 3-way cyclic toggle: light -> dark -> warm -> light
  const cycleTheme = () => {
    setThemeState((prev) => {
      if (prev === THEMES.LIGHT) return THEMES.DARK;
      if (prev === THEMES.DARK) return THEMES.WARM;
      return THEMES.LIGHT;
    });
  };

  const toggleTheme = cycleTheme;

  const setUiScale = useCallback((scale) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(scale * 100) / 100));
    setUiScaleState(clamped);
  }, []);

  const increaseScale = useCallback(() => {
    setUiScaleState((prev) => {
      const next = Math.min(MAX_SCALE, Math.round((prev + SCALE_STEP) * 100) / 100);
      return next;
    });
  }, []);

  const decreaseScale = useCallback(() => {
    setUiScaleState((prev) => {
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

  const value = {
    theme,
    setTheme,
    cycleTheme,
    toggleTheme,
    isDark: theme === THEMES.DARK,
    isWarm: theme === THEMES.WARM,
    isLight: theme === THEMES.LIGHT,
    THEMES,
    uiScale,
    setUiScale,
    increaseScale,
    decreaseScale,
    resetScale,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    scalePercent: Math.round(uiScale * 100),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const useUiScale = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useUiScale must be used within a ThemeProvider');
  }
  return {
    uiScale: context.uiScale,
    setUiScale: context.setUiScale,
    increaseScale: context.increaseScale,
    decreaseScale: context.decreaseScale,
    resetScale: context.resetScale,
    minScale: context.minScale,
    maxScale: context.maxScale,
    scalePercent: context.scalePercent,
  };
};

export default ThemeContext;

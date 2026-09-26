import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  WARM: 'warm',
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
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

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('econext_theme', theme);
    } catch (e) {
      console.warn('Failed to save theme setting', e);
    }
  }, [theme]);

  // 3-way cyclic toggle: light -> dark -> warm -> light
  const cycleTheme = () => {
    setTheme((prev) => {
      if (prev === THEMES.LIGHT) return THEMES.DARK;
      if (prev === THEMES.DARK) return THEMES.WARM;
      return THEMES.LIGHT;
    });
  };

  // Backward-compatible toggleTheme
  const toggleTheme = cycleTheme;

  const value = {
    theme,
    setTheme,
    cycleTheme,
    toggleTheme,
    isDark: theme === THEMES.DARK,
    isWarm: theme === THEMES.WARM,
    isLight: theme === THEMES.LIGHT,
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

export default ThemeContext;

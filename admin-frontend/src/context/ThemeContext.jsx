import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const THEMES = {
  COLORFUL: 'colorful', // Light / Colorful Mode
  DARK: 'dark',         // Dark Mode
  WARM: 'warm',         // Warm Mode
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('econext_admin_theme');
    if (saved === 'light') return 'colorful';
    if (saved && (saved === 'colorful' || saved === 'dark' || saved === 'warm')) {
      return saved;
    }
    return 'colorful'; // Default to modern colorful professional mode
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('econext_admin_theme', theme);
  }, [theme]);

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

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

export default ThemeContext;

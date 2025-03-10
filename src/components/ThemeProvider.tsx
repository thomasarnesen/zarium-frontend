// src/components/ThemeProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';

// Opprett en kontekst for temaet
export const ThemeContext = createContext({ 
  isDark: false, 
  toggleTheme: () => {} 
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { isDark, toggleTheme } = useThemeStore();
  
  // Bruk effekten for å oppdatere DOM når temaet endres
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);
  
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
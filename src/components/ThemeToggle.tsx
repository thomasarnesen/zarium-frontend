import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-yellow-500" />
      ) : (
        <Moon className="h-5 w-5 text-blue-700" />
      )}
    </button>
  );
}

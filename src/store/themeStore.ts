import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

// Check system preference initially
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: prefersDark,
      toggleTheme: () => {
        set((state) => {
          const newIsDark = !state.isDark;
          
          // Apply or remove dark class on the document
          if (newIsDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          
          return { isDark: newIsDark };
        });
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: (state) => {
        // When the store is rehydrated, make sure the UI reflects the stored state
        return (rehydratedState, error) => {
          if (!error && rehydratedState) {
            if (rehydratedState.isDark) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        };
      }
    }
  )
);
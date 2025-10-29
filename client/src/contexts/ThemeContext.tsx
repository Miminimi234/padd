import { applyTheme, getStoredTheme, Theme } from '@/lib/themes';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize current theme from storage (falls back to 'graphite')
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    // Apply the current theme whenever it changes (or on mount)
    applyTheme(currentTheme);
  }, [currentTheme]);

  const setTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    applyTheme(theme);
  };

  // Make 'graphite' the default/first option
  const availableThemes: Theme[] = ['graphite', 'ocean', 'forest'];

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

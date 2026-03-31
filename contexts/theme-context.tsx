import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@sowa/theme-mode';

type ThemeMode = 'system' | 'light' | 'dark';
type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  themeMode: ThemeMode;
  effectiveColorScheme: ColorScheme;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'system',
  effectiveColorScheme: 'light',
  setThemeMode: () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeModeState(stored);
      }
      setIsLoaded(true);
    }).catch(() => {
      setIsLoaded(true);
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  }, []);

  const effectiveColorScheme: ColorScheme =
    themeMode === 'system' ? (systemScheme ?? 'light') : themeMode;

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ themeMode, effectiveColorScheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

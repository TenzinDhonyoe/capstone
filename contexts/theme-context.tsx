import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@sowa/theme-mode';

type ThemeMode = 'system' | 'light' | 'dark';
type ColorScheme = 'light' | 'dark';

interface ThemeState {
  themeMode: ThemeMode;
  isLoaded: boolean;
}

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
  const [state, setState] = useState<ThemeState>({
    themeMode: 'system',
    isLoaded: false,
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setState({ themeMode: stored, isLoaded: true });
      } else {
        setState((prev) => ({ ...prev, isLoaded: true }));
      }
    }).catch(() => {
      setState((prev) => ({ ...prev, isLoaded: true }));
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setState((prev) => ({ ...prev, themeMode: mode }));
    try {
      AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  }, []);

  const effectiveColorScheme: ColorScheme =
    state.themeMode === 'system' ? (systemScheme ?? 'light') : state.themeMode;

  if (!state.isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ themeMode: state.themeMode, effectiveColorScheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

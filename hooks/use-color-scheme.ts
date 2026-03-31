import { useAppTheme } from '@/contexts/theme-context';

export function useColorScheme() {
  const { effectiveColorScheme } = useAppTheme();
  return effectiveColorScheme;
}

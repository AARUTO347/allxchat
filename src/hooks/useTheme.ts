import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

export function useTheme(): void {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
      const meta = document.querySelector('meta[name="theme-color"]');
      meta?.setAttribute('content', dark ? '#0b141a' : '#00a884');
    };

    apply();
    if (theme === 'system') {
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }
    return undefined;
  }, [theme]);
}

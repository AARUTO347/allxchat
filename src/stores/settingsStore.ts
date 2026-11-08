import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: ThemeMode;
  sounds: boolean;
  notifications: boolean;
  setTheme: (theme: ThemeMode) => void;
  setSounds: (enabled: boolean) => void;
  setNotifications: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      sounds: true,
      notifications: false,
      setTheme: (theme) => set({ theme }),
      setSounds: (sounds) => set({ sounds }),
      setNotifications: (notifications) => set({ notifications }),
    }),
    {
      name: 'allxchat-settings',
      partialize: (state) => ({
        theme: state.theme,
        sounds: state.sounds,
        notifications: state.notifications,
      }),
    },
  ),
);

// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const key of Object.keys(store)) delete store[key];
  },
  key: (index: number) => Object.keys(store)[index] ?? null,
  get length() {
    return Object.keys(store).length;
  },
});

const { useSettingsStore } = await import('./settingsStore');

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({ theme: 'system', sounds: true, notifications: false });
});

describe('useSettingsStore', () => {
  it('has sensible defaults', () => {
    expect(useSettingsStore.getState().theme).toBe('system');
    expect(useSettingsStore.getState().sounds).toBe(true);
    expect(useSettingsStore.getState().notifications).toBe(false);
  });

  it('updates theme and persists it', () => {
    useSettingsStore.getState().setTheme('dark');
    expect(useSettingsStore.getState().theme).toBe('dark');
    const raw = localStorage.getItem('allxchat-settings');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string)).toMatchObject({ state: { theme: 'dark' } });
  });

  it('toggles sounds and notifications', () => {
    useSettingsStore.getState().setSounds(false);
    useSettingsStore.getState().setNotifications(true);
    expect(useSettingsStore.getState().sounds).toBe(false);
    expect(useSettingsStore.getState().notifications).toBe(true);
  });

  it('does not persist action functions', () => {
    useSettingsStore.getState().setTheme('light');
    const persisted = JSON.parse(localStorage.getItem('allxchat-settings') as string);
    expect(persisted.state).toEqual({ theme: 'light', sounds: true, notifications: false });
  });
});

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  Camera,
  Check,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Save,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '../ui/Avatar';
import { Drawer, Spinner } from '../ui/Primitives';
import { getErrorMessage } from '../../lib/errors';
import { notificationPermission, requestNotificationPermission, subscribePush, unsubscribePush } from '../../lib/notifications';
import { playIncomingSound } from '../../lib/sounds';
import { uploadAvatar } from '../../lib/storage';
import {
  MAX_ABOUT,
  validateAbout,
} from '../../lib/validation';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore, type ThemeMode } from '../../stores/settingsStore';
import { cn } from '../../lib/utils';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-brand-600' : 'bg-[#c5cdd1] dark:bg-[#3b4a54]',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

const THEMES: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const session = useAuthStore((state) => state.session);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const signOut = useAuthStore((state) => state.signOut);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const sounds = useSettingsStore((state) => state.sounds);
  const setSounds = useSettingsStore((state) => state.setSounds);
  const notifications = useSettingsStore((state) => state.notifications);
  const setNotifications = useSettingsStore((state) => state.setNotifications);

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [about, setAbout] = useState(profile?.about || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState(notificationPermission());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !profile) return;
    setDisplayName(profile.display_name);
    setUsername(profile.username);
    setAbout(profile.about || '');
    setError(null);
    setConfirmSignOut(false);
    setPermission(notificationPermission());
  }, [open, profile]);

  const save = async () => {
    setError(null);
    const aboutError = validateAbout(about);
    if (aboutError) {
      setError(aboutError);
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName,
        username,
        about,
      });
      toast.success('Profile updated.');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to update your profile.'));
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async (file: File) => {
    if (!profile) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(file, profile.id);
      await updateProfile({ avatar_url: url });
      toast.success('Profile photo updated.');
    } catch (uploadError) {
      toast.error(getErrorMessage(uploadError, 'Unable to update your photo.'));
    } finally {
      setUploading(false);
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (!profile) return;
    if (!enabled) {
      setNotifications(false);
      void unsubscribePush(profile.id);
      return;
    }
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      setNotifications(true);
      const subscribed = await subscribePush(profile.id);
      toast.success(
        subscribed
          ? 'Push notifications enabled. You will be notified even when ALLXCHAT is closed.'
          : 'Browser notifications enabled.',
      );
    } else if (result === 'denied') {
      setNotifications(false);
      toast.error('Notifications are blocked in your browser settings.');
    } else {
      setNotifications(false);
      toast.error('Notifications are not supported in this browser.');
    }
  };

  const handleSounds = (enabled: boolean) => {
    setSounds(enabled);
    if (enabled) playIncomingSound();
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      onClose();
      navigate('/login', { replace: true });
    } catch (signOutError) {
      toast.error(getErrorMessage(signOutError, 'Unable to sign out.'));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Settings"
      footer={
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !profile}
          className="btn-primary w-full"
        >
          {saving ? <Spinner size={16} /> : <Save size={16} />}
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      }
    >
      <div className="p-5">
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar
              name={profile?.display_name}
              src={profile?.avatar_url}
              id={profile?.id}
              size={104}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60 dark:border-[#111b21]"
              aria-label="Change profile photo"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void changeAvatar(file);
                event.target.value = '';
              }}
            />
          </div>
          <p className="mt-3 text-xs text-[#8696a0]">{session?.email}</p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="settingsDisplayName" className="field-label">
              Display name
            </label>
            <input
              id="settingsDisplayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="field"
              maxLength={60}
              disabled={saving}
            />
          </div>
          <div>
            <label htmlFor="settingsUsername" className="field-label">
              Username
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#8696a0]">
                @
              </span>
              <input
                id="settingsUsername"
                value={username}
                onChange={(event) => setUsername(event.target.value.replace(/\s+/g, '').toLowerCase())}
                className="field pl-8"
                maxLength={30}
                disabled={saving}
              />
            </div>
          </div>
          <div>
            <label htmlFor="settingsAbout" className="field-label">
              About
            </label>
            <textarea
              id="settingsAbout"
              value={about}
              onChange={(event) => setAbout(event.target.value)}
              className="field min-h-[76px] resize-none"
              maxLength={MAX_ABOUT}
              disabled={saving}
              placeholder="Hey there! I am using ALLXCHAT."
            />
            <p className="mt-1 text-right text-[10px] text-[#8696a0]">
              {about.length}/{MAX_ABOUT}
            </p>
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="my-6 h-px bg-black/[0.06] dark:bg-white/[0.08]" />

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
            Appearance
          </h3>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {THEMES.map((item) => {
              const Icon = item.icon;
              const active = theme === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTheme(item.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition',
                    active
                      ? 'border-brand-600 bg-brand-50 text-brand-800 dark:border-brand-500/50 dark:bg-brand-500/10 dark:text-brand-300'
                      : 'border-black/[0.08] text-[#667781] hover:bg-black/[0.03] dark:border-white/[0.1] dark:text-[#8696a0] dark:hover:bg-white/[0.04]',
                  )}
                >
                  <Icon size={17} />
                  {item.label}
                  {active && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </section>

        <div className="my-6 h-px bg-black/[0.06] dark:bg-white/[0.08]" />

        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
            Notifications &amp; sounds
          </h3>

          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.04] text-[#54656f] dark:bg-white/[0.06] dark:text-[#aebac1]">
                {notifications ? <Bell size={16} /> : <BellOff size={16} />}
              </span>
              <div>
                <p className="text-sm font-medium text-[#111b21] dark:text-[#e9edef]">
                  Browser notifications
                </p>
                <p className="mt-0.5 text-[11px] leading-5 text-[#667781] dark:text-[#8696a0]">
                  Alert me when a message arrives while ALLXCHAT is in another tab or minimized.
                </p>
                {permission === 'denied' && (
                  <p className="mt-1 text-[10px] text-red-500">
                    Blocked in browser settings. Allow notifications for this site to enable.
                  </p>
                )}
                {permission === 'unsupported' && (
                  <p className="mt-1 text-[10px] text-[#8696a0]">
                    Not supported in this browser.
                  </p>
                )}
              </div>
            </div>
            <Switch
              checked={notifications}
              onChange={(enabled) => void toggleNotifications(enabled)}
              label="Browser notifications"
              disabled={permission === 'unsupported'}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.04] text-[#54656f] dark:bg-white/[0.06] dark:text-[#aebac1]">
                {sounds ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </span>
              <div>
                <p className="text-sm font-medium text-[#111b21] dark:text-[#e9edef]">
                  Message sounds
                </p>
                <p className="mt-0.5 text-[11px] leading-5 text-[#667781] dark:text-[#8696a0]">
                  Soft chimes for incoming and outgoing messages.
                </p>
              </div>
            </div>
            <Switch checked={sounds} onChange={handleSounds} label="Message sounds" />
          </div>
        </section>

        <div className="my-6 h-px bg-black/[0.06] dark:bg-white/[0.08]" />

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
            Account
          </h3>
          {confirmSignOut ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/20 dark:bg-red-500/10">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Sign out of ALLXCHAT?
              </p>
              <p className="mt-1 text-[11px] leading-5 text-red-600/80 dark:text-red-300/70">
                Your local session and realtime subscriptions will be cleared.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmSignOut(false)}
                  className="btn-secondary flex-1 py-2 text-xs"
                  disabled={signingOut}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="btn-danger flex-1 py-2 text-xs"
                  disabled={signingOut}
                >
                  {signingOut ? <Spinner size={13} /> : <LogOut size={13} />}
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-black/[0.08] py-2.5 text-sm font-semibold text-[#54656f] transition hover:bg-black/[0.03] dark:border-white/[0.1] dark:text-[#aebac1] dark:hover:bg-white/[0.04]"
            >
              <LogOut size={16} />
              Sign out
            </button>
          )}
        </section>

        <p className="mt-6 text-center text-[10px] tracking-wide text-[#8696a0]">
          ALLXCHAT · Secure messaging
        </p>
      </div>
    </Drawer>
  );
}

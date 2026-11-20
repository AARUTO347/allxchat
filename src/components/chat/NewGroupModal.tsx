import { useEffect, useState } from 'react';
import { Search, UsersRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '../ui/Avatar';
import { EmptyState, Modal, Spinner } from '../ui/Primitives';
import { createGroupConversation, searchProfiles } from '../../lib/chatApi';
import { useChatStore } from '../../stores/chatStore';
import { MAX_GROUP_TITLE } from '../../lib/validation';
import { cn } from '../../lib/utils';
import type { Profile } from '../../types/chat';

interface NewGroupModalProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onCreated: (conversationId: string) => void;
}

function GroupCandidate({
  user,
  selected,
  onToggle,
}: {
  user: Profile;
  selected: boolean;
  onToggle: () => void;
}) {
  const presence = useChatStore((state) => state.presence[user.id]);
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]"
      aria-pressed={selected}
    >
      <Avatar
        name={user.display_name}
        src={user.avatar_url}
        id={user.id}
        size={44}
        online={Boolean(presence)}
        showOnline
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
          {user.display_name}
        </span>
        <span className="block truncate text-xs text-[#667781] dark:text-[#8696a0]">
          @{user.username}
        </span>
      </span>
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
          selected
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-[#c5cdd1] dark:border-[#667781]',
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
    </button>
  );
}

export function NewGroupModal({ open, onClose, profile, onCreated }: NewGroupModalProps) {
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setQuery('');
    setSelected([]);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void searchProfiles(query, profile.id)
        .then((results) => {
          if (active) setUsers(results);
        })
        .catch(() => {
          if (active) toast.error('Unable to load contacts.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, query ? 250 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query, profile.id]);

  const toggle = (user: Profile) => {
    setSelected((current) => {
      if (current.some((item) => item.id === user.id)) {
        return current.filter((item) => item.id !== user.id);
      }
      if (current.length >= 499) {
        toast.error('Groups can include up to 500 people, including you.');
        return current;
      }
      return [...current, user];
    });
  };

  const create = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Give your group a name.');
      return;
    }
    if (cleanTitle.length > MAX_GROUP_TITLE) {
      setError(`Group names cannot exceed ${MAX_GROUP_TITLE} characters.`);
      return;
    }
    if (selected.length === 0) {
      setError('Select at least one person to join you.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const conversationId = await createGroupConversation(
        cleanTitle,
        selected.map((user) => user.id),
      );
      onCreated(conversationId);
      onClose();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create the group.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New group"
      description={`You will be added automatically. ${selected.length} selected.`}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={creating}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void create()}
            className="btn-primary"
            disabled={creating || selected.length === 0 || !title.trim()}
          >
            {creating ? <Spinner size={16} /> : <UsersRound size={16} />}
            {creating ? 'Creating…' : 'Create group'}
          </button>
        </div>
      }
    >
      <div className="p-3 sm:p-4">
        <label htmlFor="groupTitle" className="field-label">
          Group name
        </label>
        <input
          id="groupTitle"
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Weekend crew, project team…"
          maxLength={MAX_GROUP_TITLE}
          className="field"
          disabled={creating}
        />

        {selected.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {selected.map((user) => (
              <span
                key={user.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-1 pr-2 text-xs font-medium text-brand-800 dark:bg-brand-500/10 dark:text-brand-300"
              >
                <Avatar name={user.display_name} src={user.avatar_url} id={user.id} size={22} />
                {user.display_name}
                <button
                  type="button"
                  onClick={() => toggle(user)}
                  className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-brand-600/15"
                  aria-label={`Remove ${user.display_name}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative mt-4">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people to add"
            className="field pl-10"
            aria-label="Search people to add"
            disabled={creating}
          />
        </div>

        <div className="mt-3 max-h-[40vh] overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#667781] dark:text-[#8696a0]">
              <Spinner size={17} />
              Finding people…
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={<UsersRound size={24} />}
              title={query ? 'No people found' : 'No contacts yet'}
              description={
                query
                  ? 'Try a different name or username.'
                  : 'Invite people to ALLXCHAT before adding them to a group.'
              }
            />
          ) : (
            <div className="space-y-0.5">
              {users.map((user) => (
                <GroupCandidate
                  key={user.id}
                  user={user}
                  selected={selected.some((item) => item.id === user.id)}
                  onToggle={() => toggle(user)}
                />
              ))}
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

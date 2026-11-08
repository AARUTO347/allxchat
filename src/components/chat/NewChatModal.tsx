import { useEffect, useState } from 'react';
import { MessageSquarePlus, Search, UserRoundPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '../ui/Avatar';
import { EmptyState, Modal, Spinner } from '../ui/Primitives';
import { createDirectConversation, searchProfiles } from '../../lib/chatApi';
import { useChatStore } from '../../stores/chatStore';
import { cn } from '../../lib/utils';
import type { Profile } from '../../types/chat';

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onCreated: (conversationId: string) => void;
}

function ProfileRow({
  user,
  selected,
  disabled,
  onSelect,
}: {
  user: Profile;
  selected?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const presence = useChatStore((state) => state.presence[user.id]);
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-[#f5f6f6] disabled:opacity-50 dark:hover:bg-[#202c33]"
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
          {user.about ? ` · ${user.about}` : ''}
        </span>
      </span>
      {selected !== undefined && (
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
      )}
    </button>
  );
}

export function NewChatModal({ open, onClose, profile, onCreated }: NewChatModalProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
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

  const startChat = async (user: Profile) => {
    setCreatingId(user.id);
    try {
      const conversationId = await createDirectConversation(user.id);
      onCreated(conversationId);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start this chat.');
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New chat"
      description="Find someone by name or username."
      size="lg"
    >
      <div className="p-3 sm:p-4">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]"
          />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people"
            className="field pl-10"
            aria-label="Search people"
          />
        </div>

        <div className="mt-3 max-h-[52vh] overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#667781] dark:text-[#8696a0]">
              <Spinner size={17} />
              Finding people…
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={<UserRoundPlus size={24} />}
              title={query ? 'No people found' : 'No other accounts yet'}
              description={
                query
                  ? 'Try a different name or username.'
                  : 'Invite someone to ALLXCHAT, then start a conversation.'
              }
            />
          ) : (
            <div className="space-y-0.5">
              {users.map((user) => (
                <div key={user.id} className="relative">
                  {creatingId === user.id && (
                    <span className="absolute right-3 top-1/2 z-10 -translate-y-1/2">
                      <Spinner size={16} className="text-brand-600" />
                    </span>
                  )}
                  <ProfileRow
                    user={user}
                    disabled={Boolean(creatingId)}
                    onSelect={() => void startChat(user)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#f7f8fa] px-3 py-2.5 text-[11px] leading-5 text-[#667781] dark:bg-[#0b141a] dark:text-[#8696a0]">
          <MessageSquarePlus size={14} className="mt-0.5 shrink-0" />
          If a private chat already exists, you will be taken straight to it.
        </div>
      </div>
    </Modal>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Check,
  Crown,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '../ui/Avatar';
import { Drawer, IconButton, Spinner } from '../ui/Primitives';
import {
  addGroupMembers,
  fetchConversationMembers,
  leaveGroup,
  removeGroupMember,
  searchProfiles,
  updateGroup,
} from '../../lib/chatApi';
import { uploadAvatar } from '../../lib/storage';
import { formatLastSeen } from '../../lib/time';
import { useChatStore } from '../../stores/chatStore';
import { cn } from '../../lib/utils';
import type { Conversation, ConversationMember, Profile } from '../../types/chat';

interface GroupInfoDrawerProps {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
  profile: Profile;
  refreshConversations: (options?: { silent?: boolean }) => Promise<void>;
  onLeft: () => void;
}

export function GroupInfoDrawer({
  open,
  onClose,
  conversation,
  profile,
  refreshConversations,
  onLeft,
}: GroupInfoDrawerProps) {
  const navigate = useNavigate();
  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title || '');
  const [savingTitle, setSavingTitle] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addResults, setAddResults] = useState<Profile[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [addSelected, setAddSelected] = useState<Profile[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const presence = useChatStore((state) => state.presence);

  const currentMember = members.find((member) => member.user_id === profile.id);
  const isAdmin = currentMember?.role === 'admin';

  useEffect(() => {
    if (!open) return;
    setTitle(conversation.title || '');
    setEditing(false);
    setConfirmLeave(false);
    setAddOpen(false);
    setAddSelected([]);
    setAddQuery('');
  }, [open, conversation.id, conversation.title]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const result = await fetchConversationMembers(conversation.id);
      setMembers(result);
    } catch {
      toast.error('Unable to load group members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversation.id]);

  useEffect(() => {
    if (!open || !addOpen) return;
    let active = true;
    setAddLoading(true);
    const timer = window.setTimeout(() => {
      void searchProfiles(addQuery, profile.id)
        .then((results) => {
          if (!active) return;
          const existingIds = new Set(members.map((member) => member.user_id));
          setAddResults(results.filter((user) => !existingIds.has(user.id)));
        })
        .catch(() => {
          if (active) toast.error('Unable to search for people.');
        })
        .finally(() => {
          if (active) setAddLoading(false);
        });
    }, addQuery ? 250 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, addOpen, addQuery, profile.id, members]);

  const saveTitle = async () => {
    const clean = title.trim();
    if (!clean) {
      toast.error('Group name cannot be empty.');
      return;
    }
    setSavingTitle(true);
    try {
      await updateGroup(conversation.id, { title: clean });
      useChatStore.getState().updateConversation(conversation.id, { title: clean });
      await refreshConversations({ silent: true });
      setEditing(false);
      toast.success('Group name updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update the group.');
    } finally {
      setSavingTitle(false);
    }
  };

  const handleAvatar = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadAvatar(file, profile.id, conversation.id);
      await updateGroup(conversation.id, { avatarUrl: url });
      useChatStore.getState().updateConversation(conversation.id, { avatar_url: url });
      await refreshConversations({ silent: true });
      toast.success('Group photo updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update the group photo.');
    } finally {
      setUploading(false);
    }
  };

  const toggleAdd = (user: Profile) => {
    setAddSelected((current) =>
      current.some((item) => item.id === user.id)
        ? current.filter((item) => item.id !== user.id)
        : [...current, user],
    );
  };

  const commitAdd = async () => {
    if (addSelected.length === 0) return;
    setAddingMembers(true);
    try {
      await addGroupMembers(
        conversation.id,
        addSelected.map((user) => user.id),
      );
      toast.success(
        `${addSelected.length} member${addSelected.length === 1 ? '' : 's'} added.`,
      );
      setAddOpen(false);
      setAddSelected([]);
      setAddQuery('');
      await Promise.all([
        loadMembers(),
        refreshConversations({ silent: true }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add members.');
    } finally {
      setAddingMembers(false);
    }
  };

  const removeMember = async (member: ConversationMember) => {
    if (member.user_id === profile.id) return;
    try {
      await removeGroupMember(conversation.id, member.user_id);
      toast.success(`${member.profile.display_name} was removed.`);
      await Promise.all([loadMembers(), refreshConversations({ silent: true })]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove this member.');
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await leaveGroup(conversation.id);
      useChatStore.getState().removeConversation(conversation.id);
      await refreshConversations({ silent: true });
      toast.success('You left the group.');
      onClose();
      onLeft();
      navigate('/chat');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to leave the group.');
    } finally {
      setLeaving(false);
      setConfirmLeave(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Group info">
      <div className="p-5">
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar
              name={conversation.title}
              src={conversation.avatar_url}
              id={conversation.id}
              isGroup
              size={104}
            />
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60 dark:border-[#111b21]"
                  aria-label="Change group photo"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleAvatar(file);
                    event.target.value = '';
                  }}
                />
              </>
            )}
          </div>

          <div className="mt-4 w-full text-center">
            {editing ? (
              <div className="flex items-center gap-1.5">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={80}
                  className="field text-center"
                  autoFocus
                />
                <IconButton
                  label="Save group name"
                  onClick={() => void saveTitle()}
                  disabled={savingTitle}
                  className="text-brand-600"
                >
                  {savingTitle ? <Spinner size={17} /> : <Check size={18} />}
                </IconButton>
                <IconButton
                  label="Cancel editing"
                  onClick={() => {
                    setEditing(false);
                    setTitle(conversation.title || '');
                  }}
                >
                  <X size={18} />
                </IconButton>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-semibold text-[#111b21] dark:text-[#e9edef]">
                  {conversation.title || 'Unnamed group'}
                </h2>
                {isAdmin && (
                  <IconButton label="Rename group" onClick={() => setEditing(true)} className="h-8 w-8">
                    <Pencil size={15} />
                  </IconButton>
                )}
              </div>
            )}
            <p className="mt-1 text-xs text-[#667781] dark:text-[#8696a0]">
              Group · {members.length || conversation.participant_count} members
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
              Members
            </h3>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setAddOpen((value) => !value)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-400"
              >
                <UserPlus size={14} />
                Add
              </button>
            )}
          </div>

          {addOpen && (
            <div className="mt-3 rounded-xl bg-[#f7f8fa] p-3 dark:bg-[#0b141a]">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]"
                />
                <input
                  value={addQuery}
                  onChange={(event) => setAddQuery(event.target.value)}
                  placeholder="Search people"
                  className="field h-9 py-1.5 pl-9 text-sm"
                  aria-label="Search people to add"
                />
              </div>
              <div className="mt-2 max-h-44 overflow-y-auto scrollbar-thin">
                {addLoading ? (
                  <div className="flex justify-center py-4">
                    <Spinner size={16} />
                  </div>
                ) : addResults.length === 0 ? (
                  <p className="py-3 text-center text-xs text-[#8696a0]">No one to add.</p>
                ) : (
                  addResults.map((user) => {
                    const isSelected = addSelected.some((item) => item.id === user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleAdd(user)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                      >
                        <Avatar name={user.display_name} src={user.avatar_url} id={user.id} size={30} />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#111b21] dark:text-[#e9edef]">
                          {user.display_name}
                        </span>
                        <span
                          className={cn(
                            'flex h-4 w-4 items-center justify-center rounded-full border',
                            isSelected
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-[#c5cdd1] dark:border-[#667781]',
                          )}
                        >
                          {isSelected && <Check size={10} />}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    setAddSelected([]);
                  }}
                  className="text-xs font-semibold text-[#667781] dark:text-[#8696a0]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void commitAdd()}
                  disabled={addSelected.length === 0 || addingMembers}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {addingMembers && <Spinner size={12} />}
                  Add {addSelected.length ? `(${addSelected.length})` : ''}
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 space-y-0.5">
            {loading ? (
              <div className="flex justify-center py-5">
                <Spinner size={18} />
              </div>
            ) : (
              members.map((member) => {
                const online = Boolean(presence[member.user_id]);
                const isMe = member.user_id === profile.id;
                return (
                  <div
                    key={member.id}
                    className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-black/[0.035] dark:hover:bg-white/[0.04]"
                  >
                    <Avatar
                      name={member.profile.display_name}
                      src={member.profile.avatar_url}
                      id={member.user_id}
                      size={36}
                      online={online}
                      showOnline
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-[#111b21] dark:text-[#e9edef]">
                        {member.profile.display_name}
                        {isMe && <span className="text-[10px] text-[#8696a0]">(you)</span>}
                        {member.role === 'admin' && (
                          <Crown size={12} className="text-amber-500" aria-label="Group admin" />
                        )}
                      </p>
                      <p className="truncate text-[10px] text-[#8696a0]">
                        {online ? 'online' : formatLastSeen(member.profile.last_seen)}
                      </p>
                    </div>
                    {isAdmin && !isMe && member.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => void removeMember(member)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[#8696a0] opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-500/10"
                        aria-label={`Remove ${member.profile.display_name}`}
                      >
                        <UserMinus size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-black/[0.06] p-4 text-xs leading-5 text-[#667781] dark:border-white/[0.08] dark:text-[#8696a0]">
          <p className="flex items-center gap-2 font-medium text-[#111b21] dark:text-[#e9edef]">
            <Plus size={14} className="text-brand-600" />
            About this group
          </p>
          <p className="mt-1.5">
            Only members can read messages in this group. Admins can update the group photo,
            name, and membership.
          </p>
        </div>

        {confirmLeave ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Leave this group?</p>
            <p className="mt-1 text-xs leading-5 text-red-600/80 dark:text-red-300/70">
              You will stop receiving messages from this conversation.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmLeave(false)}
                className="btn-secondary flex-1 py-2 text-xs"
                disabled={leaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleLeave()}
                className="btn-danger flex-1 py-2 text-xs"
                disabled={leaving}
              >
                {leaving ? <Spinner size={13} /> : <LogOut size={13} />}
                Leave
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
          >
            <Trash2 size={16} />
            Leave group
          </button>
        )}
      </div>
    </Drawer>
  );
}

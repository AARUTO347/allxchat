import { useEffect, useState } from 'react';
import { Info, LockKeyhole, Mail, MessageCircle, UserRound } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Drawer } from '../ui/Primitives';
import { formatLastSeen, isRecentlyOnline } from '../../lib/time';
import { useChatStore } from '../../stores/chatStore';
import type { Conversation, Profile } from '../../types/chat';

interface ContactInfoDrawerProps {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
  profile: Profile;
}

export function ContactInfoDrawer({
  open,
  onClose,
  conversation,
  profile,
}: ContactInfoDrawerProps) {
  const otherUser = conversation.other_user;
  const presence = useChatStore((state) =>
    otherUser ? state.presence[otherUser.id] : undefined,
  );
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const online = Boolean(
    presence || (otherUser?.is_online && isRecentlyOnline(otherUser.last_seen)),
  );

  useEffect(() => {
    setShowMessageInfo(false);
  }, [conversation.id]);

  return (
    <Drawer open={open} onClose={onClose} title="Contact info">
      <div className="p-5">
        <div className="flex flex-col items-center text-center">
          <Avatar
            name={otherUser?.display_name || otherUser?.username}
            src={otherUser?.avatar_url}
            id={otherUser?.id}
            size={112}
            online={online}
            showOnline
          />
          <h2 className="mt-4 text-xl font-semibold text-[#111b21] dark:text-[#e9edef]">
            {otherUser?.display_name || 'Unknown contact'}
          </h2>
          <p className="mt-0.5 text-sm text-[#667781] dark:text-[#8696a0]">
            @{otherUser?.username || 'unknown'}
          </p>
          <p className="mt-1 text-xs text-[#667781] dark:text-[#8696a0]">
            {online ? 'online now' : formatLastSeen(otherUser?.last_seen)}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <div className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.08]">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
              <Info size={13} />
              About
            </p>
            <p className="mt-2 text-sm leading-6 text-[#111b21] dark:text-[#e9edef]">
              {otherUser?.about || 'Hey there! I am using ALLXCHAT.'}
            </p>
          </div>

          <div className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.08]">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
                <MessageCircle size={13} />
                Conversation
              </p>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                Direct
              </span>
            </div>
            <div className="mt-2 space-y-2 text-xs text-[#667781] dark:text-[#8696a0]">
              <p className="flex items-center gap-2">
                <UserRound size={13} />
                {profile.display_name} &amp; {otherUser?.display_name || 'this contact'}
              </p>
              <p className="flex items-center gap-2">
                <LockKeyhole size={13} />
                Only the two of you can read this conversation.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMessageInfo((visible) => !visible)}
            className="w-full rounded-2xl border border-black/[0.06] p-4 text-left transition hover:bg-black/[0.02] dark:border-white/[0.08] dark:hover:bg-white/[0.03]"
          >
            <p className="flex items-center gap-2 text-xs font-semibold text-[#111b21] dark:text-[#e9edef]">
              <Mail size={14} className="text-brand-600" />
              Privacy &amp; delivery
            </p>
            {showMessageInfo && (
              <p className="mt-2 text-xs leading-5 text-[#667781] dark:text-[#8696a0]">
                Messages are stored inside a protected Firebase Firestore database. Security rules
                ensure only conversation participants can retrieve them. Attachments are kept in
                Firebase Storage and delivered through download links.
              </p>
            )}
          </button>
        </div>

        <p className="mt-6 text-center text-[11px] leading-5 text-[#8696a0]">
          ALLXCHAT never asks for your password inside a conversation.
        </p>
      </div>
    </Drawer>
  );
}

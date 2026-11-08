import { Fragment, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock3,
  Download,
  FileAudio,
  FileSpreadsheet,
  FileText,
  Loader2,
  RotateCw,
  SmilePlus,
  Trash2,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useSignedUrl } from '../../hooks/useSignedUrl';
import { getAttachmentDownloadUrl } from '../../lib/storage';
import { formatMessageTime } from '../../lib/time';
import { cn, formatFileSize } from '../../lib/utils';
import type { ChatMessage, DeliveryState, Profile } from '../../types/chat';
import toast from 'react-hot-toast';

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageBubbleProps {
  message: ChatMessage;
  profile: Profile;
  isGroup: boolean;
  showSenderName: boolean;
  showAvatar: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  highlighted?: boolean;
  onImageClick: (url: string, name: string) => void;
  onRetry: (message: ChatMessage) => void;
  onReact: (message: ChatMessage, emoji: string) => void;
  onDelete: (message: ChatMessage) => void;
}

function linkifyText(content: string): ReactNode[] {
  const parts = content.split(/(https?:\/\/[^\s<]+)/g);
  return parts.map((part, index) => {
    if (/^https?:\/\//i.test(part)) {
      const match = part.match(/^(.*?)([.,!?;:)\]]*)$/s);
      const url = match?.[1] || part;
      const trailing = match?.[2] || '';
      return (
        <Fragment key={`link-${index}`}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="message-link"
          >
            {url}
          </a>
          {trailing}
        </Fragment>
      );
    }
    return <Fragment key={`text-${index}`}>{part}</Fragment>;
  });
}

function getDeliveryState(message: ChatMessage): DeliveryState {
  const recipients = Math.max(0, message.recipient_count || 0);
  if (recipients === 0) return 'sent';
  const delivered = new Set(
    message.receipts.filter((receipt) => receipt.delivered_at).map((receipt) => receipt.user_id),
  ).size;
  const read = new Set(
    message.receipts.filter((receipt) => receipt.read_at).map((receipt) => receipt.user_id),
  ).size;
  if (read >= recipients) return 'read';
  if (delivered >= recipients) return 'delivered';
  return 'sent';
}

function fileIcon(mime: string | null) {
  if (mime?.includes('spreadsheet') || mime?.includes('excel') || mime === 'text/csv') {
    return <FileSpreadsheet size={22} />;
  }
  if (mime?.startsWith('audio/')) return <FileAudio size={22} />;
  return <FileText size={22} />;
}

function MessageStatus({
  message,
  state,
}: {
  message: ChatMessage;
  state: DeliveryState;
}) {
  if (message.failed) {
    return <AlertCircle size={13} className="text-red-500" aria-label="Message failed" />;
  }
  if (message.pending) {
    return <Clock3 size={13} className="opacity-60" aria-label="Sending message" />;
  }
  if (state === 'read') {
    return <CheckCheck size={15} className="text-[#53bdeb]" aria-label="Read" />;
  }
  if (state === 'delivered') {
    return <CheckCheck size={15} className="opacity-60" aria-label="Delivered" />;
  }
  return <Check size={15} className="opacity-60" aria-label="Sent" />;
}

function ImageAttachment({
  message,
  onImageClick,
}: {
  message: ChatMessage;
  onImageClick: (url: string, name: string) => void;
}) {
  const signed = useSignedUrl(message.file_path);
  const url = message.local_file_url || message.file_url || signed.url;

  if (signed.loading && !url) {
    return (
      <div className="flex h-44 w-64 max-w-full items-center justify-center rounded-xl bg-black/[0.06] dark:bg-white/[0.08]">
        <Loader2 size={22} className="animate-spin text-[#667781]" />
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-black/[0.06] px-3 py-2 text-xs text-[#667781] dark:bg-white/[0.08] dark:text-[#8696a0]">
        <AlertCircle size={15} />
        Image unavailable
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onImageClick(url, message.file_name || 'Photo')}
      className="group/image relative block overflow-hidden rounded-xl bg-black/[0.06]"
      aria-label="Open image"
    >
      <img
        src={url}
        alt={message.file_name || 'Shared image'}
        className="max-h-72 w-auto max-w-full object-contain transition duration-200 group-hover/image:brightness-95"
        loading="lazy"
      />
    </button>
  );
}

function AudioAttachment({ message }: { message: ChatMessage }) {
  const signed = useSignedUrl(message.file_path);
  const url = message.file_url || signed.url;
  if (signed.loading && !url) {
    return (
      <div className="flex h-14 w-60 items-center justify-center rounded-xl bg-black/[0.05] dark:bg-white/[0.06]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex items-center gap-2 text-xs text-red-500">
        <AlertCircle size={15} /> Audio unavailable
      </div>
    );
  }
  return (
    <audio controls preload="metadata" src={url} className="h-11 w-[260px] max-w-full">
      Your browser does not support audio playback.
    </audio>
  );
}

function FileAttachment({ message }: { message: ChatMessage }) {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (!message.file_path) return;
    setDownloading(true);
    try {
      const url = await getAttachmentDownloadUrl(
        message.file_path,
        message.file_name || 'attachment',
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Unable to download this file.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex min-w-[220px] max-w-[280px] items-center gap-3 rounded-xl bg-black/[0.045] p-2.5 dark:bg-white/[0.06]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
        {fileIcon(message.file_mime)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">
          {message.file_name || 'Attachment'}
        </span>
        <span className="block text-[11px] opacity-60">{formatFileSize(message.file_size)}</span>
      </span>
      <button
        type="button"
        onClick={download}
        disabled={downloading}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656f] hover:bg-black/[0.06] disabled:opacity-50 dark:text-[#aebac1] dark:hover:bg-white/[0.08]"
        aria-label="Download file"
      >
        {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      </button>
    </div>
  );
}

export function MessageBubble({
  message,
  profile,
  isGroup,
  showSenderName,
  showAvatar,
  isFirstInGroup,
  isLastInGroup,
  highlighted = false,
  onImageClick,
  onRetry,
  onReact,
  onDelete,
}: MessageBubbleProps) {
  const isOwn = message.sender_id === profile.id;
  const state = getDeliveryState(message);
  const [reacting, setReacting] = useState(false);
  const showImage = message.message_type === 'image' && message.file_path;
  const showAudio = message.message_type === 'audio' && message.file_path;
  const showFile =
    message.message_type === 'file' && message.file_path && !showImage && !showAudio;
  const reactionEntries = Object.entries(message.reactions || {}).filter(
    ([, users]) => users.length > 0,
  );

  if (message.message_type === 'system') {
    return (
      <div className="my-2 flex justify-center px-4">
        <span className="rounded-full bg-black/[0.06] px-3 py-1 text-[11px] text-[#667781] dark:bg-white/[0.08] dark:text-[#8696a0]">
          {message.content}
        </span>
      </div>
    );
  }

  const tickTitle =
    state === 'read'
      ? `Read by all ${message.recipient_count} recipient${message.recipient_count === 1 ? '' : 's'}`
      : state === 'delivered'
        ? 'Delivered to all recipients'
        : 'Sent';

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        'flex w-full items-end gap-1.5 px-3 py-0.5 sm:px-6',
        isOwn ? 'justify-end' : 'justify-start',
        isFirstInGroup && 'mt-2',
      )}
    >
      {isGroup && !isOwn && (
        <div className="w-8 shrink-0">
          {showAvatar && (
            <Avatar
              name={message.sender?.display_name}
              src={message.sender?.avatar_url}
              id={message.sender?.id}
              size={30}
            />
          )}
        </div>
      )}

      <div
        className={cn(
          'relative max-w-[85%] rounded-2xl px-2.5 py-1.5 transition-shadow sm:max-w-[68%]',
          isOwn ? 'bubble-out' : 'bubble-in',
          isOwn && isFirstInGroup && 'rounded-tr-md',
          isOwn && isLastInGroup && 'rounded-br-md',
          !isOwn && isFirstInGroup && 'rounded-tl-md',
          !isOwn && isLastInGroup && 'rounded-bl-md',
          highlighted && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-transparent',
          message.failed && 'opacity-80',
        )}
      >
        {isFirstInGroup && (
          <svg
            aria-hidden="true"
            viewBox="0 0 8 8"
            preserveAspectRatio="none"
            className={cn(
              'pointer-events-none absolute top-0 h-[8px] w-[8px] [filter:drop-shadow(0_1px_0.5px_rgba(11,20,26,0.14))]',
              isOwn ? '-right-[7px]' : '-left-[7px]',
            )}
          >
            <path
              d={isOwn ? 'M0 0 L0 8 L8 3 Z' : 'M8 0 L8 8 L0 3 Z'}
              className={
                isOwn
                  ? 'fill-[#d9fdd3] dark:fill-[#005c4b]'
                  : 'fill-white dark:fill-[#202c33]'
              }
            />
          </svg>
        )}

        {showSenderName && (
          <p className="mb-0.5 px-0.5 text-[12px] font-semibold text-brand-700 dark:text-brand-300">
            {message.sender?.display_name || 'Unknown'}
          </p>
        )}

        {showImage && <ImageAttachment message={message} onImageClick={onImageClick} />}
        {showAudio && <AudioAttachment message={message} />}
        {showFile && <FileAttachment message={message} />}

        {message.content && (
          <p
            className={cn(
              'whitespace-pre-wrap break-words px-0.5 text-[14.5px] leading-[1.45]',
              (showImage || showAudio || showFile) && 'mt-1.5',
            )}
          >
            {linkifyText(message.content)}
          </p>
        )}

        <div
          className={cn(
            'mt-0.5 flex items-center justify-end gap-1 px-0.5 text-[10px] leading-none',
            isOwn ? 'text-[#667781] dark:text-[#c5d1d6]/70' : 'text-[#667781] dark:text-[#8696a0]',
          )}
        >
          {message.failed && (
            <button
              type="button"
              onClick={() => onRetry(message)}
              className="mr-auto inline-flex items-center gap-1 rounded text-[10px] font-semibold text-red-600 hover:underline dark:text-red-400"
            >
              <RotateCw size={10} />
              Not sent · Retry
            </button>
          )}
          <span>{formatMessageTime(message.created_at)}</span>
          {isOwn && (
            <span title={message.failed ? 'Failed to send' : tickTitle}>
              <MessageStatus message={message} state={state} />
            </span>
          )}
          <button
            type="button"
            onClick={() => setReacting((value) => !value)}
            className="ml-1 flex h-5 w-5 items-center justify-center rounded-full opacity-0 transition hover:bg-black/[0.07] focus-visible:opacity-100 group-hover/bubble:opacity-100 dark:hover:bg-white/[0.1]"
            aria-label="React to message"
            title="React"
          >
            <SmilePlus size={13} />
          </button>
          {isOwn && (
            <button
              type="button"
              onClick={() => onDelete(message)}
              className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-red-500 opacity-0 transition hover:bg-red-50 focus-visible:opacity-100 group-hover/bubble:opacity-100 dark:hover:bg-red-500/10"
              aria-label="Delete message"
              title="Delete message"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {reacting && (
          <div className="absolute -top-4 right-2 z-20 flex gap-0.5 rounded-full bg-white p-1 shadow-lg ring-1 ring-black/[0.06] dark:bg-[#202c33] dark:ring-white/[0.08]">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(message, emoji);
                  setReacting(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-base transition hover:scale-110 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                aria-label={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {reactionEntries.length > 0 && (
          <div className="absolute -bottom-3 left-3 z-10 flex flex-wrap gap-1">
            {reactionEntries.map(([emoji, users]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(message, emoji)}
                title={users.map((id) => (id === profile.id ? 'You' : id)).join(', ')}
                className={cn(
                  'flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] shadow-sm ring-1',
                  users.includes(profile.id)
                    ? 'bg-[#d9fdd3] ring-brand-600/30 dark:bg-[#005c4b] dark:ring-brand-500/40'
                    : 'bg-white ring-black/[0.06] dark:bg-[#2a3942] dark:ring-white/[0.08]',
                )}
              >
                <span>{emoji}</span>
                {users.length > 1 && <span className="font-medium">{users.length}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

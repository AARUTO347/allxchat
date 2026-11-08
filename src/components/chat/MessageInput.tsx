import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from 'react';
import {
  FileAudio,
  FileText,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Smile,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { EmojiClickData } from 'emoji-picker-react';
import { EmojiPickerLazy } from './EmojiPickerLazy';
import { insertMessage } from '../../lib/chatApi';
import { playOutgoingSound } from '../../lib/sounds';
import { uploadAttachment } from '../../lib/storage';
import {
  MAX_MESSAGE_LENGTH,
  sanitizeText,
  validateFile,
  type ValidatedFile,
} from '../../lib/validation';
import { cn, formatFileSize, generateId, isImageType } from '../../lib/utils';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { ChatMessage, Conversation, Profile } from '../../types/chat';

const ACCEPTED_FILES =
  '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.mp3,.wav,.ogg,.webm,.m4a';

interface MessageInputProps {
  conversation: Conversation;
  profile: Profile;
  pendingFile: File | null;
  onPendingFileChange: (file: File | null) => void;
  notifyTyping: () => void;
  stopTyping: () => void;
}

function PendingFilePreview({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = isImageType(file.type);
  const isAudio = file.type.startsWith('audio/');

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return (
    <div className="border-b border-black/[0.06] bg-white/60 px-3 py-2.5 dark:border-white/[0.06] dark:bg-[#202c33]/60">
      <div className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-white p-2 dark:border-white/[0.08] dark:bg-[#111b21]">
        {isImage && previewUrl ? (
          <img
            src={previewUrl}
            alt="Attachment preview"
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            {isAudio ? <FileAudio size={20} /> : <FileText size={20} />}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-[#111b21] dark:text-[#e9edef]">
            {file.name}
          </span>
          <span className="block text-[11px] text-[#667781] dark:text-[#8696a0]">
            {formatFileSize(file.size)} · ready to send
          </span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#667781] hover:bg-black/[0.05] dark:text-[#8696a0] dark:hover:bg-white/[0.08]"
          aria-label="Remove attachment"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );
}

export function MessageInput({
  conversation,
  profile,
  pendingFile,
  onPendingFileChange,
  notifyTyping,
  stopTyping,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const theme = useSettingsStore((state) => state.theme);
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    setText('');
    setEmojiOpen(false);
    stopTyping();
    cancelRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  useEffect(() => {
    if (!emojiOpen) return;
    const handler = (event: MouseEvent) => {
      if (
        emojiContainerRef.current &&
        !emojiContainerRef.current.contains(event.target as Node)
      ) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [emojiOpen]);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      const timer = window.setTimeout(() => textareaRef.current?.focus(), 150);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [conversation.id]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0) {
          toast.error('Recording was empty. Try again.');
          return;
        }
        const extension = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `voice-note.${extension}`, { type: blob.type });
        acceptFile(file);
        setRecording(false);
      };
      recorderRef.current = recorder;
      setRecording(true);
      setRecordingSeconds(0);
      recorder.start(250);
      const timer = window.setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
      intervalRef.current = timer;
    } catch (error) {
      toast.error('Microphone access was denied.');
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  const cancelRecording = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      recorder.onstop = null;
      recorder.stop();
    }
    setRecording(false);
  };

  useEffect(
    () => () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    },
    [],
  );

  const acceptFile = (file: File | null) => {
    if (!file) return;
    const validation = validateFile(file);
    if (typeof validation === 'string') {
      toast.error(validation);
      return;
    }
    onPendingFileChange(file);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    acceptFile(file);
    event.target.value = '';
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files || []);
    const candidate = files.find((file) => isImageType(file.type));
    if (candidate) {
      event.preventDefault();
      acceptFile(candidate);
    }
  };

  const handleEmoji = (emoji: EmojiClickData) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = `${text.slice(0, start)}${emoji.emoji}${text.slice(end)}`;
    setText(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const cursor = start + emoji.emoji.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const handleChange = (value: string) => {
    setText(value);
    if (value.trim()) notifyTyping();
    else stopTyping();
  };

  const send = async () => {
    if (sendingRef.current) return;
    const cleaned = sanitizeText(text).trim();
    if (!pendingFile && !cleaned) return;
    if (cleaned.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Messages cannot exceed ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.`);
      return;
    }

    sendingRef.current = true;
    setUploading(true);
    let uploaded: Awaited<ReturnType<typeof uploadAttachment>> | null = null;
    let validatedFile: ValidatedFile | null = null;

    try {
      if (pendingFile) {
        const validation = validateFile(pendingFile);
        if (typeof validation === 'string') throw new Error(validation);
        validatedFile = validation;
        uploaded = await uploadAttachment(pendingFile, conversation.id, profile.id);
      }

      const clientId = generateId();
      const content = cleaned || null;
      const messageType = validatedFile?.messageType || 'text';
      const optimistic: ChatMessage = {
        id: `pending-${clientId}`,
        conversation_id: conversation.id,
        sender_id: profile.id,
        client_id: clientId,
        content,
        message_type: messageType,
        file_path: uploaded?.path || null,
        file_name: pendingFile?.name || null,
        file_mime: validatedFile?.mime || null,
        file_size: pendingFile?.size || null,
        recipient_count: Math.max(0, conversation.participant_count - 1),
        created_at: new Date().toISOString(),
        sender: profile,
        receipts: [],
        reactions: {},
        pending: true,
        failed: false,
      };

      const store = useChatStore.getState();
      store.addMessage(conversation.id, optimistic, {
        currentUserId: profile.id,
        incrementUnread: false,
      });
      setText('');
      onPendingFileChange(null);
      setEmojiOpen(false);
      stopTyping();

      try {
        const serverMessage = await insertMessage({
          conversationId: conversation.id,
          senderId: profile.id,
          clientId,
          content,
          messageType,
          filePath: uploaded?.path || null,
          fileName: pendingFile?.name || null,
          fileMime: validatedFile?.mime || null,
          fileSize: pendingFile?.size || null,
        });
        useChatStore.getState().addMessage(conversation.id, serverMessage, {
          currentUserId: profile.id,
          incrementUnread: false,
        });
        if (useSettingsStore.getState().sounds) playOutgoingSound();
      } catch (error) {
        useChatStore.getState().updateMessage(
          conversation.id,
          { clientId },
          { pending: false, failed: true },
        );
        toast.error(error instanceof Error ? error.message : 'Unable to send the message.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to prepare the attachment.');
    } finally {
      sendingRef.current = false;
      setUploading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
    if (event.key === 'Escape') setEmojiOpen(false);
  };

  const canSend = Boolean(text.trim() || pendingFile) && !uploading && !recording;
  const charCount = text.length;
  const recordingLabel = `${Math.floor(recordingSeconds / 60)}:${String(recordingSeconds % 60).padStart(2, '0')}`;

  return (
    <div className="relative shrink-0 bg-[#f0f2f5] dark:bg-[#202c33]">
      {pendingFile && (
        <PendingFilePreview file={pendingFile} onRemove={() => onPendingFileChange(null)} />
      )}

      <div className="safe-bottom px-2 pt-2 sm:px-4">
        {recording ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 transition hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
              aria-label="Discard recording"
            >
              <Trash2 size={19} />
            </button>
            <div className="flex min-h-[44px] flex-1 items-center gap-3 rounded-2xl bg-white px-4 shadow-sm dark:bg-[#2a3942]">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              <span className="text-sm font-medium tabular-nums text-[#111b21] dark:text-[#e9edef]">
                {recordingLabel}
              </span>
              <span className="flex items-end gap-[3px]" aria-hidden="true">
                {[0.5, 0.8, 0.35, 1, 0.6, 0.9, 0.45, 0.75].map((height, index) => (
                  <span
                    key={index}
                    className="w-[3px] animate-pulse rounded bg-[#00a884]"
                    style={{ height: `${Math.round(height * 18)}px`, animationDelay: `${index * 120}ms` }}
                  />
                ))}
              </span>
              <span className="text-xs text-[#8696a0]">Recording…</span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-700"
              aria-label="Send voice note"
            >
              <Send size={19} className="ml-0.5" />
            </button>
          </div>
        ) : (
        <div className="flex items-end gap-1.5">
          <div className="relative flex items-end gap-0.5 rounded-2xl bg-white px-1 py-1 shadow-sm dark:bg-[#2a3942]">
            <button
              type="button"
              onClick={() => setEmojiOpen((open) => !open)}
              className="icon-button h-9 w-9 self-end rounded-xl"
              aria-label="Open emoji picker"
              title="Emoji"
            >
              <Smile size={21} />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="icon-button h-9 w-9 self-end rounded-xl"
              aria-label="Attach a file"
              title="Attach file"
              disabled={uploading}
            >
              <Paperclip size={20} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILES}
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          <div className="relative min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(event) => handleChange(event.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onBlur={stopTyping}
              placeholder={uploading ? 'Uploading attachment…' : 'Type a message'}
              aria-label="Message"
              className="scrollbar-thin block max-h-[132px] min-h-[44px] w-full resize-none rounded-2xl border-0 bg-white py-3 pl-4 pr-12 text-[15px] leading-5 text-[#111b21] placeholder:text-[#8696a0] focus:outline-none focus:ring-2 focus:ring-brand-600/15 dark:bg-[#2a3942] dark:text-[#e9edef] dark:placeholder:text-[#8696a0]"
              disabled={uploading}
            />
            {uploading && (
              <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[10px] font-medium text-[#667781] dark:text-[#8696a0]">
                <Loader2 size={14} className="animate-spin" />
              </span>
            )}
            {!uploading && charCount > MAX_MESSAGE_LENGTH - 400 && (
              <span
                className={cn(
                  'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium',
                  charCount > MAX_MESSAGE_LENGTH ? 'text-red-500' : 'text-[#8696a0]',
                )}
              >
                {charCount}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
          </div>

            {text.trim() || pendingFile ? (
              <button
                type="button"
                onClick={() => void send()}
                disabled={!canSend}
                className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-[#8696a0]/40 disabled:text-white/80 dark:disabled:bg-[#8696a0]/25"
                aria-label="Send message"
                title="Send message"
              >
                {uploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startRecording()}
                disabled={uploading}
                className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-[#8696a0]/40 disabled:text-white/80 dark:disabled:bg-[#8696a0]/25"
                aria-label="Record a voice note"
                title="Record a voice note"
              >
                <Mic size={20} />
              </button>
            )}
          </div>
        )}

        <div className="hidden items-center justify-between px-2 pb-1 pt-1.5 text-[10px] text-[#8696a0] sm:flex">
          <span>Enter to send · Shift + Enter for a new line</span>
          <span>Max file size 5 MB</span>
        </div>
      </div>

      {emojiOpen && (
        <div
          ref={emojiContainerRef}
          className="absolute bottom-[calc(100%+8px)] left-2 z-30 max-w-[calc(100vw-24px)] overflow-hidden rounded-xl shadow-2xl sm:left-4"
        >
          <EmojiPickerLazy isDark={isDark} onEmoji={handleEmoji} />
        </div>
      )}
    </div>
  );
}

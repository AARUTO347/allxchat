import { useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Loader2, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ChatSearch } from './ChatSearch';
import { Modal } from '../ui/Primitives';
import { useTyping } from '../../hooks/useTyping';
import {
  deleteMessage,
  fetchMessagesAround,
  insertMessage,
  toggleMessageReaction,
} from '../../lib/chatApi';
import { getErrorMessage } from '../../lib/errors';
import { groqChat } from '../../lib/groq';
import { playOutgoingSound } from '../../lib/sounds';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { validateFile } from '../../lib/validation';
import type { ChatMessage, Conversation, Profile, SearchResult } from '../../types/chat';

interface ChatPanelProps {
  conversation: Conversation | null;
  profile: Profile;
  loadingConversation: boolean;
  loadOlder: () => Promise<void>;
  reloadMessages: () => void;
  onBack: () => void;
  onOpenInfo: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
}

export function ChatPanel({
  conversation,
  profile,
  loadingConversation,
  loadOlder,
  reloadMessages,
  onBack,
  onOpenInfo,
  onVoiceCall,
  onVideoCall,
}: ChatPanelProps) {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);
  const [summary, setSummary] = useState<{ open: boolean; text: string; busy: boolean }>({
    open: false,
    text: '',
    busy: false,
  });
  const dragCounter = useRef(0);
  const summaryAbortRef = useRef<AbortController | null>(null);
  const { typingUsers, notifyTyping, stopTyping } = useTyping(
    conversation?.id ?? null,
    profile,
  );

  if (!conversation) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#0b141a]">
        {loadingConversation ? (
          <>
            <Loader2 size={28} className="animate-spin text-brand-600" />
            <p className="mt-3 text-sm text-[#667781] dark:text-[#8696a0]">
              Opening conversation…
            </p>
          </>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#667781] shadow-sm dark:bg-[#202c33] dark:text-[#8696a0]">
              <ArrowLeft size={23} />
            </div>
            <h2 className="mt-4 text-base font-semibold text-[#111b21] dark:text-[#e9edef]">
              Conversation unavailable
            </h2>
            <p className="mt-1 max-w-xs text-center text-sm leading-6 text-[#667781] dark:text-[#8696a0]">
              It may have been removed, or you may no longer be a participant.
            </p>
            <button type="button" onClick={() => navigate('/chat')} className="btn-primary mt-5">
              Back to chats
            </button>
          </>
        )}
      </div>
    );
  }

  const handleDragEnter = (event: DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragCounter.current += 1;
    setDragging(true);
  };

  const handleDragOver = (event: DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setDragging(false);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length === 0) return;
    const file = files[0];
    const validation = validateFile(file);
    if (typeof validation === 'string') {
      toast.error(validation);
      return;
    }
    if (files.length > 1) toast('Attach one file per message.');
    setPendingFile(file);
  };

  const reactToMessage = async (message: ChatMessage, emoji: string) => {
    const userId = profile.id;
    const current = message.reactions || {};
    const users = current[emoji] || [];
    const reacted = users.includes(userId);
    useChatStore.getState().updateMessage(
      conversation.id,
      { id: message.id },
      {
        reactions: {
          ...current,
          [emoji]: reacted
            ? users.filter((id) => id !== userId)
            : [...users, userId],
        },
      },
    );
    try {
      await toggleMessageReaction(conversation.id, message.id, emoji);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to save your reaction.'));
      reloadMessages();
    }
  };

  const deleteOwnMessage = async (message: ChatMessage) => {
    if (!window.confirm('Delete this message for everyone?')) return;
    useChatStore.getState().removeMessage(conversation.id, { id: message.id });
    try {
      await deleteMessage(conversation.id, message.id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to delete the message.'));
      reloadMessages();
    }
  };

  const summarizeConversation = async () => {
    const messages = useChatStore.getState().messages[conversation.id] || [];
    const recent = messages.filter((message) => !message.pending).slice(-50);
    if (recent.length === 0) {
      toast('No messages to summarize yet.');
      return;
    }
    summaryAbortRef.current?.abort();
    const abort = new AbortController();
    summaryAbortRef.current = abort;
    setSummary({ open: true, text: '', busy: true });
    try {
      const transcript = recent
        .map((message) => {
          const who =
            message.sender?.display_name ||
            (message.sender_id === profile.id ? 'You' : 'Other');
          const what =
            message.content?.trim() ||
            (message.message_type === 'audio'
              ? '[voice note]'
              : message.message_type === 'image'
                ? '[image]'
                : `[${message.message_type}]`);
          return `${who}: ${what}`;
        })
        .join('\n');
      const text = await groqChat([
        {
          role: 'user',
          content: `Summarize this chat conversation in 3-5 short bullet points. Focus on decisions, questions, and action items. Conversation:\n${transcript}`,
        },
      ]);
      setSummary({ open: true, text, busy: false });
    } catch (error) {
      setSummary({ open: true, text: getErrorMessage(error, 'Unable to summarize.'), busy: false });
    } finally {
      summaryAbortRef.current = null;
    }
  };

  const retryMessage = async (message: ChatMessage) => {
    if (!message.client_id || !message.sender_id) {
      toast.error('This message cannot be retried.');
      return;
    }
    useChatStore.getState().updateMessage(
      conversation.id,
      { clientId: message.client_id },
      { pending: true, failed: false },
    );
    try {
      const serverMessage = await insertMessage({
        conversationId: conversation.id,
        senderId: message.sender_id,
        clientId: message.client_id,
        content: message.content,
        messageType:
          message.message_type === 'system' ? 'text' : message.message_type,
        filePath: message.file_path,
        fileName: message.file_name,
        fileMime: message.file_mime,
        fileSize: message.file_size,
      });
      useChatStore.getState().addMessage(conversation.id, serverMessage, {
        currentUserId: profile.id,
        incrementUnread: false,
      });
      if (useSettingsStore.getState().sounds) playOutgoingSound();
    } catch (error) {
      useChatStore.getState().updateMessage(
        conversation.id,
        { clientId: message.client_id },
        { pending: false, failed: true },
      );
      toast.error(error instanceof Error ? error.message : 'Unable to resend the message.');
    }
  };

  const jumpToResult = async (result: SearchResult) => {
    try {
      const window = await fetchMessagesAround(conversation.id, {
        id: result.message_id,
        created_at: result.created_at,
      });
      useChatStore.getState().mergeMessages(conversation.id, window.messages);
      useChatStore.getState().setFocusMessageId(result.message_id);
      setSearchOpen(false);
      if (!window.found) toast('That message is no longer available.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to open that message.');
    }
  };

  return (
    <section
      className="relative flex h-full min-w-0 flex-1 flex-col"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <ChatHeader
        conversation={conversation}
        typingNames={typingUsers.map((user) => user.name)}
        searchOpen={searchOpen}
        onBack={onBack}
        onOpenInfo={onOpenInfo}
        onToggleSearch={() => setSearchOpen((open) => !open)}
        onSummarize={() => void summarizeConversation()}
        onVoiceCall={onVoiceCall}
        onVideoCall={onVideoCall}
      />

      {searchOpen && (
        <ChatSearch
          conversationId={conversation.id}
          onClose={() => setSearchOpen(false)}
          onSelect={jumpToResult}
        />
      )}

      <div className="chat-wallpaper relative flex min-h-0 flex-1 flex-col">
        <MessageList
          conversation={conversation}
          profile={profile}
          loadOlder={loadOlder}
          onReload={reloadMessages}
          onImageClick={(url, name) => setLightbox({ url, name })}
          onRetry={(message) => void retryMessage(message)}
          onReact={(message, emoji) => void reactToMessage(message, emoji)}
          onDelete={(message) => void deleteOwnMessage(message)}
        />
        <MessageInput
          conversation={conversation}
          profile={profile}
          pendingFile={pendingFile}
          onPendingFileChange={setPendingFile}
          notifyTyping={notifyTyping}
          stopTyping={stopTyping}
        />
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#0b141a]/35 p-6 backdrop-blur-[2px]">
          <div className="flex w-full max-w-sm flex-col items-center rounded-3xl border-2 border-dashed border-brand-400 bg-white/95 px-8 py-12 text-center shadow-2xl dark:bg-[#111b21]/95">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              <UploadCloud size={30} />
            </span>
            <h3 className="mt-4 text-base font-semibold text-[#111b21] dark:text-[#e9edef]">
              Drop to attach
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#667781] dark:text-[#8696a0]">
              Photos, PDFs, documents, and audio up to 25 MB.
            </p>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        title={lightbox?.name || 'Image'}
        size="xl"
        className="bg-[#0b141a] dark:bg-[#0b141a]"
      >
        {lightbox && (
          <div className="flex max-h-[78vh] items-center justify-center bg-[#0b141a] p-3">
            <img
              src={lightbox.url}
              alt={lightbox.name}
              className="max-h-[72vh] max-w-full object-contain"
            />
          </div>
        )}
        <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-[#8696a0]">
          <ImageIcon size={14} />
          Shared in this conversation
        </div>
      </Modal>

      <Modal
        open={summary.open}
        onClose={() => {
          summaryAbortRef.current?.abort();
          setSummary({ open: false, text: '', busy: false });
        }}
        title="AI Summary"
        size="md"
      >
        {summary.busy ? (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-[#667781] dark:text-[#8696a0]">
            <Loader2 size={18} className="animate-spin" />
            Reading the conversation…
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap px-5 py-4 text-sm leading-6 text-[#111b21] dark:text-[#e9edef]">
            {summary.text || 'No summary available.'}
          </div>
        )}
      </Modal>
    </section>
  );
}

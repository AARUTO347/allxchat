import { Suspense, lazy, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sidebar } from '../components/chat/Sidebar';
import { ChatEmptyState } from '../components/chat/ChatEmptyState';
import { LoadingScreen } from '../components/ui/Primitives';

// On-demand chunks: chat view + modals/drawers load only when first needed.
const ChatPanel = lazy(() =>
  import('../components/chat/ChatPanel').then((m) => ({ default: m.ChatPanel })),
);
const NewChatModal = lazy(() =>
  import('../components/chat/NewChatModal').then((m) => ({ default: m.NewChatModal })),
);
const NewGroupModal = lazy(() =>
  import('../components/chat/NewGroupModal').then((m) => ({ default: m.NewGroupModal })),
);
const SettingsModal = lazy(() =>
  import('../components/chat/SettingsModal').then((m) => ({ default: m.SettingsModal })),
);
const GroupInfoDrawer = lazy(() =>
  import('../components/chat/GroupInfoDrawer').then((m) => ({ default: m.GroupInfoDrawer })),
);
const ContactInfoDrawer = lazy(() =>
  import('../components/chat/ContactInfoDrawer').then((m) => ({ default: m.ContactInfoDrawer })),
);
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useConversations } from '../hooks/useConversations';
import { useChatRealtime } from '../hooks/useChatRealtime';
import { usePresence } from '../hooks/usePresence';
import { useMessages } from '../hooks/useMessages';
import { cn } from '../lib/utils';
import type { Profile } from '../types/chat';

function ChatWorkspace({ profile }: { profile: Profile }) {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const conversations = useChatStore((state) => state.conversations);
  const conversationsLoading = useChatStore((state) => state.conversationsLoading);
  const conversationsError = useChatStore((state) => state.conversationsError);
  const setActiveId = useChatStore((state) => state.setActiveId);
  const removeConversation = useChatStore((state) => state.removeConversation);
  const { refresh } = useConversations(profile.id);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [contactInfoOpen, setContactInfoOpen] = useState(false);

  const activeConversation =
    conversations.find((conversation) => conversation.id === conversationId) || null;

  useChatRealtime({
    profile,
    activeConversationId: conversationId || null,
    refreshConversations: refresh,
  });
  usePresence(profile);
  const { loadOlder, reload } = useMessages(conversationId || null);

  useEffect(() => {
    setActiveId(conversationId || null);
  }, [conversationId, setActiveId]);

  useEffect(() => {
    if (!conversationId) {
      setGroupInfoOpen(false);
      setContactInfoOpen(false);
    }
  }, [conversationId]);

  useEffect(() => {
    const totalUnread = conversations.reduce(
      (total, conversation) => total + conversation.unread_count,
      0,
    );
    document.title = totalUnread > 0 ? `(${totalUnread}) ALLXCHAT` : 'ALLXCHAT';
    return () => {
      document.title = 'ALLXCHAT';
    };
  }, [conversations]);

  useEffect(() => {
    const handlePopState = () => {
      if (!window.location.pathname.startsWith('/chat/')) {
        setActiveId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveId]);

  const openConversation = (id: string) => {
    navigate(`/chat/${id}`);
  };

  const handleCreated = (id: string) => {
    void refresh();
    navigate(`/chat/${id}`);
  };

  const openInfo = () => {
    if (!activeConversation) return;
    if (activeConversation.is_group) setGroupInfoOpen(true);
    else setContactInfoOpen(true);
  };

  const backToChats = () => {
    navigate('/chat');
  };

  const activeId = conversationId || null;

  return (
    <div className="app-shell flex">
      <div
        className={cn(
          'h-full w-full md:w-auto',
          activeId ? 'hidden md:block' : 'block',
        )}
      >
        <Sidebar
          profile={profile}
          conversations={conversations}
          activeId={activeId}
          loading={conversationsLoading && conversations.length === 0}
          error={conversationsError}
          onRetry={() => void refresh()}
          onSelect={openConversation}
          onNewChat={() => setNewChatOpen(true)}
          onNewGroup={() => setNewGroupOpen(true)}
          onSettings={() => setSettingsOpen(true)}
        />
      </div>

      <main
        className={cn(
          'h-full min-w-0 flex-1',
          activeId ? 'flex' : 'hidden md:flex',
        )}
      >
        <Suspense fallback={<LoadingScreen label="Opening chat…" />}>
        {activeConversation ? (
          <ChatPanel
            key={activeConversation.id}
            conversation={activeConversation}
            profile={profile}
            loadingConversation={false}
            loadOlder={loadOlder}
            reloadMessages={reload}
            onBack={backToChats}
            onOpenInfo={openInfo}
          />
        ) : activeId ? (
          <ChatPanel
            key={activeId}
            conversation={null}
            profile={profile}
            loadingConversation={conversationsLoading}
            loadOlder={loadOlder}
            reloadMessages={reload}
            onBack={backToChats}
            onOpenInfo={openInfo}
          />
        ) : (
          <ChatEmptyState />
        )}
        </Suspense>
      </main>

      {newChatOpen && (
        <Suspense fallback={null}>
          <NewChatModal
            open={newChatOpen}
            onClose={() => setNewChatOpen(false)}
            profile={profile}
            onCreated={handleCreated}
          />
        </Suspense>
      )}
      {newGroupOpen && (
        <Suspense fallback={null}>
          <NewGroupModal
            open={newGroupOpen}
            onClose={() => setNewGroupOpen(false)}
            profile={profile}
            onCreated={handleCreated}
          />
        </Suspense>
      )}
      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}

      {groupInfoOpen && activeConversation?.is_group && (
        <Suspense fallback={null}>
          <GroupInfoDrawer
            open={groupInfoOpen}
            onClose={() => setGroupInfoOpen(false)}
            conversation={activeConversation}
            profile={profile}
            refreshConversations={refresh}
            onLeft={() => {
              setGroupInfoOpen(false);
              removeConversation(activeConversation.id);
            }}
          />
        </Suspense>
      )}

      {contactInfoOpen && activeConversation && !activeConversation.is_group && activeConversation.other_user && (
        <Suspense fallback={null}>
          <ContactInfoDrawer
            open={contactInfoOpen}
            onClose={() => setContactInfoOpen(false)}
            conversation={activeConversation}
            profile={profile}
          />
        </Suspense>
      )}
    </div>
  );
}

export function ChatPage() {
  const profile = useAuthStore((state) => state.profile);
  const loading = useAuthStore((state) => state.loading);

  if (loading && !profile) return <LoadingScreen label="Opening ALLXCHAT…" />;
  if (!profile) return <LoadingScreen label="Preparing your profile…" />;
  return <ChatWorkspace profile={profile} />;
}

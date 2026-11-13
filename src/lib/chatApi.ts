import {
  get,
  limitToFirst,
  limitToLast,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  set,
  startAt,
  endAt,
  update,
  runTransaction,
  type DataSnapshot,
  type DatabaseReference,
} from 'firebase/database';
import { getAuthInstance, getRtdb } from './firebase';
import { getErrorMessage } from './errors';
import { sanitizeFileName, sanitizeSearchQuery } from './validation';
import {
  mapProfile,
  type ChatMessage,
  type Conversation,
  type ConversationMember,
  type LastMessage,
  type Profile,
  type SearchResult,
  type UserDoc,
} from '../types/chat';

export const MESSAGE_PAGE_SIZE = 50;

type ConversationDoc = {
  isGroup: boolean;
  title: string | null;
  avatarUrl: string | null;
  createdBy: string;
  directKey: string | null;
  participantIds: Record<string, boolean>;
  roles: Record<string, 'admin' | 'member'>;
  joinedAt: Record<string, string>;
  lastReadAt: Record<string, string>;
  lastDeliveredAt: Record<string, string>;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

type MessageDoc = {
  clientId: string | null;
  senderId: string | null;
  content: string | null;
  messageType: ChatMessage['message_type'];
  filePath: string | null;
  fileName: string | null;
  fileMime: string | null;
  fileSize: number | null;
  recipientCount: number;
  createdAt: string;
  deliveredAtBy: Record<string, string>;
  readAtBy: Record<string, string>;
  reactions?: Record<string, Record<string, boolean>>;
};

export function currentUserId(): string {
  const user = getAuthInstance().currentUser;
  if (!user) throw new Error('You are not signed in.');
  return user.uid;
}

function toIso(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

function shiftIso(iso: string, deltaMs: number): string {
  const time = new Date(iso).getTime();
  return new Date(Number.isNaN(time) ? Date.now() + deltaMs : time + deltaMs).toISOString();
}

function participantList(data: ConversationDoc): string[] {
  return Object.keys(data.participantIds || {});
}

function receiptsFromDoc(data: MessageDoc): ChatMessage['receipts'] {
  const users = new Set([
    ...Object.keys(data.deliveredAtBy || {}),
    ...Object.keys(data.readAtBy || {}),
  ]);
  return Array.from(users).map((userId) => ({
    user_id: userId,
    delivered_at: data.deliveredAtBy?.[userId] || null,
    read_at: data.readAtBy?.[userId] || null,
  }));
}

function reactionsFromDoc(data: MessageDoc): ChatMessage['reactions'] {
  const reactions = data.reactions || {};
  return Object.fromEntries(
    Object.entries(reactions)
      .map(([emoji, users]) => [emoji, Object.keys(users || {})] as const)
      .filter(([, users]) => users.length > 0),
  );
}

function mapMessageDoc(
  conversationId: string,
  id: string,
  data: MessageDoc,
  sender: Profile | null = null,
): ChatMessage {
  return {
    id,
    conversation_id: conversationId,
    sender_id: data.senderId,
    client_id: data.clientId,
    content: data.content,
    message_type: data.messageType,
    file_path: data.filePath,
    file_name: data.fileName,
    file_mime: data.fileMime,
    file_size: data.fileSize,
    recipient_count: Number(data.recipientCount || 0),
    created_at: toIso(data.createdAt),
    sender,
    receipts: receiptsFromDoc(data),
    reactions: reactionsFromDoc(data),
    pending: false,
    failed: false,
  };
}

function snapshotEntries<T>(snapshot: DataSnapshot): Array<{ id: string; data: T }> {
  const value = snapshot.val() as Record<string, T> | null;
  if (!value) return [];
  return Object.entries(value).map(([id, data]) => ({ id, data }));
}

function sortRows(rows: Array<{ id: string; data: MessageDoc }>) {
  return rows
    .slice()
    .sort(
      (a, b) =>
        new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime() ||
        a.id.localeCompare(b.id),
    );
}

async function getConversation(
  conversationId: string,
): Promise<ConversationDoc | null> {
  const snap = await get(ref(getRtdb(), `conversations/${conversationId}`));
  return snap.exists() ? (snap.val() as ConversationDoc) : null;
}

async function fetchProfiles(ids: string[]): Promise<Map<string, Profile>> {
  const db = getRtdb();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const entries = await Promise.all(
    unique.map(async (id) => {
      const snap = await get(ref(db, `users/${id}`));
      if (!snap.exists()) return null;
      return [id, mapProfile(id, snap.val() as UserDoc)] as const;
    }),
  );
  return new Map(entries.filter(Boolean) as Array<[string, Profile]>);
}

function sortSummaries(conversations: Conversation[]): Conversation[] {
  return conversations.sort(
    (a, b) =>
      new Date(b.last_message_at || b.created_at).getTime() -
      new Date(a.last_message_at || a.created_at).getTime(),
  );
}

export async function fetchConversationSummaries(): Promise<Conversation[]> {
  const db = getRtdb();
  const uid = currentUserId();
  const indexSnap = await get(ref(db, `userConversations/${uid}`));
  const conversationIds = Object.keys(
    (indexSnap.val() as Record<string, boolean> | null) || {},
  );

  const conversations = await Promise.all(
    conversationIds.map(async (conversationId) => {
      const data = await getConversation(conversationId);
      if (!data) return null;
      const participantIds = participantList(data);
      const otherUserId = !data.isGroup
        ? participantIds.find((id) => id !== uid) || null
        : null;
      const otherUser = otherUserId
        ? (await fetchProfiles([otherUserId])).get(otherUserId) || null
        : null;

      const messagesRef = ref(db, `conversations/${conversationId}/messages`);
      const [lastMessageSnap, unreadSnap] = await Promise.all([
        get(query(messagesRef, orderByChild('createdAt'), limitToLast(1))),
        get(
          query(
            messagesRef,
            orderByChild('createdAt'),
            startAt(data.lastReadAt?.[uid] || data.createdAt),
            limitToLast(100),
          ),
        ),
      ]);

      const lastRows = snapshotEntries<MessageDoc>(lastMessageSnap);
      let lastMessage: LastMessage | null = null;
      if (lastRows.length > 0) {
        const lastDoc = lastRows[0];
        const messageData = lastDoc.data;
        const senderName = messageData.senderId
          ? (await fetchProfiles([messageData.senderId])).get(messageData.senderId)
              ?.display_name || null
          : null;
        lastMessage = {
          id: lastDoc.id,
          content: messageData.content,
          message_type: messageData.messageType,
          file_name: messageData.fileName,
          sender_id: messageData.senderId,
          sender_name: senderName,
          created_at: toIso(messageData.createdAt),
        };
      }

      const unreadCount = snapshotEntries<MessageDoc>(unreadSnap).filter(
        (row) => row.data.senderId !== uid,
      ).length;

      return {
        id: conversationId,
        is_group: data.isGroup,
        title: data.title,
        avatar_url: data.avatarUrl,
        last_message_at: toIso(lastMessage?.created_at || data.lastMessageAt),
        created_at: toIso(data.createdAt),
        other_user: otherUser,
        participant_count: participantIds.length,
        last_message: lastMessage,
        unread_count: unreadCount,
      } satisfies Conversation;
    }),
  );

  return sortSummaries(
    conversations.filter((item): item is Conversation => item !== null),
  );
}

export async function fetchMessages(
  conversationId: string,
  before?: string,
  limitCount = MESSAGE_PAGE_SIZE,
): Promise<ChatMessage[]> {
  const messagesRef = ref(getRtdb(), `conversations/${conversationId}/messages`);
  const base = before
    ? query(
        messagesRef,
        orderByChild('createdAt'),
        endAt(shiftIso(before, -1)),
        limitToLast(limitCount),
      )
    : query(messagesRef, orderByChild('createdAt'), limitToLast(limitCount));
  const rows = sortRows(snapshotEntries<MessageDoc>(await get(base)));
  const senders = await fetchProfiles(rows.map((row) => row.data.senderId || ''));
  return rows.map((row) =>
    mapMessageDoc(
      conversationId,
      row.id,
      row.data,
      row.data.senderId ? senders.get(row.data.senderId) || null : null,
    ),
  );
}

export interface MessageWindow {
  messages: ChatMessage[];
  found: boolean;
}

export async function fetchMessagesAround(
  conversationId: string,
  target: { id: string; created_at: string },
): Promise<MessageWindow> {
  const messagesRef = ref(getRtdb(), `conversations/${conversationId}/messages`);
  const [beforeSnap, afterSnap] = await Promise.all([
    get(
      query(
        messagesRef,
        orderByChild('createdAt'),
        endAt(shiftIso(target.created_at, -1)),
        limitToLast(25),
      ),
    ),
    get(
      query(
        messagesRef,
        orderByChild('createdAt'),
        startAt(target.created_at),
        limitToFirst(30),
      ),
    ),
  ]);

  const merged = new Map<string, ChatMessage>();
  for (const row of [
    ...snapshotEntries<MessageDoc>(beforeSnap),
    ...snapshotEntries<MessageDoc>(afterSnap),
  ]) {
    merged.set(row.id, mapMessageDoc(conversationId, row.id, row.data));
  }
  const messages = Array.from(merged.values()).sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime() ||
      a.id.localeCompare(b.id),
  );
  const senders = await fetchProfiles(messages.map((message) => message.sender_id || ''));
  messages.forEach((message) => {
    if (message.sender_id) message.sender = senders.get(message.sender_id) || null;
  });
  return { messages, found: messages.some((message) => message.id === target.id) };
}

interface InsertMessageInput {
  conversationId: string;
  senderId: string;
  clientId: string;
  content: string | null;
  messageType: ChatMessage['message_type'];
  filePath?: string | null;
  fileName?: string | null;
  fileMime?: string | null;
  fileSize?: number | null;
}

export async function insertMessage(input: InsertMessageInput): Promise<ChatMessage> {
  const db = getRtdb();
  const now = new Date().toISOString();
  const conversation = await getConversation(input.conversationId);
  if (!conversation) throw new Error('That conversation is no longer available.');
  const recipientCount = Math.max(0, participantList(conversation).length - 1);

  const messageId = `msg_${input.clientId}`;
  const data: MessageDoc = {
    clientId: input.clientId,
    senderId: input.senderId,
    content: input.content,
    messageType: input.messageType,
    filePath: input.filePath || null,
    fileName: input.fileName ? sanitizeFileName(input.fileName) : null,
    fileMime: input.fileMime || null,
    fileSize: input.fileSize || null,
    recipientCount,
    createdAt: now,
    deliveredAtBy: {},
    readAtBy: {},
    reactions: {},
  };

  await update(ref(db), {
    [`conversations/${input.conversationId}/messages/${messageId}`]: data,
    [`conversations/${input.conversationId}/lastMessageAt`]: now,
    [`conversations/${input.conversationId}/updatedAt`]: now,
  } satisfies Record<string, unknown>);

  const afterSnap = await get(
    ref(db, `conversations/${input.conversationId}/messages/${messageId}`),
  );
  if (!afterSnap.exists()) throw new Error(getErrorMessage(null, 'Unable to send the message.'));
  const sender = (await fetchProfiles([input.senderId])).get(input.senderId) || null;
  return mapMessageDoc(
    input.conversationId,
    messageId,
    afterSnap.val() as MessageDoc,
    sender,
  );
}

async function markReceipts(
  conversationId: string,
  field: 'lastDeliveredAt' | 'lastReadAt',
): Promise<void> {
  const db = getRtdb();
  const uid = currentUserId();
  const now = new Date().toISOString();
  const conversation = await getConversation(conversationId);
  if (!conversation) return;
  const after = conversation[field]?.[uid] || conversation.createdAt;
  const mapField = field === 'lastReadAt' ? 'readAtBy' : 'deliveredAtBy';

  const snapshot = await get(
    query(
      ref(db, `conversations/${conversationId}/messages`),
      orderByChild('createdAt'),
      startAt(after),
      limitToLast(200),
    ),
  );
  const targets = snapshotEntries<MessageDoc>(snapshot).filter(
    (row) => row.data.senderId !== uid,
  );
  if (targets.length === 0 && conversation[field]?.[uid]) return;

  const updates: Record<string, unknown> = {
    [`conversations/${conversationId}/${field}/${uid}`]: now,
    [`conversations/${conversationId}/updatedAt`]: now,
  };
  targets.forEach((row) => {
    updates[
      `conversations/${conversationId}/messages/${row.id}/${mapField}/${uid}`
    ] = now;
  });
  await update(ref(db), updates);
}

export async function markMessagesDelivered(conversationId: string): Promise<void> {
  await markReceipts(conversationId, 'lastDeliveredAt');
}

export async function markMessagesRead(conversationId: string): Promise<void> {
  await markReceipts(conversationId, 'lastReadAt');
}

export async function searchProfiles(
  queryText: string,
  currentUserIdValue: string,
  limitCount = 25,
): Promise<Profile[]> {
  const db = getRtdb();
  const cleaned = sanitizeSearchQuery(queryText).toLowerCase();
  const snapshot = await get(ref(db, 'users'));
  const users = snapshotEntries<UserDoc>(snapshot);
  return users
    .map((row) => mapProfile(row.id, row.data))
    .filter(
      (profile) =>
        profile.id !== currentUserIdValue &&
        (!cleaned ||
          profile.display_name.toLowerCase().includes(cleaned) ||
          profile.username.toLowerCase().includes(cleaned)),
    )
    .sort((a, b) => a.display_name.localeCompare(b.display_name))
    .slice(0, limitCount);
}

export async function fetchConversationMembers(
  conversationId: string,
): Promise<ConversationMember[]> {
  const conversation = await getConversation(conversationId);
  if (!conversation) return [];
  const participantIds = participantList(conversation);
  const profiles = await fetchProfiles(participantIds);
  return participantIds.map((userId) => ({
    id: `${conversationId}:${userId}`,
    user_id: userId,
    role: conversation.roles?.[userId] || 'member',
    joined_at: conversation.joinedAt?.[userId] || conversation.createdAt,
    last_read_at: conversation.lastReadAt?.[userId] || conversation.createdAt,
    last_delivered_at: conversation.lastDeliveredAt?.[userId] || conversation.createdAt,
    profile: profiles.get(userId) as Profile,
  }));
}

export async function searchMessages(
  conversationId: string,
  queryText: string,
): Promise<SearchResult[]> {
  const cleaned = sanitizeSearchQuery(queryText);
  if (cleaned.length < 2) return [];
  const snapshot = await get(
    query(
      ref(getRtdb(), `conversations/${conversationId}/messages`),
      orderByChild('createdAt'),
      limitToLast(300),
    ),
  );
  const needle = cleaned.toLowerCase();
  const rows = snapshotEntries<MessageDoc>(snapshot).filter(
    (row) =>
      (row.data.content || '').toLowerCase().includes(needle) ||
      (row.data.fileName || '').toLowerCase().includes(needle),
  );
  const senders = await fetchProfiles(rows.map((row) => row.data.senderId || ''));
  return rows.map((row) => ({
    message_id: row.id,
    conversation_id: conversationId,
    sender_id: row.data.senderId,
    sender_name: row.data.senderId ? senders.get(row.data.senderId)?.display_name || null : null,
    content: row.data.content,
    message_type: row.data.messageType,
    file_name: row.data.fileName,
    created_at: toIso(row.data.createdAt),
  }));
}

function directConversationId(a: string, b: string): string {
  return `direct_${[a, b].sort().join('_')}`;
}

function indexUpdatesFor(participantIds: string[], conversationId: string) {
  const updates: Record<string, unknown> = {};
  participantIds.forEach((userId) => {
    updates[`userConversations/${userId}/${conversationId}`] = true;
  });
  return updates;
}

export async function createDirectConversation(otherUserId: string): Promise<string> {
  const db = getRtdb();
  const uid = currentUserId();
  if (!otherUserId || otherUserId === uid) throw new Error('Choose another person to chat with.');
  const otherSnap = await get(ref(db, `users/${otherUserId}`));
  if (!otherSnap.exists()) throw new Error('That person is no longer available.');

  const id = directConversationId(uid, otherUserId);
  const existing = await get(ref(db, `conversations/${id}`)).catch(() => null);
  const now = new Date().toISOString();
  if (!existing || !existing.exists()) {
    const participantIds = [uid, otherUserId].sort();
    const participants: Record<string, boolean> = {};
    participantIds.forEach((userId) => {
      participants[userId] = true;
    });
    await set(ref(db, `conversations/${id}`), {
      isGroup: false,
      title: null,
      avatarUrl: null,
      createdBy: uid,
      directKey: `direct:${[uid, otherUserId].sort().join(':')}`,
      participantIds: participants,
      roles: { [uid]: 'admin', [otherUserId]: 'member' },
      joinedAt: { [uid]: now, [otherUserId]: now },
      lastReadAt: { [uid]: now, [otherUserId]: now },
      lastDeliveredAt: { [uid]: now, [otherUserId]: now },
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    } satisfies ConversationDoc);
    await update(ref(db), indexUpdatesFor(participantIds, id));
  }
  return id;
}

export async function createGroupConversation(
  title: string,
  memberIds: string[],
): Promise<string> {
  const db = getRtdb();
  const uid = currentUserId();
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error('Group name must be between 1 and 80 characters');
  const uniqueMembers = Array.from(new Set(memberIds.filter((id) => id && id !== uid)));
  if (uniqueMembers.length < 1) throw new Error('Select at least one person to join the group');
  if (uniqueMembers.length > 99) throw new Error('Groups can have at most 100 members');

  const profiles = await fetchProfiles(uniqueMembers);
  if (profiles.size !== uniqueMembers.length) {
    throw new Error('One or more selected users are no longer available.');
  }

  const now = new Date().toISOString();
  const participantIds = [uid, ...uniqueMembers].sort();
  const participants: Record<string, boolean> = {};
  participantIds.forEach((id) => {
    participants[id] = true;
  });
  const roles: ConversationDoc['roles'] = { [uid]: 'admin' };
  const joinedAt: ConversationDoc['joinedAt'] = { [uid]: now };
  const lastReadAt: ConversationDoc['lastReadAt'] = { [uid]: now };
  const lastDeliveredAt: ConversationDoc['lastDeliveredAt'] = { [uid]: now };
  uniqueMembers.forEach((id) => {
    roles[id] = 'member';
    joinedAt[id] = now;
    lastReadAt[id] = now;
    lastDeliveredAt[id] = now;
  });

  const conversationRef = push(ref(db, 'conversations'));
  const id = conversationRef.key;
  if (!id) throw new Error('Unable to create the group.');
  await set(conversationRef, {
    isGroup: true,
    title: cleanTitle,
    avatarUrl: null,
    createdBy: uid,
    directKey: null,
    participantIds: participants,
    roles,
    joinedAt,
    lastReadAt,
    lastDeliveredAt,
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
  } satisfies ConversationDoc);
  await update(ref(db), indexUpdatesFor(participantIds, id));
  return id;
}

export async function addGroupMembers(
  conversationId: string,
  memberIds: string[],
): Promise<void> {
  const db = getRtdb();
  const uid = currentUserId();
  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error('That conversation is no longer available.');
  if (!conversation.isGroup) throw new Error('Only groups can add members.');
  if (conversation.roles?.[uid] !== 'admin') {
    throw new Error('Only group admins can add members.');
  }

  const newMembers = Array.from(
    new Set(
      memberIds.filter(
        (id) => id && id !== uid && !participantList(conversation).includes(id),
      ),
    ),
  );
  if (newMembers.length === 0) return;
  if ((participantList(conversation).length || 0) + newMembers.length > 100) {
    throw new Error('Groups can have at most 100 members');
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    [`conversations/${conversationId}/updatedAt`]: now,
  };
  newMembers.forEach((id) => {
    updates[`conversations/${conversationId}/participantIds/${id}`] = true;
    updates[`conversations/${conversationId}/roles/${id}`] = 'member';
    updates[`conversations/${conversationId}/joinedAt/${id}`] = now;
    updates[`conversations/${conversationId}/lastReadAt/${id}`] = now;
    updates[`conversations/${conversationId}/lastDeliveredAt/${id}`] = now;
  });
  await update(ref(db), updates);
  await update(ref(db), indexUpdatesFor(newMembers, conversationId));
}

export async function removeGroupMember(
  conversationId: string,
  userId: string,
): Promise<void> {
  const db = getRtdb();
  const uid = currentUserId();
  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error('That conversation is no longer available.');
  if (!conversation.isGroup) throw new Error('Only group members can be removed.');
  if (conversation.roles?.[uid] !== 'admin') {
    throw new Error('Only group admins can remove members.');
  }
  if (userId === uid) throw new Error('Use leave to exit a group.');
  const remaining = participantList(conversation).filter((id) => id !== userId);
  if (remaining.length === 0) {
    await deleteConversationWithMessages(conversationId);
    return;
  }
  await update(ref(db), {
    [`conversations/${conversationId}/participantIds/${userId}`]: null,
    [`conversations/${conversationId}/roles/${userId}`]: null,
    [`conversations/${conversationId}/joinedAt/${userId}`]: null,
    [`conversations/${conversationId}/lastReadAt/${userId}`]: null,
    [`conversations/${conversationId}/lastDeliveredAt/${userId}`]: null,
    [`conversations/${conversationId}/updatedAt`]: new Date().toISOString(),
  } satisfies Record<string, unknown>);
  await remove(ref(db, `userConversations/${userId}/${conversationId}`));
}

async function deleteConversationWithMessages(conversationId: string): Promise<void> {
  const db = getRtdb();
  const conversation = await getConversation(conversationId);
  if (conversation) {
    const indexRemovals: Record<string, unknown> = {};
    participantList(conversation).forEach((userId) => {
      indexRemovals[`userConversations/${userId}/${conversationId}`] = null;
    });
    await update(ref(db), indexRemovals);
  }
  await update(ref(db), {
    [`conversations/${conversationId}/messages`]: null,
    [`conversations/${conversationId}`]: null,
  });
}

export async function leaveGroup(conversationId: string): Promise<void> {
  const db = getRtdb();
  const uid = currentUserId();
  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error('That conversation is no longer available.');
  if (!conversation.isGroup) return;
  const remaining = participantList(conversation).filter((id) => id !== uid);
  if (remaining.length === 0) {
    await deleteConversationWithMessages(conversationId);
    return;
  }
  await update(ref(db), {
    [`conversations/${conversationId}/participantIds/${uid}`]: null,
    [`conversations/${conversationId}/roles/${uid}`]: null,
    [`conversations/${conversationId}/joinedAt/${uid}`]: null,
    [`conversations/${conversationId}/lastReadAt/${uid}`]: null,
    [`conversations/${conversationId}/lastDeliveredAt/${uid}`]: null,
    [`conversations/${conversationId}/updatedAt`]: new Date().toISOString(),
  } satisfies Record<string, unknown>);
  await remove(ref(db, `userConversations/${uid}/${conversationId}`));
}

export async function updateGroup(
  conversationId: string,
  changes: { title?: string | null; avatarUrl?: string | null },
): Promise<void> {
  const db = getRtdb();
  const uid = currentUserId();
  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error('That conversation is no longer available.');
  if (!conversation.isGroup) throw new Error('That conversation is not a group.');
  if (conversation.roles?.[uid] !== 'admin') {
    throw new Error('Only group admins can update the group.');
  }
  const updates: Record<string, unknown> = {
    [`conversations/${conversationId}/updatedAt`]: new Date().toISOString(),
  };
  if (changes.title !== undefined) {
    const title = (changes.title || '').trim();
    if (!title || title.length > 80) throw new Error('Group name must be between 1 and 80 characters');
    updates[`conversations/${conversationId}/title`] = title;
  }
  if (changes.avatarUrl !== undefined) {
    updates[`conversations/${conversationId}/avatarUrl`] = changes.avatarUrl;
  }
  await update(ref(db), updates);
}

export function subscribeToConversationIds(
  userId: string,
  onChange: (ids: string[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onValue(
    ref(getRtdb(), `userConversations/${userId}`),
    (snapshot) => {
      onChange(Object.keys((snapshot.val() as Record<string, boolean> | null) || {}));
    },
    (error) => onError?.(error as unknown as Error),
  );
}

export function subscribeToMessages(
  conversationId: string,
  onChange: (
    messages: Array<{
      id: string;
      sender_id: string | null;
      content: string | null;
      message_type: string;
      file_name: string | null;
    }>,
  ) => void,
  limitCount = MESSAGE_PAGE_SIZE,
): () => void {
  return onValue(
    query(
      ref(getRtdb(), `conversations/${conversationId}/messages`),
      orderByChild('createdAt'),
      limitToLast(limitCount),
    ),
    (snapshot) => {
      const rows = snapshotEntries<MessageDoc>(snapshot);
      onChange(
        rows.map((row) => ({
          id: row.id,
          sender_id: row.data.senderId || null,
          content: row.data.content || null,
          message_type: String(row.data.messageType || 'text'),
          file_name: row.data.fileName || null,
        })),
      );
    },
    () => undefined,
  );
}

export function claimUsername(
  username: string,
  userId: string,
): Promise<boolean> {
  return runTransaction(ref(getRtdb(), `usernames/${username}`), (current) => {
    const existing = current as { uid?: string } | null;
    if (existing !== null && existing.uid !== userId) return undefined;
    return { uid: userId };
  }).then((result) => result.committed);
}

export function getUserDocRef(userId: string): DatabaseReference {
  return ref(getRtdb(), `users/${userId}`);
}

export async function toggleMessageReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
): Promise<boolean> {
  const db = getRtdb();
  const uid = currentUserId();
  const messageRef = ref(db, `conversations/${conversationId}/messages/${messageId}`);
  const snap = await get(messageRef);
  if (!snap.exists()) throw new Error('That message is no longer available.');
  const reacted = Boolean(
    (snap.val() as MessageDoc)?.reactions?.[emoji]?.[uid],
  );
  await update(ref(db), {
    [`conversations/${conversationId}/messages/${messageId}/reactions/${emoji}/${uid}`]:
      reacted ? null : true,
  } satisfies Record<string, unknown>);
  return !reacted;
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
): Promise<void> {
  const db = getRtdb();
  const uid = currentUserId();
  const snap = await get(
    ref(db, `conversations/${conversationId}/messages/${messageId}`),
  );
  if (!snap.exists()) return;
  const data = snap.val() as MessageDoc;
  if (data.senderId !== uid) throw new Error('You can only delete your own messages.');
  await remove(snap.ref);
}

export function readUserDocOnce(userId: string): Promise<UserDoc | null> {
  return get(ref(getRtdb(), `users/${userId}`)).then((snapshot) =>
    snapshot.exists() ? (snapshot.val() as UserDoc) : null,
  );
}

export async function writeUserDoc(userId: string, doc: UserDoc): Promise<void> {
  await set(ref(getRtdb(), `users/${userId}`), doc);
}

export async function patchUserDoc(
  userId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await update(ref(getRtdb(), `users/${userId}`), fields);
}

export function releaseUsername(username: string): Promise<void> {
  return remove(ref(getRtdb(), `usernames/${username}`));
}

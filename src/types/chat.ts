export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  about: string | null;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at?: string;
}

export interface LastMessage {
  id: string;
  content: string | null;
  message_type: string;
  file_name: string | null;
  sender_id: string | null;
  sender_name: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  title: string | null;
  avatar_url: string | null;
  last_message_at: string;
  created_at: string;
  other_user: Profile | null;
  participant_count: number;
  last_message: LastMessage | null;
  unread_count: number;
}

export interface MessageReceipt {
  user_id: string;
  delivered_at: string | null;
  read_at: string | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  client_id: string | null;
  content: string | null;
  message_type: 'text' | 'image' | 'file' | 'audio' | 'system' | 'call';
  file_path: string | null;
  file_name: string | null;
  file_mime: string | null;
  file_size: number | null;
  recipient_count: number;
  created_at: string;
  sender?: Profile | null;
  receipts: MessageReceipt[];
  reactions?: Record<string, string[]>;
  pending?: boolean;
  failed?: boolean;
  local_file_url?: string;
  file_url?: string;
}

export interface ConversationMember {
  id: string;
  user_id: string;
  role: 'member' | 'admin';
  joined_at: string;
  last_read_at: string;
  last_delivered_at: string;
  profile: Profile;
}

export interface SearchResult {
  message_id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_name: string | null;
  content: string | null;
  message_type: string;
  file_name: string | null;
  created_at: string;
}

export type PresenceMap = Record<
  string,
  {
    user_id: string;
    display_name?: string;
    online_at: string;
  }
>;

export type DeliveryState = 'sent' | 'delivered' | 'read';

export interface RealtimeMessagePayload {
  message: ChatMessage;
}

export interface RealtimeReceiptPayload {
  conversation_id: string;
  user_id: string;
  delivered_at: string | null;
  read_at: string | null;
}

export interface UserDoc {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  about: string | null;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Renamed to UserDoc (Realtime Database storage). */
export type FirestoreProfile = UserDoc;

export function mapProfile(id: string, row: UserDoc): Profile {
  return {
    id,
    username: row.username,
    display_name: row.displayName,
    avatar_url: row.avatarUrl,
    about: row.about,
    is_online: row.isOnline,
    last_seen: row.lastSeen,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const AVATAR_GRADIENTS = [
  'from-emerald-400 to-teal-600',
  'from-sky-400 to-indigo-600',
  'from-fuchsia-400 to-purple-600',
  'from-amber-400 to-orange-600',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-blue-600',
  'from-lime-400 to-green-600',
  'from-violet-400 to-indigo-600',
];

export function gradientForId(id: string | null | undefined): string {
  if (!id) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function isImageType(mime: string | null | undefined): boolean {
  return Boolean(mime?.startsWith('image/'));
}

export function isAudioType(mime: string | null | undefined): boolean {
  return Boolean(mime?.startsWith('audio/'));
}

export function isSameId(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && a === b);
}

export function previewFromMessage(
  content: string | null,
  messageType: string,
  fileName: string | null,
): string {
  if (content?.trim()) return content.replace(/\s+/g, ' ').trim();
  if (messageType === 'image') return 'Photo';
  if (messageType === 'audio') return 'Voice message';
  if (messageType === 'file') return fileName ? `Document: ${fileName}` : 'Document';
  return 'Message';
}

export function safeDecodeURI(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const MAX_MESSAGE_LENGTH = 50000;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_AVATAR_SIZE = 7 * 1024 * 1024;
export const MAX_GROUP_TITLE = 200;
export const MAX_DISPLAY_NAME = 100;
export const MAX_ABOUT = 500;

export const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

export const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

export const AVATAR_MIME_TYPES = IMAGE_MIME_TYPES;

const FILE_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/rtf': 'rtf',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'rtf',
  'mp3',
  'wav',
  'ogg',
  'webm',
  'm4a',
  'mp4',
  'mov',
]);

export interface ValidatedFile {
  file: File;
  mime: string;
  extension: string;
  messageType: 'image' | 'audio' | 'file';
}

export function sanitizeText(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(CONTROL_CHARACTERS, '')
    .replace(/[ \t]+\n/g, '\n');
}

export function sanitizeSearchQuery(value: string): string {
  return value
    .trim()
    .replace(/[%*,()"'\\]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 100);
}

export function sanitizeFileName(value: string): string {
  const cleaned = value
    .normalize('NFKC')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(CONTROL_CHARACTERS, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 180) || 'attachment';
}

export function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].replace(/[^a-z0-9]/g, '');
}

export function validateMessageText(value: string): string | null {
  const cleaned = sanitizeText(value).trim();
  if (!cleaned) return 'Write a message first.';
  if (cleaned.length > MAX_MESSAGE_LENGTH) {
    return `Messages cannot exceed ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.`;
  }
  return null;
}

export function validateFile(file: File): ValidatedFile | string {
  const extension = extensionOf(file.name);
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    return 'This file type is not supported.';
  }
  if (file.size <= 0) return 'The selected file is empty.';
  if (file.size > MAX_FILE_SIZE) return 'Files must be 5 MB or smaller.';

  let mime = file.type.toLowerCase();
  if (!mime || mime === 'application/octet-stream') {
    const match = Object.entries(FILE_TYPES).find(([, ext]) => ext === extension);
    mime = match?.[0] || '';
  }

  const knownMime = Boolean(FILE_TYPES[mime]) || IMAGE_MIME_TYPES.has(mime);
  if (!knownMime) return 'This file type is not supported.';

  const messageType = IMAGE_MIME_TYPES.has(mime)
    ? 'image'
    : mime.startsWith('audio/')
      ? 'audio'
      : mime.startsWith('video/')
        ? 'file'
        : 'file';

  const canonicalExtension = IMAGE_EXTENSIONS[mime] || FILE_TYPES[mime] || extension;

  return { file, mime, extension: canonicalExtension, messageType };
}

export function validateAvatar(file: File): string | null {
  if (!AVATAR_MIME_TYPES.has(file.type.toLowerCase())) {
    return 'Use a JPG, PNG, GIF, or WebP image.';
  }
  if (file.size <= 0) return 'The selected image is empty.';
  if (file.size > MAX_AVATAR_SIZE) return 'Profile photos must be 5 MB or smaller.';
  return null;
}

export function validateUsername(username: string): string | null {
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return 'Username must be 3–30 characters using letters, numbers, or underscores.';
  }
  return null;
}

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_DISPLAY_NAME) {
    return `Display name must be between 1 and ${MAX_DISPLAY_NAME} characters.`;
  }
  return null;
}

export function validateAbout(about: string): string | null {
  if (about.length > MAX_ABOUT) return `About must be ${MAX_ABOUT} characters or fewer.`;
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 72) return 'Password must be 72 characters or fewer.';
  return null;
}

export function validateEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'Enter a valid email address.';
  }
  return null;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

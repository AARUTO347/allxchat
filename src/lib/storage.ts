import {
  validateAvatar,
  validateFile,
  type ValidatedFile,
} from './validation';
import { getAuthInstance } from './firebase';

const FUNCTION_URLS = [
  '/.netlify/functions/b2-sign-upload',
  '/api/b2-sign-upload',
  'https://allxchat.netlify.app/.netlify/functions/b2-sign-upload',
];

const DOWNLOAD_URLS = [
  '/.netlify/functions/b2-sign-download',
  '/api/b2-sign-download',
  'https://allxchat.netlify.app/.netlify/functions/b2-sign-download',
];

const DELETE_URLS = [
  '/.netlify/functions/b2-delete',
  '/api/b2-delete',
  'https://allxchat.netlify.app/.netlify/functions/b2-delete',
];

async function getIdToken(): Promise<string> {
  const user = getAuthInstance().currentUser;
  if (!user) throw new Error('You are not signed in.');
  return user.getIdToken();
}

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json');
}

async function postJson(urls: string[], body: unknown): Promise<Record<string, unknown>> {
  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!isJsonResponse(res)) continue; // SPA fallback answered (no function on this host)
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(String(data.error || `Request failed (${res.status})`));
      }
      return data;
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') throw error;
      lastError = error as Error;
      continue;
    }
  }
  throw lastError || new Error('Unable to reach storage service.');
}

async function sha1Hex(file: File): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return 'do_not_verify';
  }
  try {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-1', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return 'do_not_verify';
  }
}

export function validatedAttachment(file: File): ValidatedFile {
  const result = validateFile(file);
  if (typeof result === 'string') throw new Error(result);
  return result;
}

export async function uploadAttachment(
  file: File,
  conversationId: string,
  _userId: string,
  onProgress?: (percent: number) => void,
): Promise<{ path: string; validated: ValidatedFile }> {
  const validated = validatedAttachment(file);
  const idToken = await getIdToken();

  const sign = await postJson(FUNCTION_URLS, {
    idToken,
    conversationId,
    fileName: file.name,
    fileSize: file.size,
    mime: file.type || 'application/octet-stream',
  });

  const uploadUrl = String(sign.uploadUrl);
  const uploadAuthToken = String(sign.uploadAuthToken);
  const objectKey = String(sign.objectKey);

  const sha1 = await sha1Hex(file);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl, true);
    xhr.setRequestHeader('Authorization', uploadAuthToken);
    xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(objectKey));
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('X-Bz-Content-Sha1', sha1);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.onabort = () => reject(new Error('Upload aborted.'));
    xhr.send(file);
  });

  return { path: `b2:${String(sign.bucketName)}:${objectKey}`, validated };
}

export async function getAttachmentUrl(path: string): Promise<string> {
  if (!path || path.startsWith('data:')) return path;
  // Legacy/base64 or unknown — return as-is.
  if (!path.startsWith('b2:')) return path;
  const idToken = await getIdToken();
  const objectKey = path.split(':').slice(2).join(':');
  const data = await postJson(DOWNLOAD_URLS, {
    idToken,
    objectKey,
    disposition: 'inline',
    fileName: objectKey.split('/').pop() || 'file',
  });
  return String(data.url);
}

export async function getAttachmentDownloadUrl(path: string, fileName: string): Promise<string> {
  if (!path || path.startsWith('data:')) return path;
  if (!path.startsWith('b2:')) return path;
  const idToken = await getIdToken();
  const objectKey = path.split(':').slice(2).join(':');
  const data = await postJson(DOWNLOAD_URLS, {
    idToken,
    objectKey,
    disposition: 'attachment',
    fileName,
  });
  return String(data.url);
}

export async function removeAttachment(path: string): Promise<void> {
  if (!path || !path.startsWith('b2:')) return;
  try {
    const idToken = await getIdToken();
    const objectKey = path.split(':').slice(2).join(':');
    await postJson(DELETE_URLS, { idToken, objectKey });
  } catch {
    // Best-effort cleanup; never throw.
  }
}

export async function uploadAvatar(
  file: File,
  _userId: string,
  _groupId?: string,
): Promise<string> {
  const validationError = validateAvatar(file);
  if (validationError) throw new Error(validationError);
  // Avatars are resized client-side to a data URL to keep them small and
  // instantly available (no signed-URL round trip on every render).
  return resizeImageToDataUrl(file, 1024);
}

// keep resize helpers
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Unable to read the file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to read that image.'));
    img.src = url;
  });
}

async function resizeImageToDataUrl(file: File, maxDim: number, quality = 0.75): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to process that image.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// referenced by uploadAttachment's image branch? Images now go to B2 as files.
// keep readAsDataUrl for any legacy callers.
void readAsDataUrl;

import {
  sanitizeFileName,
  validateAvatar,
  validateFile,
  type ValidatedFile,
} from './validation';

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

async function resizeImageToDataUrl(
  file: File,
  maxDim: number,
  quality = 0.75,
): Promise<string> {
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

export function validatedAttachment(file: File): ValidatedFile {
  const result = validateFile(file);
  if (typeof result === 'string') throw new Error(result);
  return result;
}

export async function uploadAttachment(
  file: File,
  _conversationId: string,
  _userId: string,
): Promise<{ path: string; validated: ValidatedFile }> {
  const validated = validatedAttachment(file);
  const dataUrl = file.type.startsWith('image/')
    ? await resizeImageToDataUrl(file, 2560)
    : await readAsDataUrl(file);
  return { path: dataUrl, validated };
}

export async function getAttachmentUrl(path: string): Promise<string> {
  return path;
}

export async function getAttachmentDownloadUrl(path: string, fileName: string): Promise<string> {
  void sanitizeFileName(fileName);
  return path;
}

export async function removeAttachment(_path: string): Promise<void> {
  // Media lives inside the message payload (Realtime Database) — nothing to clean up.
}

export async function uploadAvatar(
  file: File,
  _userId: string,
  _groupId?: string,
): Promise<string> {
  const validationError = validateAvatar(file);
  if (validationError) throw new Error(validationError);
  return resizeImageToDataUrl(file, 1024);
}

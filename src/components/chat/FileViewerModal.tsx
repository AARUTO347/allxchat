import { useEffect, useState } from 'react';
import { Loader2, Download, Copy, Check } from 'lucide-react';
import { Modal } from '../ui/Primitives';
import { getAttachmentDownloadUrl, getAttachmentUrl } from '../../lib/storage';
import type { ChatMessage } from '../../types/chat';
import toast from 'react-hot-toast';

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'xml', 'yaml', 'yml', 'log',
  'js', 'ts', 'jsx', 'tsx', 'css', 'html', 'htm', 'sql', 'sh', 'py', 'java',
  'c', 'cpp', 'h', 'hpp', 'go', 'rs', 'rb', 'php', 'ini', 'conf', 'toml',
]);

function extensionOf(name: string | null): string {
  const parts = (name || '').toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() || '' : '';
}

function isTextMime(mime: string | null): boolean {
  if (!mime) return false;
  return mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml';
}

function isPdfMime(mime: string | null, ext: string): boolean {
  return mime === 'application/pdf' || ext === 'pdf';
}

function isVideoMime(mime: string | null, ext: string): boolean {
  if (mime?.startsWith('video/')) return true;
  return ['mp4', 'mov', 'webm', 'm4v', 'mkv'].includes(ext);
}

function isAudioMime(mime: string | null, ext: string): boolean {
  if (mime?.startsWith('audio/')) return true;
  return ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'webm'].includes(ext);
}

function isImageMime(mime: string | null): boolean {
  return Boolean(mime?.startsWith('image/'));
}

interface FileViewerModalProps {
  open: boolean;
  onClose: () => void;
  message: ChatMessage | null;
}

export function FileViewerModal({ open, onClose, message }: FileViewerModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const path = message?.file_path || null;
  const mime = message?.file_mime || null;
  const name = message?.file_name || 'Attachment';
  const ext = extensionOf(name);

  useEffect(() => {
    if (!open || !path) {
      setUrl(null);
      setText(null);
      setError(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    setText(null);
    (async () => {
      try {
        const resolved = path.startsWith('data:') ? path : await getAttachmentUrl(path);
        if (!active) return;
        setUrl(resolved);
        const textLike = isTextMime(mime) || TEXT_EXTENSIONS.has(ext);
        if (textLike) {
          // Guard against huge text rendering.
          const size = message?.file_size || 0;
          if (size > 2 * 1024 * 1024) {
            setText(null);
            setError('File is too large to preview. Download it instead.');
            setLoading(false);
            return;
          }
          const res = await fetch(resolved);
          if (!active) return;
          const content = await res.text();
          if (active) setText(content);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Unable to load file.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, path, mime, ext, message?.file_size]);

  const handleDownload = async () => {
    if (!path) return;
    setDownloading(true);
    try {
      const dlUrl = path.startsWith('data:')
        ? path
        : await getAttachmentDownloadUrl(path, name);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = name;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error('Unable to download this file.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = async () => {
    if (text === null) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Unable to copy.');
    }
  };

  const textLike = isTextMime(mime) || TEXT_EXTENSIONS.has(ext);
  const pdf = isPdfMime(mime, ext);
  const video = isVideoMime(mime, ext);
  const audio = isAudioMime(mime, ext);
  const image = isImageMime(mime);

  return (
    <Modal open={open} onClose={onClose} title={name} size="xl">
      <div className="flex max-h-[78dvh] flex-col gap-3 p-3">
        {loading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#667781]" />
          </div>
        )}
        {!loading && error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <span>{error}</span>
          </div>
        )}
        {!loading && !error && url && (
          <>
            {textLike && text !== null && (
              <div className="relative">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-[#54656f] hover:bg-black/10 dark:bg-white/10 dark:text-[#aebac1] dark:hover:bg-white/15"
                  aria-label="Copy text"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
                <pre className="max-h-[68dvh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#f0f2f5] p-4 font-mono text-[12.5px] leading-relaxed text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef]">
                  {text}
                </pre>
              </div>
            )}
            {textLike && text === null && !error && (
              <div className="flex h-40 items-center justify-center text-sm text-[#667781]">
                Loading text…
              </div>
            )}
            {pdf && (
              <iframe
                src={url}
                title={name}
                className="h-[70dvh] w-full rounded-xl border border-black/[0.06] dark:border-white/[0.06]"
              />
            )}
            {video && (
              <video
                src={url}
                controls
                preload="metadata"
                className="max-h-[70dvh] w-full rounded-xl bg-black"
              />
            )}
            {audio && !video && (
              <audio src={url} controls preload="metadata" className="w-full" />
            )}
            {image && !textLike && !pdf && !video && !audio && (
              <img src={url} alt={name} className="max-h-[70dvh] w-auto max-w-full rounded-xl object-contain" />
            )}
            {!textLike && !pdf && !video && !audio && !image && (
              <div className="flex h-40 items-center justify-center text-sm text-[#667781]">
                Preview not available. Use Download.
              </div>
            )}
          </>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || !path}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download
          </button>
        </div>
      </div>
    </Modal>
  );
}

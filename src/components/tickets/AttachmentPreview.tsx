import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Attachment } from '@/types';

type Kind = 'image' | 'pdf' | 'text' | 'other';

function kindOf(contentType: string): Kind {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType.startsWith('text/')) return 'text';
  return 'other';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const EXPIRED = 'This link has expired. Close the ticket and open it again to get a fresh one.';

/**
 * Opens an attachment in place over a blurred backdrop instead of a new tab.
 *
 * PDFs and text are fetched and shown from a blob: devboard-attachments serves
 * everything but images with `Content-Disposition: attachment`, so pointing an
 * iframe at the presigned URL would download the file instead of showing it.
 */
export function AttachmentPreview({ attachment, onClose }: { attachment: Attachment; onClose: () => void }) {
  const kind = kindOf(attachment.contentType);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch PDFs and text; images load straight from the URL.
  useEffect(() => {
    if (kind !== 'pdf' && kind !== 'text') return;
    let cancelled = false;
    let objectUrl: string | null = null;
    fetch(attachment.url)
      .then(async (res): Promise<string | Blob> => {
        if (!res.ok) throw new Error(res.status === 403 ? EXPIRED : `Could not load the file (${res.status}).`);
        return kind === 'text' ? res.text() : res.blob();
      })
      .then(body => {
        if (cancelled) return;
        if (typeof body === 'string') setText(body);
        else setBlobUrl(objectUrl = URL.createObjectURL(new Blob([body], { type: 'application/pdf' })));
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the file.'); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.url, kind]);

  // Capture phase + preventDefault: Esc closes only this preview, not the ticket
  // panel underneath (useDismiss skips events that were already handled).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  const loading = !error && ((kind === 'pdf' && !blobUrl) || (kind === 'text' && text === null));

  return createPortal(
    // data-keep-panel-open: clicks here aren't "outside" the ticket panel, so it stays open.
    <div data-keep-panel-open role="dialog" aria-modal="true" aria-label={attachment.filename}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 p-4 sm:p-8 bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      {/* Top bar */}
      <div className="w-full max-w-5xl flex items-center gap-3 text-white" onClick={e => e.stopPropagation()}>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{attachment.filename}</p>
          <p className="text-xs text-white/60">{formatSize(attachment.size)}</p>
        </div>
        <a href={attachment.url} target="_blank" rel="noreferrer"
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
          {kind === 'image' ? 'Open original' : 'Download'}
        </a>
        <button onClick={onClose} aria-label="Close preview"
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>

      {/* Content: clicks on it don't close; clicks on the backdrop around it do. */}
      <div className="max-w-5xl w-full flex-1 min-h-0 flex items-center justify-center">
        {error ? (
          <p className="px-4 py-3 rounded-lg bg-zinc-900 text-sm text-zinc-200" onClick={e => e.stopPropagation()}>{error}</p>
        ) : loading ? (
          <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-label="Loading" />
        ) : kind === 'image' ? (
          <img src={attachment.url} alt={attachment.filename} onClick={e => e.stopPropagation()}
            onError={() => setError(EXPIRED)}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        ) : kind === 'pdf' && blobUrl ? (
          <iframe src={blobUrl} title={attachment.filename} onClick={e => e.stopPropagation()}
            className="w-full h-full rounded-lg bg-white shadow-2xl" />
        ) : kind === 'text' ? (
          <pre onClick={e => e.stopPropagation()}
            className="w-full max-h-full overflow-auto rounded-lg bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs leading-relaxed font-mono p-4 whitespace-pre-wrap break-words shadow-2xl">
            {text || '(empty file)'}
          </pre>
        ) : (
          <div onClick={e => e.stopPropagation()} className="px-6 py-5 rounded-xl bg-zinc-900 text-center text-zinc-200">
            <p className="text-sm">No preview for this file type.</p>
            <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-indigo-400 hover:underline">Download it</a>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

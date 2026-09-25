import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ApiError } from '@/api/client';
import { AVATAR_IMAGE_TYPES, MAX_ATTACHMENT_SIZE_BYTES, deleteAttachment, publicAttachmentId, uploadPublicImage } from '@/api/attachments';

/** Square-ish mark for a team/project: the uploaded image, or `fallback` (a letter) when unset or broken. */
export function EntityMark({ url, fallback, className, style }: { url?: string; fallback: ReactNode; className: string; style?: CSSProperties }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return (
    <div className={`${className} overflow-hidden flex-shrink-0`} style={style}>
      {url && !failed
        ? <img src={url} alt="" onError={() => setFailed(true)} className="w-full h-full object-cover" />
        : fallback}
    </div>
  );
}

function messageFor(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    const first = err.errors ? Object.values(err.errors).flat()[0] : undefined;
    return first ?? err.detail;
  }
  return err instanceof Error ? err.message : fallback;
}

/**
 * Upload / replace / remove one public image, saved immediately via `onSave`.
 * The previously uploaded file is deleted afterwards; that only succeeds for the
 * user who uploaded it, so failures are ignored.
 */
function useImageUpload(kind: 'avatar' | 'banner', value: string | undefined, onSave: (url: string) => Promise<void>, onError: (msg: string | null) => void) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function replaceWith(url: string) {
    const previousId = publicAttachmentId(value);
    await onSave(url);
    if (previousId && previousId !== publicAttachmentId(url)) deleteAttachment(previousId).catch(() => {});
  }

  async function handleFile(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    onError(null);
    if (!AVATAR_IMAGE_TYPES.includes(file.type)) { onError('Use a PNG, JPEG, WebP or GIF image.'); return; }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) { onError('Image must be 5 MB or smaller.'); return; }

    setBusy(true);
    let uploadedId: string | null = null;
    try {
      const uploaded = await uploadPublicImage(file, kind);
      uploadedId = uploaded.id;
      await replaceWith(uploaded.public_url);
    } catch (err) {
      if (uploadedId) deleteAttachment(uploadedId).catch(() => {});
      onError(messageFor(err, 'Could not upload the image.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    onError(null);
    setBusy(true);
    try {
      await replaceWith('');
    } catch (err) {
      onError(messageFor(err, 'Could not remove the image.'));
    } finally {
      setBusy(false);
    }
  }

  const input = (
    <input ref={inputRef} type="file" accept={AVATAR_IMAGE_TYPES.join(',')} className="hidden"
      onChange={e => void handleFile(e.target.files?.[0])} />
  );
  return { busy, input, pick: () => inputRef.current?.click(), remove };
}

const CameraIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 5.5A1.5 1.5 0 013.5 4h1.3l.9-1.4A1 1 0 016.5 2h3a1 1 0 01.8.6l.9 1.4h1.3A1.5 1.5 0 0114 5.5v6a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-6z" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="8" cy="8.5" r="2.3" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const Spinner = () => (
  <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />
);

interface HeaderProps {
  title: string;
  subtitle?: ReactNode;
  avatarUrl?: string;
  bannerUrl?: string;
  /** Shown in the avatar when there's no image (the colored letter). */
  avatarFallback: ReactNode;
  /** Used for the avatar background and the default cover gradient. */
  accentColor: string;
  canEdit: boolean;
  onSave: (patch: { avatar?: string; banner?: string }) => Promise<void>;
  children?: ReactNode;
}

/**
 * Cover image + overlapping avatar + title, like a GitHub org or LinkedIn page.
 * Editors change either image by hovering it; there is no separate settings form.
 */
export function ProfileHeader({ title, subtitle, avatarUrl, bannerUrl, avatarFallback, accentColor, canEdit, onSave, children }: HeaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [bannerFailed, setBannerFailed] = useState(false);
  useEffect(() => setBannerFailed(false), [bannerUrl]);
  const banner = useImageUpload('banner', bannerUrl, url => onSave({ banner: url }), setError);
  const avatar = useImageUpload('avatar', avatarUrl, url => onSave({ avatar: url }), setError);
  const showBanner = Boolean(bannerUrl) && !bannerFailed;

  const overlayBtn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/55 hover:bg-black/70 backdrop-blur-sm text-white text-xs font-medium transition-colors disabled:opacity-60';

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-8">
      {/* Cover */}
      <div className="relative h-36 sm:h-44 group/cover"
        style={showBanner ? undefined : { background: `linear-gradient(120deg, ${accentColor} 0%, ${accentColor}99 55%, ${accentColor}40 100%)` }}>
        {showBanner && <img src={bannerUrl} alt="" onError={() => setBannerFailed(true)} className="absolute inset-0 w-full h-full object-cover" />}
        {canEdit && (
          <>
            {banner.input}
            <div className={`absolute inset-0 flex items-end justify-end gap-2 p-3 transition-opacity bg-gradient-to-t from-black/25 to-transparent ${
              banner.busy ? 'opacity-100' : 'opacity-0 group-hover/cover:opacity-100 focus-within:opacity-100'}`}>
              {banner.busy ? <Spinner /> : (
                <>
                  {bannerUrl && (
                    <button type="button" onClick={() => void banner.remove()} className={overlayBtn}>Remove</button>
                  )}
                  <button type="button" onClick={banner.pick} className={overlayBtn}>
                    <CameraIcon size={14} />{bannerUrl ? 'Change cover' : 'Add cover'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Avatar + title */}
      <div className="px-5 pb-5">
        {/* Avatar overlaps the cover by half; the title sits below the cover beside it. */}
        <div className="flex items-start gap-4">
          <div className="relative group/avatar flex-shrink-0 -mt-10">
            <EntityMark url={avatarUrl} fallback={avatarFallback}
              className="w-20 h-20 rounded-2xl ring-4 ring-white dark:ring-zinc-900 flex items-center justify-center text-white text-2xl font-bold shadow-sm"
              style={{ backgroundColor: accentColor }} />
            {canEdit && (
              <>
                {avatar.input}
                <button type="button" onClick={avatar.pick} disabled={avatar.busy}
                  aria-label={avatarUrl ? 'Change avatar' : 'Upload avatar'}
                  className={`absolute inset-0 rounded-2xl flex items-center justify-center bg-black/50 text-white transition-opacity ${
                    avatar.busy ? 'opacity-100' : 'opacity-0 group-hover/avatar:opacity-100 focus-visible:opacity-100'}`}>
                  {avatar.busy ? <Spinner /> : <CameraIcon size={20} />}
                </button>
                {avatarUrl && !avatar.busy && (
                  <button type="button" onClick={() => void avatar.remove()} aria-label="Remove avatar" title="Remove avatar"
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-red-500 shadow-sm flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 focus-visible:opacity-100 transition-opacity">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </button>
                )}
              </>
            )}
          </div>
          <div className="min-w-0 pt-3">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 truncate">{title}</h1>
            {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{subtitle}</p>}
          </div>
        </div>
        {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400 mt-3">{error}</p>}
        {children}
      </div>
    </div>
  );
}

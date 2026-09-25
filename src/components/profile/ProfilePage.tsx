import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '@/api/client';
import { getMe, updateMe, type CoreUser } from '@/api/users';
import { AVATAR_IMAGE_TYPES, MAX_ATTACHMENT_SIZE_BYTES, deleteAttachment, publicAttachmentId, uploadPublicImage } from '@/api/attachments';
import { colorFor, initialsFor } from '@/lib/avatar';
import { LoadingState, ErrorState } from '@/components/ui/LoadingState';

interface Props {
  /** Called with the saved profile so the rest of the app (avatar in the sidebar) updates without a reload. */
  onSaved: (profile: CoreUser) => void;
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow';

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
      <p className="text-sm text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}

function messageFor(err: unknown) {
  if (err instanceof ApiError) {
    // DRF puts the per-field reason in `errors`; `detail` can be a generic summary.
    const first = err.errors ? Object.values(err.errors).flat()[0] : undefined;
    return first ?? err.detail;
  }
  return err instanceof Error ? err.message : 'Could not save your profile.';
}

export function ProfilePage({ onSaved }: Props) {
  const [profile, setProfile] = useState<CoreUser | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [avatarBusy, setAvatarBusy] = useState<'uploading' | 'removing' | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoadError(null);
    getMe()
      .then(p => { setProfile(p); setTimezone(p.timezone); })
      .catch(err => setLoadError(messageFor(err)));
  }, [reloadToken]);

  // The backend stores timezone as free text, so constrain it to real IANA names.
  // The saved value is always included, in case the browser's list doesn't have it.
  const timezones = useMemo(() => {
    // Not in this project's TypeScript lib target, but present in every current browser.
    const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    const all = supportedValuesOf ? supportedValuesOf('timeZone') : [];
    return profile && !all.includes(profile.timezone) ? [profile.timezone, ...all] : all;
  }, [profile]);

  if (loadError) return <ErrorState message={loadError} onRetry={() => setReloadToken(t => t + 1)} />;
  if (!profile) return <LoadingState />;

  const dirty = timezone !== profile.timezone;

  // Saves the avatar straight away (no Save button), then deletes the previously
  // uploaded file. A failed delete only leaves an orphan in storage, so it's ignored.
  async function applyAvatar(url: string) {
    const previousId = publicAttachmentId(profile!.avatar);
    const updated = await updateMe({ avatar: url });
    setProfile(updated);
    onSaved(updated);
    if (previousId && previousId !== publicAttachmentId(url)) deleteAttachment(previousId).catch(() => {});
  }

  async function handleAvatarFile(file: File | undefined) {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    setAvatarError(null);
    if (!AVATAR_IMAGE_TYPES.includes(file.type)) { setAvatarError('Use a PNG, JPEG, WebP or GIF image.'); return; }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) { setAvatarError('Image must be 5 MB or smaller.'); return; }

    setAvatarBusy('uploading');
    let uploadedId: string | null = null;
    try {
      const uploaded = await uploadPublicImage(file, 'avatar');
      uploadedId = uploaded.id;
      await applyAvatar(uploaded.public_url);
    } catch (err) {
      // Uploaded but not saved to the profile: don't leave it behind.
      if (uploadedId) deleteAttachment(uploadedId).catch(() => {});
      setAvatarError(messageFor(err));
    } finally {
      setAvatarBusy(null);
    }
  }

  async function handleAvatarRemove() {
    setAvatarError(null);
    setAvatarBusy('removing');
    try {
      await applyAvatar('');
    } catch (err) {
      setAvatarError(messageFor(err));
    } finally {
      setAvatarBusy(null);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await updateMe({ timezone });
      setProfile(updated);
      setTimezone(updated.timezone);
      setSaved(true);
      onSaved(updated);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Profile settings</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Your account details</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <ReadOnlyField label="Username" value={profile.username} />
            <ReadOnlyField label="Email" value={profile.email} />
            <ReadOnlyField label="Account role" value={profile.role} />
            <ReadOnlyField label="Member since" value={profile.created_at.slice(0, 10)} />
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-4">Username and email can't be changed here.</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Avatar</p>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold text-white overflow-hidden flex-shrink-0"
              style={{ backgroundColor: colorFor(profile.username) }}>
              {profile.avatar
                ? <img src={profile.avatar} alt="Your avatar" className="w-full h-full object-cover" />
                : initialsFor(profile.username)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept={AVATAR_IMAGE_TYPES.join(',')} className="hidden"
                  onChange={e => void handleAvatarFile(e.target.files?.[0])} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarBusy !== null}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition-colors">
                  {avatarBusy === 'uploading' ? 'Uploading…' : profile.avatar ? 'Change photo' : 'Upload photo'}
                </button>
                {profile.avatar && (
                  <button type="button" onClick={() => void handleAvatarRemove()} disabled={avatarBusy !== null}
                    className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60 transition-colors">
                    {avatarBusy === 'removing' ? 'Removing…' : 'Remove'}
                  </button>
                )}
              </div>
              {avatarError ? (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1.5">{avatarError}</p>
              ) : (
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5">PNG, JPEG, WebP or GIF, up to 5 MB.</p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={e => void handleSave(e)} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Timezone</label>
            <select id="timezone" value={timezone} onChange={e => { setTimezone(e.target.value); setSaved(false); }} className={inputCls}>
              {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400">{error}</div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving || !dirty}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

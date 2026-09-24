import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/api/client';
import { getMe, updateMe, type CoreUser } from '@/api/users';
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
  const [avatar, setAvatar] = useState('');
  const [timezone, setTimezone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setLoadError(null);
    getMe()
      .then(p => { setProfile(p); setAvatar(p.avatar); setTimezone(p.timezone); })
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

  const avatarTrimmed = avatar.trim();
  const avatarInvalid = avatarTrimmed !== '' && !avatarTrimmed.startsWith('https://');
  const dirty = avatarTrimmed !== profile.avatar || timezone !== profile.timezone;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (avatarInvalid || !dirty) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await updateMe({ avatar: avatarTrimmed, timezone });
      setProfile(updated);
      setAvatar(updated.avatar);
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

        <form onSubmit={e => void handleSave(e)} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <div>
            <label htmlFor="avatar" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Avatar URL</label>
            <input id="avatar" type="url" value={avatar} onChange={e => { setAvatar(e.target.value); setSaved(false); }}
              placeholder="https://example.com/me.png" className={inputCls} />
            {avatarInvalid ? (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1">Use an https:// link.</p>
            ) : (
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Link to an image; leave empty to use your initials.</p>
            )}
          </div>

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
            <button type="submit" disabled={saving || !dirty || avatarInvalid}
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

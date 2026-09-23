// Deterministic initials + color for a user who has no `name`/`initials`/`color`
// field on the backend — only `username`. Ported 1:1 from devboard-web's
// accounts/templatetags/ui_extras.py so the same person gets the same color
// across both frontends without either one storing it anywhere.

const AVATAR_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

export function colorFor(name: string): string {
  const key = name || '?';
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function initialsFor(name: string): string {
  const parts = name.replace(/[._]/g, ' ').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

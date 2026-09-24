import type { EpicSummary } from '@/types';
import { colorFor } from '@/lib/avatar';

/** Small colored chip showing which epic a ticket is scoped under — same deterministic coloring used for avatars. */
export function EpicTag({ epic }: { epic: EpicSummary }) {
  const color = colorFor(epic.id);
  return (
    <span title={epic.title}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
      style={{ backgroundColor: color + '1c', color }}>
      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true"><path d="M4 0l4 4-4 4-4-4z" /></svg>
      {epic.key}
    </span>
  );
}

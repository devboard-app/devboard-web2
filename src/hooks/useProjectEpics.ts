import { useCallback, useEffect, useState } from 'react';
import type { EpicSummary } from '@/types';
import { listTickets } from '@/api/tickets';

/** All epic-type tickets in a project, for populating the "Epic" picker on a ticket. */
export function useProjectEpics(teamId: string, projectId: string) {
  const [epics, setEpics] = useState<EpicSummary[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listTickets(teamId, projectId, { type: 'epic' })
      .then(page => { if (!cancelled) setEpics(page.results.map(t => ({ id: t.id, key: t.key, title: t.title }))); })
      .catch(() => { /* Non-critical: the Epic picker just stays empty. */ });
    return () => { cancelled = true; };
  }, [teamId, projectId, reloadToken]);

  const refetch = useCallback(() => setReloadToken(t => t + 1), []);

  return { epics, refetch };
}

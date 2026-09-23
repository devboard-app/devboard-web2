import { useCallback, useEffect, useState } from 'react';
import type { Label } from '@/types';
import {
  listProjectLabels, createProjectLabel as apiCreateLabel, updateProjectLabel as apiUpdateLabel,
  deleteProjectLabel as apiDeleteLabel,
} from '@/api/labels';

export function useProjectLabels(teamId: string, projectId: string) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listProjectLabels(teamId, projectId)
      .then(page => { if (!cancelled) setLabels(page.results.map(l => ({ id: l.id, name: l.name, color: l.color }))); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load labels'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [teamId, projectId, reloadToken]);

  const refetch = useCallback(() => setReloadToken(t => t + 1), []);

  // LEAD-only server-side; a CONTRIBUTOR calling these gets a 403 ApiError.
  async function createLabel(name: string, color?: string) {
    await apiCreateLabel(teamId, projectId, name, color);
    refetch();
  }

  async function updateLabel(labelId: string, patch: { name?: string; color?: string }) {
    await apiUpdateLabel(teamId, projectId, labelId, patch);
    refetch();
  }

  async function deleteLabel(labelId: string) {
    await apiDeleteLabel(teamId, projectId, labelId);
    refetch();
  }

  return { labels, loading, error, createLabel, updateLabel, deleteLabel };
}

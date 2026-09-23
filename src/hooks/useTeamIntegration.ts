import { useEffect, useState } from 'react';
import {
  getIntegration, createIntegration, updateIntegration,
  type TeamIntegration, type IntegrationPatch,
} from '@/api/integrations';
import { ApiError } from '@/api/client';

/**
 * A team has at most one integration row, created lazily: GET is 404 until the
 * first save, which must be a POST; every later save is a PATCH.
 */
export function useTeamIntegration(teamId: string, enabled: boolean) {
  const [integration, setIntegration] = useState<TeamIntegration | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getIntegration(teamId)
      .then(found => { if (!cancelled) setIntegration(found); })
      .catch(err => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setIntegration(null);
        else setError(err instanceof Error ? err.message : 'Failed to load integrations');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [teamId, enabled]);

  /** Throws the ApiError so the calling card can show it next to its own controls. */
  async function save(patch: IntegrationPatch) {
    const saved = integration ? await updateIntegration(teamId, patch) : await createIntegration(teamId, patch);
    setIntegration(saved);
  }

  return { integration, loading, error, save };
}

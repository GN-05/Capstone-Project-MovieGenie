import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client.js';

// Answers worth keeping while the app is open (lists that do not change,
// such as the genres): path -> data. Saves a request on every page visit.
const kept = new Map();

// Loads one GET route and owns its data, loading and error state.
// With keep, the answer is remembered and reused the next time.
export function useApi(path, keep = false) {
  const saved = keep ? kept.get(path) : undefined;
  const [data, setData] = useState(saved ?? null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!saved);

  const load = useCallback(() => {
    if (keep && kept.has(path)) {
      setData(kept.get(path));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch(path)
      .then(result => {
        if (keep) kept.set(path, result);
        setData(result);
      }, setError)
      .finally(() => setLoading(false));
  }, [path, keep]);

  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load };
}

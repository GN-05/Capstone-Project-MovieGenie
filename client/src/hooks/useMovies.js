import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client.js';
import { addNewMovies } from '../utils/movies.js';

// What each list has loaded so far, kept while the app is open:
// path -> { movies, page, totalPages, scrollY }
// It lets the Back button return to the same list, at the same place.
const cache = new Map();

export function rememberScroll(path) {
  const saved = cache.get(path);
  if (saved) saved.scrollY = window.scrollY;
}

export function savedScroll(path) {
  return cache.get(path)?.scrollY ?? 0;
}

// Loads a list of movies page by page, for infinite scrolling.
// path is a list route such as '/api/movies/trending' or
// '/api/movies/search?q=dune'.
export function useMovies(path) {
  const saved = cache.get(path);
  const [movies, setMovies] = useState(saved ? saved.movies : []);
  const [page, setPage] = useState(saved ? saved.page : 1);
  const [totalPages, setTotalPages] = useState(saved ? saved.totalPages : 1);
  const [status, setStatus] = useState(saved ? 'ready' : 'loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // this page is already loaded: nothing to fetch
    const known = cache.get(path);
    if (known && known.page >= page) return;

    // if this effect is replaced before the answer arrives, drop the answer
    let ignore = false;
    const joiner = path.includes('?') ? '&' : '?';

    async function load() {
      setStatus('loading');
      try {
        const data = await apiFetch(`${path}${joiner}page=${page}`);
        if (ignore) return;
        const shown = known ? known.movies : [];
        const next = addNewMovies(shown, data.results);
        cache.set(path, {
          movies: next, page, totalPages: data.totalPages, scrollY: 0,
        });
        setMovies(next);
        setTotalPages(data.totalPages);
        setStatus('ready');
      } catch {
        if (!ignore) setStatus('error');
      }
    }
    load();

    return () => { ignore = true; };
  }, [path, page, attempt]);

  const loadMore = useCallback(() => setPage(p => p + 1), []);
  const retry = useCallback(() => setAttempt(a => a + 1), []);

  return { movies, status, hasMore: page < totalPages, loadMore, retry };
}

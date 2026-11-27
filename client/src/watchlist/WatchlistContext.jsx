import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

// The watchlist is needed all over the app: the cards ("saved?"), the
// watchlist page and the genie. So it lives in one provider.
const WatchlistContext = createContext(null);

// What an item will look like after a change, before the server confirms.
// Same rule as the server: not watched means no rating and no date.
function preview(item, changes) {
  const next = { ...item, ...changes };
  if (changes.watched === false) {
    next.rating = null;
    next.watchedAt = null;
  }
  if (changes.watched === true && !item.watched) {
    next.watchedAt = new Date().toISOString();
  }
  return next;
}
export const useWatchlist = () => useContext(WatchlistContext);

export function WatchlistProvider({ children }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');   // loading | ready | error
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  // Load the list at login, and again whenever the account changes or the
  // user asks to try again.
  useEffect(() => {
    // The previous account's list must never stay on screen.
    setItems([]);
    setError('');
    setStatus('loading');
    if (!token) return;

    // An answer that arrives after the account changed is dropped, so one
    // user's list can never land in another user's session.
    let ignore = false;

    async function load() {
      try {
        const list = await apiFetch('/api/watchlist');
        if (ignore) return;
        setItems(list);
        setStatus('ready');
      } catch (err) {
        if (ignore) return;
        setError(err.message);
        setStatus('error');
      }
    }
    load();

    return () => { ignore = true; };
  }, [token, attempt]);

  // lets a screen offer "Try again" instead of asking for a page refresh
  const reload = useCallback(() => setAttempt(a => a + 1), []);

  // The three changes below are optimistic: the screen changes at once, the
  // request runs behind it, and the server's answer replaces the guess.
  // If the request fails, the old state comes back and the error is thrown
  // so the button can show it.

  // movie is the card's movie: enough to show it before the server answers
  async function addItem(movie, watched) {
    const now = new Date().toISOString();
    const draft = {
      _id: `draft-${movie.tmdbId}`,
      tmdbId: movie.tmdbId,
      title: movie.title,
      posterPath: movie.posterPath ?? '',
      releaseYear: movie.releaseYear ?? null,
      voteAverage: movie.voteAverage ?? 0,
      watched,
      rating: null,
      watchedAt: watched ? now : null,
      createdAt: now,
      pending: true,   // no real _id yet: it cannot be edited or removed
    };
    setItems(prev => [draft, ...prev]);
    try {
      const item = await apiFetch('/api/watchlist', {
        method: 'POST', body: JSON.stringify({ tmdbId: movie.tmdbId, watched }),
      });
      setItems(prev => prev.map(i => i._id === draft._id ? item : i));
    } catch (err) {
      setItems(prev => prev.filter(i => i._id !== draft._id));
      throw err;
    }
  }

  async function updateItem(id, changes) {
    const before = items.find(i => i._id === id);
    setItems(prev => prev.map(i => i._id === id ? preview(i, changes) : i));
    try {
      const item = await apiFetch(`/api/watchlist/${id}`, {
        method: 'PATCH', body: JSON.stringify(changes),
      });
      setItems(prev => prev.map(i => i._id === id ? item : i));
    } catch (err) {
      setItems(prev => prev.map(i => i._id === id ? before : i));
      throw err;
    }
  }

  async function removeItem(id) {
    const index = items.findIndex(i => i._id === id);
    const before = items[index];
    setItems(prev => prev.filter(i => i._id !== id));
    try {
      await apiFetch(`/api/watchlist/${id}`, { method: 'DELETE' });
    } catch (err) {
      // put it back where it was
      setItems(prev => [...prev.slice(0, index), before, ...prev.slice(index)]);
      throw err;
    }
  }

  const value = {
    items, status, error, reload, addItem, updateItem, removeItem,
  };
  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

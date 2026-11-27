import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Bookmark, Eye, Check } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useWatchlist } from '../watchlist/WatchlistContext.jsx';

// Two buttons that save a movie to the watchlist: "To watch" and "Watched".
// Once saved, the chosen one turns green: clicking it again removes the
// movie, clicking the other one moves it. large is for the movie page.
//
// The watchlist changes at once (see WatchlistContext); while the request
// runs, both buttons wait, so a double click cannot send two requests.
export default function SaveButton({ movie, large = false }) {
  const { token } = useAuth();
  const { items, addItem, updateItem, removeItem } = useWatchlist();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const size = large ? 20 : 16;
  const group = large ? 'save-buttons save-buttons--large' : 'save-buttons';

  if (!token) {
    return (
      <div className={group}>
        <Link to="/login" className="save-button"
          aria-label={`Log in to save ${movie.title}`}>
          <Plus size={size} aria-hidden="true" /> Log in to save
        </Link>
      </div>
    );
  }

  const saved = items.find(item => item.tmdbId === movie.tmdbId);
  const waiting = busy || !!saved?.pending;

  async function choose(watched) {
    if (waiting) return;
    setBusy(true);
    setError('');
    try {
      if (!saved) await addItem(movie, watched);
      else if (saved.watched === watched) await removeItem(saved._id);
      else await updateItem(saved._id, { watched });
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  // one of the two buttons
  function choiceButton(watched, Icon, text) {
    const on = saved?.watched === watched;
    let className = 'save-button';
    if (on) className += ' save-button--on';
    else if (saved) className += ' save-button--other';

    let label = `Save ${movie.title} as ${text}`;
    if (on) label = `Remove ${movie.title} from your watchlist`;
    else if (saved) label = `Move ${movie.title} to ${text}`;

    return (
      <button key={text} type="button" className={className} onClick={() => choose(watched)}
        disabled={waiting} aria-busy={waiting} aria-pressed={on}
        aria-label={label} title={label}>
        {on
          ? <Check size={size} aria-hidden="true" />
          : <Icon size={size} aria-hidden="true" />}
        {text}
      </button>
    );
  }

  return (
    <div className={group}>
      {choiceButton(false, Bookmark, 'To watch')}
      {choiceButton(true, Eye, 'Watched')}
      {error && <small role="alert" className="error">{error}</small>}
    </div>
  );
}

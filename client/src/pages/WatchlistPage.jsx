import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Wand2, Trash2, Eye, EyeOff, ArrowUpDown } from 'lucide-react';
import { useWatchlist } from '../watchlist/WatchlistContext.jsx';
import Poster from '../components/Poster.jsx';
import StarRating from '../components/StarRating.jsx';
import LoadError from '../components/LoadError.jsx';
import SearchField from '../components/SearchField.jsx';
import {
  sortWatchlist, filterByTitle, truncate, WATCHLIST_SORTS,
} from '../utils/movies.js';

const FILTERS = [
  { name: '', label: 'All' },
  { name: 'to-watch', label: 'To watch' },
  { name: 'watched', label: 'Watched' },
];

function WatchlistCard({ item, removing, onUpdate, onRemove }) {
  // The screen changes at once (see WatchlistContext), but while a change is
  // being saved every button of the card waits: a second click cannot be
  // sent before the first one is answered. A movie still being saved has
  // no id yet, so it waits too.
  const [busy, setBusy] = useState(false);
  const waiting = busy || item.pending;

  async function run(action) {
    if (waiting) return;
    setBusy(true);
    await action();
    setBusy(false);
  }

  const change = changes => run(() => onUpdate(item._id, changes));
  const remove = () => run(() => onRemove(item._id));

  const label = item.watched
    ? `Mark ${item.title} as not watched`
    : `Mark ${item.title} as watched`;

  return (
    <li className="movie-card">
      <Link to={`/movie/${item.tmdbId}`} className="movie-card-poster">
        <Poster path={item.posterPath} title={item.title} />
      </Link>
      <div className="movie-card-body">
        <div className="movie-card-head">
          <h3>
            <Link to={`/movie/${item.tmdbId}`}>{truncate(item.title, 40)}</Link>
            {item.releaseYear && <small> ({item.releaseYear})</small>}
          </h3>
          <button type="button" className="round-button round-button--plain"
            onClick={remove} disabled={waiting || removing}
            aria-busy={waiting || removing}
            aria-label={`Remove ${item.title} from your watchlist`}
            title="Remove from your watchlist">
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>

        {/* the round button switches between watched and not watched */}
        <div className="watch-toggle">
          <button type="button" aria-label={label} title={label}
            aria-pressed={item.watched} disabled={waiting} aria-busy={waiting}
            onClick={() => change({ watched: !item.watched })}
            className={item.watched
              ? 'round-button round-button--saved'
              : 'round-button round-button--off'}>
            {item.watched
              ? <Eye size={20} aria-hidden="true" />
              : <EyeOff size={20} aria-hidden="true" />}
          </button>
          {item.watched ? 'Watched' : 'Not watched yet'}
        </div>

        {/* only a watched movie can be rated */}
        {item.watched ? (
          <StarRating value={item.rating} disabled={waiting}
            onChange={rating => change({ rating })} />
        ) : (
          <small>Watch it to rate it</small>
        )}
      </div>
    </li>
  );
}

export default function WatchlistPage() {
  const {
    items, status, error: loadError, reload, updateItem, removeItem,
  } = useWatchlist();
  const [error, setError] = useState('');

  // A removed card leaves the grid at once and the next one slides into its
  // place, under the mouse. So while one removal is being saved, every
  // remove button waits: a double click cannot delete the neighbour too.
  const [removing, setRemoving] = useState(false);

  async function remove(id) {
    if (removing) return;
    setRemoving(true);
    await attempt(() => removeItem(id));
    setRemoving(false);
  }

  // the filter and the order live in the address, like
  // /watchlist?show=watched&sort=rating-high, so Back returns to them
  const [params, setParams] = useSearchParams();
  const filter = params.get('show') ?? '';
  const sort = params.get('sort') ?? '';
  const search = params.get('q') ?? '';

  // replace: typing a word should not add one Back step per letter
  function setChoice(name, value, replace = false) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace });
  }

  // one place reports a failed change
  async function attempt(action) {
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.message);
    }
  }

  if (status === 'loading') return <p className="notice">Loading your watchlist…</p>;
  if (status === 'error') {
    return (
      <LoadError message={`Could not load your watchlist. ${loadError}`}
        onRetry={reload} />
    );
  }

  // the section (All / To watch / Watched), then the search, then the order
  const inSection = items.filter(item =>
    filter === '' || item.watched === (filter === 'watched'));
  const shown = sortWatchlist(filterByTitle(inSection, search),
    sort || 'added-new');

  return (
    <>
      <div className="page-head">
        <h1>Your watchlist ({items.length})</h1>
        {items.length > 0 && (
          <Link to="/genie" className="button">
            <Wand2 size={18} aria-hidden="true" /> Ask the Genie
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card">
          <p>Your watchlist is empty. Add some movies to get started!</p>
          <Link to="/" className="button">Browse movies</Link>
        </div>
      ) : (
        <>
          <div className="list-controls">
            <div className="chips">
              {FILTERS.map(f => (
                <button key={f.name} type="button"
                  onClick={() => setChoice('show', f.name)}
                  className={filter === f.name ? 'chip chip--on' : 'chip'}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="sort">
              <ArrowUpDown size={18} aria-hidden="true" />
              <select value={sort} aria-label="Sort your watchlist"
                onChange={e => setChoice('sort', e.target.value)}>
                {WATCHLIST_SORTS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <SearchField value={search} label="Search your watchlist"
            onChange={text => setChoice('q', text, true)} />

          {error && <p role="alert" className="error">{error}</p>}
          {shown.length === 0 && (
            <p className="notice">
              {search ? `Nothing here matches "${search}".` : 'Nothing here yet.'}
            </p>
          )}

          <ul className="movie-grid">
            {shown.map(item => (
              <WatchlistCard key={item._id} item={item}
                onUpdate={(id, changes) => attempt(() => updateItem(id, changes))}
                removing={removing}
                onRemove={remove} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

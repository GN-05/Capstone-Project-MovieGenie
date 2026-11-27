import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wand2, ArrowLeft, Check, Library, ArrowUpDown } from 'lucide-react';
import { apiFetch } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useWatchlist } from '../watchlist/WatchlistContext.jsx';
import { useGenie } from '../genie/GenieContext.jsx';
import Poster from '../components/Poster.jsx';
import StarRating from '../components/StarRating.jsx';
import MovieCard from '../components/MovieCard.jsx';
import LoadError from '../components/LoadError.jsx';
import SearchField from '../components/SearchField.jsx';
import {
  truncate, sortWatchlist, filterByTitle, WATCHLIST_SORTS,
} from '../utils/movies.js';

const MAX_SEEDS = 10;
const THIS_YEAR = new Date().getFullYear();

// an empty field means "no filter": send null, otherwise a number
function toNumber(value) {
  return value === '' ? null : Number(value);
}

function validate(form) {
  const from = toNumber(form.yearFrom);
  const to = toNumber(form.yearTo);
  if (from && to && from > to) return 'The era must start before it ends';
  return '';
}

// ---- step 1: choose what the genie works from ----

function SeedCard({ item, picked, disabled, onToggle }) {
  return (
    <li className={picked ? 'movie-card movie-card--picked' : 'movie-card'}>
      <button type="button" className="movie-card-poster" disabled={disabled}
        onClick={() => onToggle(item.tmdbId)} aria-pressed={picked}
        aria-label={`${picked ? 'Unpick' : 'Pick'} ${item.title}`}>
        <Poster path={item.posterPath} title={item.title} />
      </button>
      <div className="movie-card-body">
        <div className="movie-card-head">
          <h3>{truncate(item.title, 40)}</h3>
          {picked && (
            <span className="round-button round-button--saved" aria-hidden="true">
              <Check size={20} />
            </span>
          )}
        </div>
        <StarRating value={item.rating} />
      </div>
    </li>
  );
}

// the short tip in the bar changes with what the user can do next
function hint(count) {
  if (count === 0) return 'Tap a poster to pick it';
  if (count >= MAX_SEEDS) return 'That’s the limit. Unpick one to choose another';
  return 'Tap again to unpick';
}

function ChooseStep({
  items, seedIds, order, onOrder, search, onSearch, onToggle, onWhole, onContinue,
}) {
  const shown = sortWatchlist(filterByTitle(items, search), order);
  const count = seedIds.length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ask the Genie</h1>
          <p className="lead">
            Pick up to {MAX_SEEDS} movies you’ve watched, and the genie will
            find ones like them.
          </p>
        </div>
        <button type="button" className="button button--quiet" onClick={onWhole}>
          <Library size={18} aria-hidden="true" /> Use my whole watchlist
        </button>
      </div>

      <div className="list-controls">
        <SearchField value={search} onChange={onSearch}
          label="Search your watched movies" />
        <div className="sort">
          <ArrowUpDown size={18} aria-hidden="true" />
          <select value={order} aria-label="Sort your watched movies"
            onChange={e => onOrder(e.target.value)}>
            {WATCHLIST_SORTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {shown.length === 0 && (
        <p className="notice">No watched movie matches "{search}".</p>
      )}

      <ul className="movie-grid">
        {shown.map(item => (
          <SeedCard key={item._id} item={item}
            picked={seedIds.includes(item.tmdbId)}
            disabled={!seedIds.includes(item.tmdbId)
              && seedIds.length >= MAX_SEEDS}
            onToggle={onToggle} />
        ))}
      </ul>

      {/* stays at the bottom of the screen while the posters scroll */}
      <div className="action-bar">
        <div className="action-bar-text" aria-live="polite">
          <strong>{count} of {MAX_SEEDS} picked</strong>
          <small>{hint(count)}</small>
        </div>
        <button type="button" className="button"
          disabled={count === 0} onClick={onContinue}>
          Continue
        </button>
      </div>
    </>
  );
}

// ---- step 2: narrow it down ----

function FilterStep({ whole, count, genres, form, error, busy, onChange, onBack, onSubmit }) {
  return (
    <form className="card card--narrow" onSubmit={onSubmit} noValidate>
      <button type="button" className="link-button" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" /> Back
      </button>
      <h1>{whole ? 'What do you feel like watching?' : 'Narrow it down'}</h1>
      <p>
        {whole
          ? `The genie will use your ${MAX_SEEDS} best rated watched movies of the genre you choose.`
          : `The genie will use the ${count} movie${count === 1 ? '' : 's'} you picked. Every field is optional.`}
      </p>

      <div className="form">
        <label htmlFor="genreId">Genre</label>
        <select id="genreId" name="genreId" value={form.genreId} onChange={onChange}>
          <option value="">Any genre</option>
          {genres?.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <label htmlFor="yearFrom">Released from</label>
        <input id="yearFrom" name="yearFrom" type="number" min="1900"
          max={THIS_YEAR} placeholder="1990" value={form.yearFrom}
          onChange={onChange} />

        <label htmlFor="yearTo">Released up to</label>
        <input id="yearTo" name="yearTo" type="number" min="1900"
          max={THIS_YEAR} placeholder={THIS_YEAR} value={form.yearTo}
          onChange={onChange} />

        <label htmlFor="minRating">Minimum TMDB rating (0 to 10)</label>
        <input id="minRating" name="minRating" type="number" min="0" max="10"
          step="0.5" placeholder="6.5" value={form.minRating}
          onChange={onChange} />

        {error && <p role="alert" className="error">{error}</p>}
        <button className="button" disabled={busy}>
          <Wand2 size={18} aria-hidden="true" />
          {busy ? 'The genie is thinking…' : 'Get my picks'}
        </button>
      </div>
    </form>
  );
}

// ---- step 3: the picks ----

function ResultStep({ picks, seedTitles, onAgain }) {
  return (
    <>
      <div className="page-head">
        <h1>Your picks</h1>
        <button type="button" className="button" onClick={onAgain}>
          <Wand2 size={18} aria-hidden="true" /> Ask again
        </button>
      </div>
      <p>Based on: {seedTitles.join(', ')}</p>

      {picks.length === 0 ? (
        <p className="notice">Nothing matched. Loosen the filters and ask again.</p>
      ) : (
        <div className="movie-grid">
          {picks.map(pick => (
            <MovieCard key={pick.tmdbId} movie={pick}>
              <p className="match">Match {Math.round(pick.score * 100)}%</p>
              <ul className="reasons">
                {pick.reasons.map(reason => <li key={reason}>{reason}</li>)}
              </ul>
            </MovieCard>
          ))}
        </div>
      )}
    </>
  );
}

// ---- the page: shows one step at a time ----

export default function GeniePage() {
  const {
    items, status: listStatus, error: loadError, reload,
  } = useWatchlist();
  const watched = items.filter(item => item.watched);
  const { data: genres } = useApi('/api/movies/genres', true);

  // the progress of the ask is shared state, kept by GenieProvider
  const {
    step, setStep, whole, setWhole, seedIds, setSeedIds,
    form, setForm, answer, setAnswer, reset,
  } = useGenie();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState('');   // '' is latest added
  const [search, setSearch] = useState('');

  // The picks are kept while the user visits other pages, and meanwhile a
  // picked movie can be removed or marked not watched. Only the picks that
  // are still watched movies count, so the genie never gets a stale one.
  const picked = seedIds.filter(id => watched.some(item => item.tmdbId === id));

  function toggleSeed(tmdbId) {
    if (picked.includes(tmdbId)) {
      setSeedIds(picked.filter(id => id !== tmdbId));
    } else if (picked.length < MAX_SEEDS) {
      setSeedIds([...picked, tmdbId]);
    }
  }

  function goToFilters(useWhole) {
    setWhole(useWhole);
    setError('');
    setStep('filters');
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const problem = validate(form);
    setError(problem);
    if (problem) return;

    setBusy(true);
    try {
      const data = await apiFetch('/api/genie', {
        method: 'POST',
        body: JSON.stringify({
          wholeWatchlist: whole,
          seedTmdbIds: whole ? [] : picked,
          genreId: toNumber(form.genreId),
          yearFrom: toNumber(form.yearFrom),
          yearTo: toNumber(form.yearTo),
          minRating: toNumber(form.minRating),
        }),
      });
      setAnswer(data);
      setStep('results');
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  if (listStatus === 'loading') return <p className="notice">Loading your watchlist…</p>;
  if (listStatus === 'error') {
    return (
      <LoadError message={`Could not load your watchlist. ${loadError}`}
        onRetry={reload} />
    );
  }
  if (watched.length === 0) {
    return (
      <div className="card">
        <h1>Ask the Genie</h1>
        <p>
          The genie works from the movies you have watched.
          {items.length === 0
            ? ' Add some to your watchlist first!'
            : ' Mark some of your saved movies as watched first!'}
        </p>
        <Link to={items.length === 0 ? '/' : '/watchlist'} className="button">
          {items.length === 0 ? 'Browse movies' : 'Open my watchlist'}
        </Link>
      </div>
    );
  }

  if (step === 'filters') {
    return (
      <FilterStep whole={whole} count={picked.length} genres={genres}
        form={form} error={error} busy={busy} onChange={handleChange}
        onBack={() => setStep('choose')} onSubmit={handleSubmit} />
    );
  }

  if (step === 'results') {
    const seedTitles = answer.seedTmdbIds.map(tmdbId =>
      items.find(i => i.tmdbId === tmdbId)?.title ?? 'a removed movie');
    return (
      <ResultStep picks={answer.results} seedTitles={seedTitles}
        onAgain={reset} />
    );
  }

  return (
    <ChooseStep items={watched} seedIds={picked} onToggle={toggleSeed}
      order={order} onOrder={setOrder} search={search} onSearch={setSearch}
      onWhole={() => goToFilters(true)}
      onContinue={() => goToFilters(false)} />
  );
}

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import MovieGrid from '../components/MovieGrid.jsx';
import BrowseControls from '../components/BrowseControls.jsx';
import { listPath } from '../utils/movies.js';

const TITLES = {
  trending: 'Trending this week',
  'top-rated': 'Top rated movies',
  genres: 'Movies by genre',
};

// One page for three routes. view is 'trending', 'top-rated' or 'genres'.
// The choices (genre, platform, sort, search) live in the address, like
// /genres?genre=10749&sort=newest, so the Back button returns to them.
export default function BrowsePage({ view }) {
  const { user } = useAuth();
  const country = user?.country ?? 'LB';

  const [params, setParams] = useSearchParams();
  const genreId = Number(params.get('genre')) || null;
  const providerId = Number(params.get('provider')) || null;
  // only the Genres list can be sorted: Trending and Top rated keep the
  // order that gives them their name
  const sortable = view === 'genres';
  const sort = sortable ? params.get('sort') ?? '' : '';
  const query = params.get('q') ?? '';
  const [text, setText] = useState(query);   // what is typed

  const { data: genres } = useApi('/api/movies/genres', true);
  const { data: providers } =
    useApi(`/api/movies/providers?country=${country}`, true);

  // change one choice in the address; an empty value removes it
  function setChoice(name, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next);
  }

  function handleSearch(e) {
    e.preventDefault();
    setChoice('q', text.trim());
  }

  function clearSearch() {
    setText('');
    setChoice('q', '');
  }

  const path = listPath({ view, query, genreId, providerId, sort, country });

  let heading = TITLES[view];
  const genre = genres?.find(g => g.id === genreId);
  if (genre) heading = `${genre.name} movies`;
  if (query) heading = `Results for "${query}"`;

  return (
    <>
      <form className="search" role="search" onSubmit={handleSearch}>
        <input type="search" value={text} maxLength={100}
          placeholder="Search for a movie…" aria-label="Search for a movie"
          onChange={e => setText(e.target.value)} />
        {query && (
          <button type="button" className="button button--quiet"
            onClick={clearSearch}>
            <X size={18} aria-hidden="true" /> Clear
          </button>
        )}
        <button className="button">
          <Search size={18} aria-hidden="true" /> Search
        </button>
      </form>

      <h1>{heading}</h1>

      {/* a search cannot be sorted or filtered, so the controls step aside */}
      {!query && (
        <>
          {view === 'genres' && (
            <div className="chips">
              <button type="button" onClick={() => setChoice('genre', '')}
                className={genreId === null ? 'chip chip--on' : 'chip'}>
                All genres
              </button>
              {genres?.map(g => (
                <button key={g.id} type="button"
                  onClick={() => setChoice('genre', g.id)}
                  className={genreId === g.id ? 'chip chip--on' : 'chip'}>
                  {g.name}
                </button>
              ))}
            </div>
          )}
          <BrowseControls providers={providers ?? []}
            providerId={providerId}
            onProvider={id => setChoice('provider', id)}
            showSort={sortable}
            sort={sort} onSort={value => setChoice('sort', value)} />
        </>
      )}

      <MovieGrid key={path} path={path} />
    </>
  );
}

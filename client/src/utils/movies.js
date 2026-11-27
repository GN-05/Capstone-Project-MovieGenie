// pure helpers: no React, no fetch

const IMAGE_URL = 'https://image.tmdb.org/t/p/';

// size is a TMDB width: 'w92', 'w185', 'w342', 'w1280'
export function imageUrl(path, size = 'w342') {
  return path ? `${IMAGE_URL}${size}${path}` : '';
}

// Adds a new page of movies to the ones already shown. TMDB can repeat a
// movie from one page to the next, so anything already in the list is skipped.
export function addNewMovies(shown, incoming) {
  const result = [...shown];
  for (const movie of incoming) {
    if (!result.some(m => m.tmdbId === movie.tmdbId)) {
      result.push(movie);
    }
  }
  return result;
}

// The API route for the list the Browse page should show.
// view is 'trending', 'top-rated' or 'genres'.
export function listPath({ view, query, genreId, providerId, sort, country }) {
  if (query) return `/api/movies/search?q=${encodeURIComponent(query)}`;

  // nothing chosen: the ready-made TMDB lists
  const plain = !genreId && !providerId && !sort;
  if (plain && view === 'trending') return '/api/movies/trending';
  if (plain && view === 'top-rated') return '/api/movies/top-rated';

  // otherwise the list that can be sorted and filtered
  const params = new URLSearchParams({
    sort: sort || (view === 'top-rated' ? 'rating-high' : 'popular'),
    country,
  });
  if (view === 'top-rated') params.set('top', 'true');
  if (genreId) params.set('genre', genreId);
  if (providerId) params.set('provider', providerId);
  return `/api/movies/discover?${params}`;
}

// The orders offered for saved movies (watchlist and genie). '' is the
// default, latest added, so it stays out of the address.
export const WATCHLIST_SORTS = [
  { value: '', label: 'Latest added' },
  { value: 'added-old', label: 'Oldest added' },
  { value: 'watched-new', label: 'Latest watched' },
  { value: 'rating-high', label: 'My rating (highest)' },
  { value: 'title-az', label: 'Title (A–Z)' },
  { value: 'year-new', label: 'Release date (newest)' },
];

// The watchlist in the order the user asked for. Returns a new array.
// order is 'added-new', 'added-old', 'watched-new', 'rating-high',
// 'title-az' or 'year-new'.
export function sortWatchlist(items, order) {
  const time = date => (date ? new Date(date).getTime() : 0);
  const compare = {
    'added-new': (a, b) => time(b.createdAt) - time(a.createdAt),
    'added-old': (a, b) => time(a.createdAt) - time(b.createdAt),
    // movies not watched yet have no date, so they come last
    'watched-new': (a, b) => time(b.watchedAt) - time(a.watchedAt),
    // unrated movies count as 0 stars, so they come last
    'rating-high': (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    'title-az': (a, b) => a.title.localeCompare(b.title),
    'year-new': (a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0),
  };
  return [...items].sort(compare[order] ?? compare['added-new']);
}

// Text ready to compare: accents split off and removed ("é" -> "e"),
// lowercase, no outer spaces.
function plain(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();
}

// Keeps the saved movies whose title contains the text, ignoring case,
// accents and extra spaces ("amelie" finds "Amélie"). Empty text keeps all.
export function filterByTitle(items, text) {
  const wanted = plain(text);
  if (!wanted) return items;
  return items.filter(item => plain(item.title).includes(wanted));
}

export function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

export function formatRuntime(minutes) {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

export function formatRating(voteAverage) {
  return voteAverage ? voteAverage.toFixed(1) : 'n/a';
}

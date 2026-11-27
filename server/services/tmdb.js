// Every TMDB request goes through this file, so the key never leaves the server.
import { MIN_VOTES, isTrusted } from './movieRules.js';

const TMDB_URL = 'https://api.themoviedb.org/3';
const LIST_TTL = 10 * 60_000;         // lists change: keep 10 minutes
const MOVIE_TTL = 24 * 60 * 60_000;   // a movie's facts: keep a day
const MAX_ENTRIES = 2000;

const cache = new Map();   // url -> { data, expires }

async function tmdbGet(path, params = {}, ttl = LIST_TTL) {
  const query = new URLSearchParams(params);
  const key = `${path}?${query}`;

  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;

  query.set('api_key', process.env.TMDB_API_KEY);
  const res = await fetch(`${TMDB_URL}${path}?${query}`);
  if (!res.ok) {
    const err = new Error(`TMDB answered ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();

  if (cache.size >= MAX_ENTRIES) cache.clear();
  cache.set(key, { data, expires: Date.now() + ttl });
  return data;
}

// ---- TMDB shape -> our shape ----

function yearOf(date) {
  return date ? Number(date.slice(0, 4)) : null;
}

function toCard(m) {
  return {
    tmdbId: m.id,
    title: m.title,
    overview: m.overview ?? '',
    posterPath: m.poster_path ?? '',
    releaseYear: yearOf(m.release_date),
    voteAverage: m.vote_average ?? 0,
    voteCount: m.vote_count ?? 0,
    genreIds: m.genre_ids ?? [],
  };
}

function toPage(data) {
  return {
    page: data.page,
    totalPages: Math.min(data.total_pages, 500),   // TMDB stops at 500
    results: data.results.map(toCard).filter(isTrusted),
  };
}

function pickTrailer(videos) {
  const onYouTube = videos.filter(v => v.site === 'YouTube');
  const trailer = onYouTube.find(v => v.type === 'Trailer' && v.official)
    ?? onYouTube.find(v => v.type === 'Trailer')
    ?? onYouTube.find(v => v.type === 'Teaser');
  return trailer ? trailer.key : null;
}

function toProvider(p) {
  return { id: p.provider_id, name: p.provider_name, logoPath: p.logo_path };
}

function toProviders(found) {
  if (!found) return null;
  return {
    stream: (found.flatrate ?? []).map(toProvider),
    rent: (found.rent ?? []).map(toProvider),
    buy: (found.buy ?? []).map(toProvider),
  };
}

// ---- lists ----

export async function getTrending(page) {
  return toPage(await tmdbGet('/trending/movie/week', { page }));
}

export async function getTopRated(page) {
  return toPage(await tmdbGet('/movie/top_rated', { page }));
}

export async function searchMovies(q, page) {
  const result = toPage(await tmdbGet('/search/movie', {
    query: q, page, include_adult: false,
  }));
  // Search results get less known page after page. Once a whole page is
  // filtered out, call it the last one, or infinite scroll would keep
  // asking for empty pages (a word like "the" has 500 of them).
  if (result.results.length === 0) result.totalPages = result.page;
  return result;
}

// what the client may ask for -> what TMDB calls it
const SORTS = {
  popular: 'popularity.desc',
  newest: 'primary_release_date.desc',
  oldest: 'primary_release_date.asc',
  'rating-high': 'vote_average.desc',
  'rating-low': 'vote_average.asc',
  'title-az': 'title.asc',
  'title-za': 'title.desc',
};

// One TMDB list that can be sorted and filtered by genre and by streaming
// platform, so sorting stays correct across every page.
export async function discoverMovies({ sort, genre, provider, country, top, page }) {
  const params = {
    page,
    include_adult: false,
    sort_by: SORTS[sort],
    // leaves out barely-known titles; stricter when the rating decides
    'vote_count.gte': top || sort.startsWith('rating') ? 500 : MIN_VOTES,
  };
  if (top) params['vote_average.gte'] = 7.5;
  if (genre) params.with_genres = genre;
  if (provider) {
    params.with_watch_providers = provider;
    params.watch_region = country;
    params.with_watch_monetization_types = 'flatrate';
  }
  return toPage(await tmdbGet('/discover/movie', params));
}

// TMDB lists every service that reaches a country, including tiny ones,
// and its order puts some of those near the top. Only the platforms people
// actually know are offered as filters.
const KNOWN_PLATFORMS = [
  'Netflix', 'Amazon Prime Video', 'Disney Plus', 'Apple TV', 'HBO Max',
  'Hulu', 'Paramount Plus', 'Peacock Premium', 'OSN+', 'Shahid VIP',
  'STARZPLAY', 'TOD', 'Canal+', 'Crunchyroll', 'MUBI',
];

// the well-known streaming platforms of one country, in TMDB's order
export async function getProviders(country) {
  const data = await tmdbGet('/watch/providers/movie',
    { watch_region: country }, MOVIE_TTL);
  return data.results
    .filter(p => KNOWN_PLATFORMS.includes(p.provider_name))
    .sort((a, b) => (a.display_priorities[country] ?? 999)
      - (b.display_priorities[country] ?? 999))
    .slice(0, 8)
    .map(toProvider);
}

export async function getGenres() {
  const data = await tmdbGet('/genre/movie/list', {}, MOVIE_TTL);
  return data.genres;   // [{ id, name }]
}

// the first two pages of TMDB's list: about 40 candidates per movie
export async function getRecommendations(tmdbId) {
  const path = `/movie/${tmdbId}/recommendations`;
  const pages = await Promise.all([
    tmdbGet(path, { page: 1 }),
    tmdbGet(path, { page: 2 }),
  ]);
  return pages.flatMap(data => data.results.map(toCard).filter(isTrusted));
}

// ---- one movie ----

function getRaw(tmdbId) {
  return tmdbGet(`/movie/${tmdbId}`, {
    append_to_response: 'credits,keywords,videos,watch/providers',
  }, MOVIE_TTL);
}

// what the genie compares: genres, keywords, top 5 cast, director
function featuresOf(m) {
  const director = m.credits.crew.find(c => c.job === 'Director');
  return {
    genreIds: m.genres.map(g => g.id),
    keywordIds: m.keywords.keywords.map(k => k.id),
    castIds: m.credits.cast.slice(0, 5).map(c => c.id),
    directorId: director ? director.id : null,
  };
}

export async function getFeatures(tmdbId) {
  return featuresOf(await getRaw(tmdbId));
}

export async function getMovie(tmdbId, country = 'LB') {
  const m = await getRaw(tmdbId);
  const director = m.credits.crew.find(c => c.job === 'Director');
  return {
    tmdbId: m.id,
    title: m.title,
    overview: m.overview ?? '',
    posterPath: m.poster_path ?? '',
    backdropPath: m.backdrop_path ?? '',
    releaseYear: yearOf(m.release_date),
    runtime: m.runtime ?? null,
    voteAverage: m.vote_average ?? 0,
    voteCount: m.vote_count ?? 0,
    genres: m.genres,
    director: director ? { id: director.id, name: director.name } : null,
    cast: m.credits.cast.slice(0, 8).map(c => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: c.profile_path ?? '',
    })),
    trailerKey: pickTrailer(m.videos.results),
    providers: toProviders(m['watch/providers'].results[country]),
    features: featuresOf(m),
  };
}

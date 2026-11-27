import { describe, it, expect } from 'vitest';
import {
  addNewMovies, listPath, sortWatchlist, truncate, formatRuntime, formatRating,
  imageUrl, filterByTitle,
} from './movies.js';

describe('filterByTitle', () => {
  const items = [{ title: 'Amélie' }, { title: 'Dune' }, { title: 'Dune: Part Two' }];

  it('keeps every movie when the search is empty or only spaces', () => {
    expect(filterByTitle(items, '')).toHaveLength(3);
    expect(filterByTitle(items, '   ')).toHaveLength(3);
  });

  it('ignores case, accents and outer spaces', () => {
    expect(filterByTitle(items, ' DUNE ')).toHaveLength(2);
    expect(filterByTitle(items, 'amelie')).toEqual([{ title: 'Amélie' }]);
  });

  it('returns nothing when no title matches', () => {
    expect(filterByTitle(items, 'xyz')).toEqual([]);
  });
});

describe('addNewMovies', () => {
  const shown = [{ tmdbId: 1 }, { tmdbId: 2 }];

  it('adds the movies of the next page at the end', () => {
    const result = addNewMovies(shown, [{ tmdbId: 3 }]);
    expect(result.map(m => m.tmdbId)).toEqual([1, 2, 3]);
  });

  it('skips a movie that is already shown', () => {
    const result = addNewMovies(shown, [{ tmdbId: 2 }, { tmdbId: 3 }]);
    expect(result.map(m => m.tmdbId)).toEqual([1, 2, 3]);
  });

  it('skips a movie repeated inside the same page', () => {
    const result = addNewMovies([], [{ tmdbId: 5 }, { tmdbId: 5 }]);
    expect(result).toHaveLength(1);
  });

  it('leaves the original list alone', () => {
    addNewMovies(shown, [{ tmdbId: 3 }]);
    expect(shown).toHaveLength(2);
  });
});

describe('listPath', () => {
  const base = { query: '', genreId: null, providerId: null, sort: '', country: 'LB' };

  it('uses the ready-made lists when nothing is chosen', () => {
    expect(listPath({ ...base, view: 'trending' })).toBe('/api/movies/trending');
    expect(listPath({ ...base, view: 'top-rated' })).toBe('/api/movies/top-rated');
  });

  it('lets a search replace everything else', () => {
    expect(listPath({ ...base, view: 'trending', sort: 'newest', query: 'la la' }))
      .toBe('/api/movies/search?q=la%20la');
  });

  it('asks for the sorted, filtered list once something is chosen', () => {
    expect(listPath({ ...base, view: 'trending', sort: 'oldest', providerId: 8 }))
      .toBe('/api/movies/discover?sort=oldest&country=LB&provider=8');
    expect(listPath({ ...base, view: 'genres', genreId: 35 }))
      .toBe('/api/movies/discover?sort=popular&country=LB&genre=35');
  });

  it('keeps Top rated well rated whatever the order', () => {
    expect(listPath({ ...base, view: 'top-rated', sort: 'newest' }))
      .toBe('/api/movies/discover?sort=newest&country=LB&top=true');
  });
});

describe('sortWatchlist', () => {
  const items = [
    { title: 'Bravo', createdAt: '2026-03-01', watchedAt: '2026-03-05', rating: 2, releaseYear: 1999 },
    { title: 'Alpha', createdAt: '2026-01-01', watchedAt: '2026-06-01', rating: 5, releaseYear: 2010 },
    { title: 'Charlie', createdAt: '2026-05-01', watchedAt: null, rating: null, releaseYear: 2020 },
  ];
  const titles = order => sortWatchlist(items, order).map(i => i.title);

  it('puts the latest added first, or the oldest', () => {
    expect(titles('added-new')).toEqual(['Charlie', 'Bravo', 'Alpha']);
    expect(titles('added-old')).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('puts the latest watched first, and unwatched movies last', () => {
    expect(titles('watched-new')).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('sorts by my rating, by title and by release year', () => {
    expect(titles('rating-high')).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(titles('title-az')).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(titles('year-new')).toEqual(['Charlie', 'Alpha', 'Bravo']);
  });

  it('falls back to latest added, and leaves the original list alone', () => {
    expect(titles('nonsense')).toEqual(['Charlie', 'Bravo', 'Alpha']);
    expect(items[0].title).toBe('Bravo');
  });
});

describe('truncate', () => {
  it('leaves short text alone', () => {
    expect(truncate('hi', 10)).toBe('hi');
  });

  it('cuts long text and adds …', () => {
    expect(truncate('hello world', 6)).toBe('hello…');
  });
});

describe('formatting', () => {
  it('writes a runtime in hours and minutes', () => {
    expect(formatRuntime(132)).toBe('2h 12m');
    expect(formatRuntime(45)).toBe('45m');
    expect(formatRuntime(null)).toBe('');
  });

  it('writes a rating with one decimal', () => {
    expect(formatRating(7.849)).toBe('7.8');
    expect(formatRating(0)).toBe('n/a');
  });

  it('builds a TMDB image address, or nothing without a path', () => {
    expect(imageUrl('/abc.jpg', 'w185'))
      .toBe('https://image.tmdb.org/t/p/w185/abc.jpg');
    expect(imageUrl('')).toBe('');
  });
});

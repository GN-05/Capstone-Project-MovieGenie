import { describe, it, expect } from 'vitest';
import {
  toVector, seedWeight, buildProfile, cosine, similarity, agreement, quality,
  passesFilters, mergeLists, rankPicks, explain, pickSeeds,
} from '../services/genie.js';
import { isTrusted } from '../services/movieRules.js';

// genres used below: 28 Action, 878 Sci-Fi, 35 Comedy, 10749 Romance
const seedA = {
  tmdbId: 1, title: 'Seed A', rating: 5,
  genreIds: [28, 878], keywordIds: [], castIds: [], directorId: 500,
};
const seedB = {
  tmdbId: 2, title: 'Seed B', rating: 3,
  genreIds: [28, 35], keywordIds: [], castIds: [], directorId: null,
};

function candidate(overrides) {
  return {
    tmdbId: 100, title: 'Candidate', posterPath: '/p.jpg',
    releaseYear: 2015, voteAverage: 7, voteCount: 1000,
    genreIds: [], keywordIds: [], castIds: [], directorId: null,
    fromSeeds: [1],
    ...overrides,
  };
}

const noFilters =
  { genreId: null, yearFrom: null, yearTo: null, minRating: null };

describe('cosine', () => {
  it('is 1 for identical vectors and 0 for nothing in common', () => {
    const a = toVector([28, 878]);
    expect(cosine(a, a)).toBeCloseTo(1);
    expect(cosine(a, toVector([35]))).toBe(0);
  });

  it('is 0, not NaN, when nothing is known on one side', () => {
    expect(cosine(toVector([28]), toVector([]))).toBe(0);
  });
});

describe('seed weights and the merged profile', () => {
  it('turns stars into a weight, 3 stars when unrated', () => {
    expect(seedWeight({ rating: 5 })).toBe(1);
    expect(seedWeight({ rating: null })).toBe(0.6);
  });

  it('adds the seeds together, weighted by stars', () => {
    const profile = buildProfile([seedA, seedB]);
    expect(profile.genre[28]).toBeCloseTo(1.6);    // in both seeds
    expect(profile.genre[878]).toBeCloseTo(1.0);   // 5-star seed only
    expect(profile.genre[35]).toBeCloseTo(0.6);    // 3-star seed only
    expect(profile.director[500]).toBeCloseTo(1.0);
  });

  it('matches the worked example in docs/genie-ranking.md', () => {
    const profile = buildProfile([seedA, seedB]);
    expect(cosine(profile.genre, toVector([28, 878]))).toBeCloseTo(0.93, 2);
    expect(cosine(profile.genre, toVector([35, 10749]))).toBeCloseTo(0.21, 2);
  });

  it('mixes the four groups into one similarity from 0 to 1', () => {
    const profile = buildProfile([seedA]);
    const twin = { ...seedA, keywordIds: [9], castIds: [7] };
    const twinProfile = buildProfile([twin]);
    expect(similarity(twinProfile, twin)).toBeCloseTo(1);
    // same genres and director as seed A, nothing else known: 0.40 + 0.20
    expect(similarity(profile, seedA)).toBeCloseTo(0.6);
  });
});

describe('agreement and quality', () => {
  it('counts the seeds that recommended the candidate, by weight', () => {
    const seeds = [seedA, seedB];
    expect(agreement(candidate({ fromSeeds: [1, 2] }), seeds)).toBeCloseTo(1);
    expect(agreement(candidate({ fromSeeds: [1] }), seeds))
      .toBeCloseTo(1 / 1.6);
  });

  it('trusts a rating less when few people voted', () => {
    const fewVotes = candidate({ voteAverage: 9, voteCount: 60 });
    const manyVotes = candidate({ voteAverage: 8, voteCount: 20000 });
    expect(quality(manyVotes)).toBeGreaterThan(quality(fewVotes));
  });
});

describe('passesFilters', () => {
  it('removes movies already on the watchlist', () => {
    expect(passesFilters(candidate({ tmdbId: 7 }), noFilters, [7])).toBe(false);
    expect(passesFilters(candidate({ tmdbId: 8 }), noFilters, [7])).toBe(true);
  });

  it('applies genre, era and minimum rating', () => {
    const c = candidate({ genreIds: [28], releaseYear: 1999, voteAverage: 6 });
    expect(passesFilters(c, { ...noFilters, genreId: 35 }, [])).toBe(false);
    expect(passesFilters(c, { ...noFilters, yearFrom: 2000 }, [])).toBe(false);
    expect(passesFilters(c, { ...noFilters, yearTo: 1999 }, [])).toBe(true);
    expect(passesFilters(c, { ...noFilters, minRating: 7 }, [])).toBe(false);
  });

  it('removes movies with too few votes, no rating or no poster', () => {
    expect(passesFilters(candidate({ voteCount: 10 }), noFilters, []))
      .toBe(false);
    expect(passesFilters(candidate({ voteCount: 299 }), noFilters, []))
      .toBe(false);
    expect(passesFilters(candidate({ voteAverage: 0 }), noFilters, []))
      .toBe(false);
    expect(passesFilters(candidate({ posterPath: '' }), noFilters, []))
      .toBe(false);
  });
});

describe('isTrusted (the app-wide list filter)', () => {
  it('keeps a rated movie with 300 votes or more, and nothing else', () => {
    expect(isTrusted({ voteAverage: 7, voteCount: 300 })).toBe(true);
    expect(isTrusted({ voteAverage: 7, voteCount: 299 })).toBe(false);
    expect(isTrusted({ voteAverage: 0, voteCount: 5000 })).toBe(false);
  });
});

describe('pickSeeds (whole watchlist)', () => {
  const saved = [
    { title: 'Old 5', rating: 5, genreIds: [28], createdAt: '2026-01-01' },
    { title: 'New 5', rating: 5, genreIds: [28], createdAt: '2026-06-01' },
    { title: 'Unrated', rating: null, genreIds: [28], createdAt: '2026-03-01' },
    { title: 'Low', rating: 1, genreIds: [28], createdAt: '2026-04-01' },
    { title: 'Comedy 4', rating: 4, genreIds: [35], createdAt: '2026-05-01' },
  ].map(item => ({ ...item, watched: true }));

  it('leaves out the movies the user has not watched', () => {
    const list = [...saved,
      { title: 'To watch', watched: false, rating: null, genreIds: [28],
        createdAt: '2026-07-01' }];
    expect(pickSeeds(list, 28).map(s => s.title)).not.toContain('To watch');
    expect(pickSeeds([list[5]], null)).toEqual([]);
  });

  it('keeps only the saved movies of the wanted genre', () => {
    expect(pickSeeds(saved, 35).map(s => s.title)).toEqual(['Comedy 4']);
    expect(pickSeeds(saved, 99)).toEqual([]);
  });

  it('orders by stars, unrated as 3, newest first on a tie', () => {
    expect(pickSeeds(saved, 28).map(s => s.title))
      .toEqual(['New 5', 'Old 5', 'Unrated', 'Low']);
  });

  it('uses every genre when none is asked, and stops at 10', () => {
    expect(pickSeeds(saved, null)).toHaveLength(5);
    const many = [];
    for (let i = 0; i < 15; i++) {
      many.push({ watched: true, rating: 4, genreIds: [28], createdAt: '2026-01-01' });
    }
    expect(pickSeeds(many, 28)).toHaveLength(10);
  });

  // any genre: a tie on stars goes to the movie with the most new genres
  const sciFi = (title, rating, watchedAt) =>
    ({ title, rating, genreIds: [878], watched: true, watchedAt, createdAt: '2026-09-01' });

  it('with any genre, breaks a tie on stars by the genres it adds', () => {
    const list = [];
    for (let i = 0; i < 10; i++) list.push(sciFi(`Sci-Fi ${i}`, 5, '2026-09-01'));
    list.push({ title: 'Amélie', rating: 5, genreIds: [35, 10749], watched: true,
      watchedAt: '2020-01-01', createdAt: '2020-01-01' });
    const titles = pickSeeds(list, null).map(s => s.title);
    expect(titles).toHaveLength(10);
    expect(titles).toContain('Amélie');   // oldest, but the only new genres
  });

  it('with any genre, never lets variety beat stars', () => {
    const list = [sciFi('Five', 5, '2026-01-01'),
      { title: 'Four', rating: 4, genreIds: [35, 18, 10749], watched: true,
        watchedAt: '2026-01-01', createdAt: '2026-01-01' }];
    expect(pickSeeds(list, null).map(s => s.title)).toEqual(['Five', 'Four']);
  });

  it('with any genre, then prefers the most recently watched', () => {
    const list = [sciFi('Seen long ago', 5, '2020-01-01'),
      sciFi('Seen last week', 5, '2026-11-10')];
    expect(pickSeeds(list, null)[0].title).toBe('Seen last week');
  });
});

describe('mergeLists', () => {
  it('keeps a movie once and remembers every seed it came from', () => {
    const lists = [
      [{ tmdbId: 10 }, { tmdbId: 11 }],
      [{ tmdbId: 11 }, { tmdbId: 12 }],
    ];
    const merged = mergeLists([seedA, seedB], lists);
    expect(merged.map(c => c.tmdbId)).toEqual([10, 11, 12]);
    expect(merged.find(c => c.tmdbId === 11).fromSeeds).toEqual([1, 2]);
  });
});

describe('rankPicks', () => {
  const seeds = [seedA, seedB];
  const close = candidate({
    tmdbId: 101, title: 'Close', genreIds: [28, 878], directorId: 500,
    fromSeeds: [1, 2],
  });
  const far = candidate({
    tmdbId: 102, title: 'Far', genreIds: [35, 10749], fromSeeds: [2],
  });

  it('puts the closest match first, with scores from 0 to 1', () => {
    const picks = rankPicks(seeds, [far, close], noFilters, [1, 2]);
    expect(picks.map(p => p.title)).toEqual(['Close', 'Far']);
    expect(picks[0].score).toBeGreaterThan(picks[1].score);
    expect(picks[0].score).toBeLessThanOrEqual(1);
    expect(picks[1].score).toBeGreaterThanOrEqual(0);
  });

  it('lets the stars change the order', () => {
    const likesSciFi = [seedA, seedB];                    // A has 5 stars
    const likesComedy = [{ ...seedA, rating: 1 }, { ...seedB, rating: 5 }];
    const sciFi = candidate({ tmdbId: 201, title: 'SciFi', genreIds: [878] });
    const comedy = candidate({ tmdbId: 202, title: 'Comedy', genreIds: [35] });
    const both = [sciFi, comedy].map(c => ({ ...c, fromSeeds: [1, 2] }));

    expect(rankPicks(likesSciFi, both, noFilters, [])[0].title).toBe('SciFi');
    expect(rankPicks(likesComedy, both, noFilters, [])[0].title).toBe('Comedy');
  });

  it('never returns a filtered-out movie, and at most 10 picks', () => {
    const many = [];
    for (let i = 0; i < 25; i++) {
      many.push(candidate({ tmdbId: 300 + i, genreIds: [28] }));
    }
    const picks = rankPicks(seeds, many, noFilters, [300, 301]);
    expect(picks).toHaveLength(10);
    expect(picks.map(p => p.tmdbId)).not.toContain(300);
  });

  it('explains a pick with the seed and what they share', () => {
    expect(explain(close, seeds)[0])
      .toBe('Because you saved Seed A: same director, 2 shared genres');
  });
});

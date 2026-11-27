import { describe, it, expect } from 'vitest';
import { applyWatchRules } from '../services/watchlist.js';

const watchedItem = { watched: true, rating: 4 };
const unwatchedItem = { watched: false, rating: null };

describe('applyWatchRules', () => {
  it('lets a watched movie be rated', () => {
    expect(applyWatchRules(watchedItem, { rating: 5 }))
      .toEqual({ update: { rating: 5 } });
  });

  it('refuses a rating on a movie that is not watched', () => {
    expect(applyWatchRules(unwatchedItem, { rating: 5 }).error)
      .toBe('Mark the movie as watched before rating it');
  });

  it('accepts watched and a rating sent together, and dates the watching', () => {
    const { update } = applyWatchRules(unwatchedItem, { watched: true, rating: 3 });
    expect(update).toMatchObject({ watched: true, rating: 3 });
    expect(update.watchedAt).toBeInstanceOf(Date);
  });

  it('keeps the first watched date when a watched movie is edited', () => {
    const { update } = applyWatchRules(watchedItem, { watched: true, rating: 2 });
    expect(update.watchedAt).toBeUndefined();
  });

  it('removes the rating and the date when a movie becomes not watched', () => {
    expect(applyWatchRules(watchedItem, { watched: false }))
      .toEqual({ update: { watched: false, rating: null, watchedAt: null } });
  });

  it('refuses "not watched" sent together with a rating', () => {
    expect(applyWatchRules(watchedItem, { watched: false, rating: 5 }).error)
      .toBeDefined();
  });

  it('lets the rating of a watched movie be cleared', () => {
    expect(applyWatchRules(watchedItem, { rating: null }))
      .toEqual({ update: { rating: null } });
  });
});

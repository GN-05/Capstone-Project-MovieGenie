// The genie's ranking. Pure functions: no Express, no database, no network.
// The method is described in docs/genie-ranking.md.
import { isTrusted } from './movieRules.js';   // the app-wide "enough votes" rule

// A movie is compared on four groups of features. Each group has its own
// share of the similarity; the shares add up to 1.
export const FEATURE_WEIGHTS = {
  genre: 0.40,
  keyword: 0.25,
  director: 0.20,
  cast: 0.15,
};
const GROUPS = Object.keys(FEATURE_WEIGHTS);

// how the three parts of the final score are mixed; they add up to 1
export const SCORE_MIX = {
  similarity: 0.55,
  agreement: 0.15,
  quality: 0.30,
};

const UNRATED_STARS = 3;    // a seed with no rating counts as 3 stars
const QUALITY_VOTES = 500;  // m in the weighted rating
const QUALITY_MEAN = 6.5;   // C in the weighted rating
export const MAX_SEEDS = 10;
export const SHORTLIST_SIZE = 30;
export const PICKS = 10;

// ---- step 0: choose the seeds when the user says "my whole watchlist" ----
// Only watched movies say something about the user's taste, and the 10 the
// user rated highest are kept (unrated counts as 3 stars). Only a tie on
// stars is decided differently:
// - one genre asked: the most recently saved wins, the user's current mood
//   for that genre;
// - any genre: the movie that adds the most genres not yet covered wins, so
//   the seeds show the user's whole taste and not only their latest phase.
//   If that ties too, the most recently watched wins.

const stars = item => item.rating ?? UNRATED_STARS;
const time = date => (date ? new Date(date).getTime() : 0);

export function pickSeeds(saved, genreId) {
  const watched = saved.filter(item => item.watched);

  if (genreId) {
    return watched
      .filter(item => item.genreIds.includes(genreId))
      .sort((a, b) => stars(b) - stars(a) || time(b.createdAt) - time(a.createdAt))
      .slice(0, MAX_SEEDS);
  }

  // any genre: one seed at a time, since "new genres" depends on the
  // seeds already chosen
  const left = [...watched];
  const seeds = [];
  const covered = new Set();
  const newGenres = item => item.genreIds.filter(id => !covered.has(id)).length;

  while (seeds.length < MAX_SEEDS && left.length > 0) {
    left.sort((a, b) => stars(b) - stars(a)
      || newGenres(b) - newGenres(a)
      || time(b.watchedAt) - time(a.watchedAt));
    const next = left.shift();
    seeds.push(next);
    next.genreIds.forEach(id => covered.add(id));
  }
  return seeds;
}

// ---- step 1: a movie as vectors of features, one per group ----

function idsOf(movie, group) {
  if (group === 'genre') return movie.genreIds ?? [];
  if (group === 'keyword') return movie.keywordIds ?? [];
  if (group === 'cast') return movie.castIds ?? [];
  return movie.directorId ? [movie.directorId] : [];   // director
}

// A vector is an object: { 28: 1, 878: 1 } means "has features 28 and 878".
export function toVector(ids) {
  const vector = {};
  for (const id of ids) vector[id] = 1;
  return vector;
}

// ---- step 2: weight each seed by the user's stars ----

export function seedWeight(seed) {
  return (seed.rating ?? UNRATED_STARS) / 5;
}

// ---- step 3: merge the seeds into one taste profile ----
// The profile has one vector per group. A feature shared by several seeds,
// or belonging to a highly rated seed, gets a bigger number.

export function buildProfile(seeds) {
  const profile = {};
  for (const group of GROUPS) {
    profile[group] = {};
    for (const seed of seeds) {
      for (const id of idsOf(seed, group)) {
        profile[group][id] = (profile[group][id] ?? 0) + seedWeight(seed);
      }
    }
  }
  return profile;
}

// ---- step 4: filter the candidates ----

export function passesFilters(candidate, filters, savedIds) {
  if (savedIds.includes(candidate.tmdbId)) return false;
  if (!candidate.posterPath) return false;
  // the TMDB lists already drop these; checked again so the rule holds here
  if (!isTrusted(candidate)) return false;

  const { genreId, yearFrom, yearTo, minRating } = filters;
  if (genreId && !candidate.genreIds.includes(genreId)) return false;
  if (minRating && candidate.voteAverage < minRating) return false;
  if (yearFrom || yearTo) {
    const year = candidate.releaseYear;
    if (!year) return false;
    if (yearFrom && year < yearFrom) return false;
    if (yearTo && year > yearTo) return false;
  }
  return true;
}

// ---- step 5: the three parts of the score, each from 0 to 1 ----

function length(vector) {
  const sumOfSquares = Object.values(vector)
    .reduce((sum, value) => sum + value * value, 0);
  return Math.sqrt(sumOfSquares);
}

export function cosine(a, b) {
  const lengths = length(a) * length(b);
  if (lengths === 0) return 0;   // nothing known on one side
  const dot = Object.keys(a)
    .reduce((sum, key) => sum + a[key] * (b[key] ?? 0), 0);
  return dot / lengths;
}

// cosine in each group, then mixed with the group shares
export function similarity(profile, candidate, groups = GROUPS) {
  return groups.reduce((sum, group) => {
    const vector = toVector(idsOf(candidate, group));
    return sum + FEATURE_WEIGHTS[group] * cosine(profile[group], vector);
  }, 0);
}

// share of the seeds (by weight) whose TMDB list contains the candidate
export function agreement(candidate, seeds) {
  const total = seeds.reduce((sum, s) => sum + seedWeight(s), 0);
  if (total === 0) return 0;
  const agreeing = seeds
    .filter(s => candidate.fromSeeds.includes(s.tmdbId))
    .reduce((sum, s) => sum + seedWeight(s), 0);
  return agreeing / total;
}

// TMDB rating, pulled toward the average when few people voted, then
// stretched so that 5/10 gives 0 and 9/10 gives 1
export function quality(candidate) {
  const v = candidate.voteCount;
  const R = candidate.voteAverage;
  const m = QUALITY_VOTES;
  const weighted = (v / (v + m)) * R + (m / (v + m)) * QUALITY_MEAN;
  return Math.min(1, Math.max(0, (weighted - 5) / 4));
}

function score(candidate, seeds, profile, groups) {
  return SCORE_MIX.similarity * similarity(profile, candidate, groups)
    + SCORE_MIX.agreement * agreement(candidate, seeds)
    + SCORE_MIX.quality * quality(candidate);
}

// ---- step 7: explain a pick ----

function countShared(a = [], b = []) {
  return a.filter(id => b.includes(id)).length;
}

function plural(count, word) {
  return `${count} shared ${word}${count === 1 ? '' : 's'}`;
}

function sharedWith(seed, candidate) {
  const parts = [];
  if (seed.directorId && seed.directorId === candidate.directorId) {
    parts.push('same director');
  }
  const genres = countShared(seed.genreIds, candidate.genreIds);
  if (genres > 0) parts.push(plural(genres, 'genre'));
  const cast = countShared(seed.castIds, candidate.castIds);
  if (cast > 0) parts.push(plural(cast, 'actor'));
  const keywords = countShared(seed.keywordIds, candidate.keywordIds);
  if (keywords > 0) parts.push(plural(keywords, 'theme'));
  return parts;
}

// one reason per seed that contributed, strongest first, at most two
export function explain(candidate, seeds) {
  return seeds
    .map(seed => ({
      seed,
      strength: seedWeight(seed)
        * similarity(buildProfile([seed]), candidate)
        + (candidate.fromSeeds.includes(seed.tmdbId) ? 0.01 : 0),
    }))
    .filter(entry => entry.strength > 0)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 2)
    .map(({ seed }) => {
      const shared = sharedWith(seed, candidate);
      const because = `Because you saved ${seed.title}`;
      return shared.length > 0
        ? `${because}: ${shared.join(', ')}`
        : because;
    });
}

// ---- the three functions the route calls ----

// The same movie can be recommended for several seeds: keep it once and
// remember every seed it came from.
export function mergeLists(seeds, lists) {
  const merged = [];
  lists.forEach((list, i) => {
    for (const movie of list) {
      const known = merged.find(c => c.tmdbId === movie.tmdbId);
      if (known) {
        known.fromSeeds.push(seeds[i].tmdbId);
      } else {
        merged.push({ ...movie, fromSeeds: [seeds[i].tmdbId] });
      }
    }
  });
  return merged;
}

// First pass, with what the TMDB lists already contain (genres, votes).
// Keeps the best few, so details are fetched only for those.
export function shortlist(seeds, candidates, filters, savedIds) {
  const profile = buildProfile(seeds);
  return candidates
    .filter(c => passesFilters(c, filters, savedIds))
    .map(c => ({ candidate: c, score: score(c, seeds, profile, ['genre']) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, SHORTLIST_SIZE)
    .map(entry => entry.candidate);
}

// Final ranking, with the full features of each candidate.
export function rankPicks(seeds, candidates, filters, savedIds) {
  const profile = buildProfile(seeds);
  return candidates
    .filter(c => passesFilters(c, filters, savedIds))
    .map(c => ({
      tmdbId: c.tmdbId,
      title: c.title,
      posterPath: c.posterPath,
      releaseYear: c.releaseYear,
      voteAverage: c.voteAverage,
      score: Math.round(score(c, seeds, profile, GROUPS) * 1000) / 1000,
      reasons: explain(c, seeds),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, PICKS);
}

import express from 'express';
import { WatchlistItem } from '../models/WatchlistItem.js';
import { GenieRequest } from '../models/GenieRequest.js';
import { getRecommendations, getFeatures } from '../services/tmdb.js';
import {
  pickSeeds, mergeLists, shortlist, rankPicks,
} from '../services/genie.js';
import { validate, GenieInput } from '../middleware/validate.js';
import { requireAccount } from '../middleware/requireAccount.js';

// every route here runs after requireAuth, so req.userId is set
const genieRouter = express.Router();

// a candidate with its genres, keywords, cast and director filled in;
// if TMDB fails for one movie, it keeps the genres it already has
async function withFeatures(candidate) {
  try {
    return { ...candidate, ...(await getFeatures(candidate.tmdbId)) };
  } catch {
    return candidate;
  }
}

// ask the genie
genieRouter.post('/', validate(GenieInput), requireAccount, async (req, res) => {
  const { wholeWatchlist, seedTmdbIds, ...filters } = req.body;
  try {
    const saved = await WatchlistItem.find({ userId: req.userId });
    const savedIds = saved.map(item => item.tmdbId);

    let seeds;
    if (wholeWatchlist) {
      // the genie chooses: the best rated saved movies of the wanted genre
      seeds = pickSeeds(saved, filters.genreId);
      if (seeds.length === 0) {
        return res.status(400)
          .json({ error: 'You have no watched movie in this genre yet' });
      }
    } else {
      seeds = saved.filter(item => seedTmdbIds.includes(item.tmdbId));
      if (seeds.length !== new Set(seedTmdbIds).size) {
        return res.status(400)
          .json({ error: 'Pick movies from your own watchlist' });
      }
      if (seeds.some(seed => !seed.watched)) {
        return res.status(400)
          .json({ error: 'The genie only uses movies you have watched' });
      }
    }

    // one TMDB list per seed, all at once
    const lists = await Promise.all(
      seeds.map(seed => getRecommendations(seed.tmdbId)));
    const candidates = mergeLists(seeds, lists);

    // details only for the candidates that lead the first pass
    const leaders = shortlist(seeds, candidates, filters, savedIds);
    const detailed = await Promise.all(leaders.map(withFeatures));

    const results = rankPicks(seeds, detailed, filters, savedIds);
    const request = await GenieRequest.create({
      userId: req.userId,
      seedTmdbIds: seeds.map(seed => seed.tmdbId),
      filters,
      results,
    });
    res.status(201).json(request);
  } catch (err) {
    if (err.status) {   // the error came from TMDB
      console.error('TMDB request failed:', err.message);
      return res.status(502).json({ error: 'Could not reach TMDB' });
    }
    console.error('genie failed:', err.message);
    res.status(500).json({ error: 'The genie could not answer' });
  }
});

export default genieRouter;

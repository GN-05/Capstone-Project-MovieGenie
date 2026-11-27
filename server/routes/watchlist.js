import express from 'express';
import mongoose from 'mongoose';
import { WatchlistItem } from '../models/WatchlistItem.js';
import { getMovie } from '../services/tmdb.js';
import { applyWatchRules } from '../services/watchlist.js';
import { requireAccount } from '../middleware/requireAccount.js';
import {
  validate, validateQuery,
  WatchlistInput, WatchlistUpdate, WatchlistQuery,
} from '../middleware/validate.js';

// every route here runs after requireAuth, so req.userId is set
const watchlistRouter = express.Router();

// stops a bad id before Mongo sees it
function requireValidId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  next();
}

// read all: the user's list, newest first; ?watched=true|false filters it
watchlistRouter.get('/', validateQuery(WatchlistQuery), async (req, res) => {
  const filter = { userId: req.userId };
  if (req.filters.watched !== undefined) {
    filter.watched = req.filters.watched === 'true';
  }
  try {
    res.json(await WatchlistItem.find(filter).sort({ createdAt: -1 }));
  } catch (err) {
    console.error('watchlist list failed:', err.message);
    res.status(500).json({ error: 'Could not load the watchlist' });
  }
});

// read one
watchlistRouter.get('/:id', requireValidId, async (req, res) => {
  try {
    const item = await WatchlistItem.findOne(
      { _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ error: 'Movie not found' });
    res.json(item);
  } catch (err) {
    console.error('watchlist read failed:', err.message);
    res.status(500).json({ error: 'Could not load the movie' });
  }
});

// create: the client sends the TMDB id and whether it was watched;
// the server looks up the rest
watchlistRouter.post('/', validate(WatchlistInput), requireAccount, async (req, res) => {
  const { tmdbId, watched } = req.body;
  let movie;
  try {
    movie = await getMovie(tmdbId);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: 'No such movie on TMDB' });
    }
    console.error('TMDB lookup failed:', err.message);
    return res.status(502).json({ error: 'Could not reach TMDB' });
  }

  try {
    const item = await WatchlistItem.create({
      userId: req.userId,   // the owner comes from the token
      tmdbId: movie.tmdbId,
      title: movie.title,
      posterPath: movie.posterPath,
      releaseYear: movie.releaseYear,
      voteAverage: movie.voteAverage,
      ...movie.features,
      watched,
      watchedAt: watched ? new Date() : null,
    });
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) {   // the unique index said no
      return res.status(409).json({ error: 'Already on your watchlist' });
    }
    console.error('watchlist create failed:', err.message);
    res.status(500).json({ error: 'Could not save the movie' });
  }
});

// update: watched and rating are the only fields a user can change,
// and a rating needs a watched movie
watchlistRouter.patch('/:id', requireValidId, validate(WatchlistUpdate),
  async (req, res) => {
    const filter = { _id: req.params.id, userId: req.userId };
    try {
      const current = await WatchlistItem.findOne(filter);
      if (!current) return res.status(404).json({ error: 'Movie not found' });

      const { error, update } = applyWatchRules(current, req.body);
      if (error) return res.status(400).json({ error });

      const item = await WatchlistItem.findOneAndUpdate(filter, update,
        { returnDocument: 'after', runValidators: true });
      if (!item) return res.status(404).json({ error: 'Movie not found' });
      res.json(item);
    } catch (err) {
      console.error('watchlist update failed:', err.message);
      res.status(500).json({ error: 'Could not update the movie' });
    }
  });

// delete
watchlistRouter.delete('/:id', requireValidId, async (req, res) => {
  try {
    const item = await WatchlistItem.findOneAndDelete(
      { _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ error: 'Movie not found' });
    res.status(204).end();
  } catch (err) {
    console.error('watchlist delete failed:', err.message);
    res.status(500).json({ error: 'Could not remove the movie' });
  }
});

export default watchlistRouter;

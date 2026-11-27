import express from 'express';
import {
  getTrending, getTopRated, discoverMovies, searchMovies,
  getGenres, getProviders, getMovie,
} from '../services/tmdb.js';
import {
  validateQuery, ListQuery, DiscoverQuery, SearchQuery, CountryQuery,
} from '../middleware/validate.js';

// public routes: browsing needs no account
const moviesRouter = express.Router();

// one place decides how a TMDB failure is reported
function tmdbFailed(res, err) {
  if (err.status === 404) {
    return res.status(404).json({ error: 'Movie not found' });
  }
  console.error('TMDB request failed:', err.message);
  res.status(502).json({ error: 'Could not reach TMDB' });
}

moviesRouter.get('/trending', validateQuery(ListQuery), async (req, res) => {
  try {
    res.json(await getTrending(req.filters.page));
  } catch (err) {
    tmdbFailed(res, err);
  }
});

moviesRouter.get('/top-rated', validateQuery(ListQuery), async (req, res) => {
  try {
    res.json(await getTopRated(req.filters.page));
  } catch (err) {
    tmdbFailed(res, err);
  }
});

moviesRouter.get('/search', validateQuery(SearchQuery), async (req, res) => {
  try {
    res.json(await searchMovies(req.filters.q, req.filters.page));
  } catch (err) {
    tmdbFailed(res, err);
  }
});

moviesRouter.get('/genres', async (req, res) => {
  try {
    res.json(await getGenres());
  } catch (err) {
    tmdbFailed(res, err);
  }
});

// GET /api/movies/discover?sort=newest&genre=28&provider=8&country=LB&page=2
moviesRouter.get('/discover', validateQuery(DiscoverQuery), async (req, res) => {
  try {
    res.json(await discoverMovies(req.filters));
  } catch (err) {
    tmdbFailed(res, err);
  }
});

// the streaming platforms of a country
moviesRouter.get('/providers', validateQuery(CountryQuery), async (req, res) => {
  try {
    res.json(await getProviders(req.filters.country));
  } catch (err) {
    tmdbFailed(res, err);
  }
});

// last, so it does not catch /trending, /search, …
moviesRouter.get('/:id', validateQuery(CountryQuery), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const movie = await getMovie(id, req.filters.country);
    delete movie.features;   // only the genie needs them
    res.json(movie);
  } catch (err) {
    tmdbFailed(res, err);
  }
});

export default moviesRouter;

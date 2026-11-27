import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth.js';
import moviesRouter from './routes/movies.js';
import watchlistRouter from './routes/watchlist.js';
import genieRouter from './routes/genie.js';
import usersRouter from './routes/users.js';
import { requireAuth } from './middleware/requireAuth.js';

// a query filter may only hold plain values, never { $ne: … }
mongoose.set('sanitizeFilter', true);

// Browsing loads a new page of movies every few seconds of scrolling, so
// the general limit is generous; the login limit below stays strict.
const apiLimiter = rateLimit({
  windowMs: 15 * 60_000,   // 15 minutes
  limit: 1000,
  message: { error: 'Too many requests. Try again later.' },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  message: { error: 'Too many attempts. Try again later.' },
});

const app = express();

app.use(helmet());   // first, before routes
app.set('trust proxy', 1);                  // behind a host's proxy
app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json({ limit: '10kb' }));   // cap body size
app.use('/api', apiLimiter);
app.use('/api/auth/login', loginLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// public
app.use('/api/auth', authRouter);
app.use('/api/movies', moviesRouter);

// locked
app.use('/api/watchlist', requireAuth, watchlistRouter);
app.use('/api/genie', requireAuth, genieRouter);
app.use('/api/users', requireAuth, usersRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// errors raised before a route runs (bad or oversized JSON) and anything
// unexpected: answer in JSON, and never send a stack trace to the client
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

export default app;

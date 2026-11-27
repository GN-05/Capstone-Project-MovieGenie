import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, it, expect } from 'vitest';
import app from '../app.js';

// no port and no database needed: these requests stop before any query
const token = jwt.sign({ sub: 'u1' }, process.env.JWT_SECRET);

describe('/api/health', () => {
  it('answers ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('/api/watchlist', () => {
  it('rejects a missing token', async () => {
    const res = await request(app).get('/api/watchlist');
    expect(res.status).toBe(401);
  });

  it('rejects a token signed with another secret', async () => {
    const forged = jwt.sign({ sub: 'u1' }, 'not-our-secret');
    const res = await request(app).get('/api/watchlist')
      .set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('rejects a tmdbId that is not a number', async () => {
    const res = await request(app).post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 'abc' });
    expect(res.status).toBe(400);
  });

  it('rejects a watched value that is not true or false', async () => {
    const res = await request(app).post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ tmdbId: 27205, watched: 'yes' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'watched must be true or false' });
  });

  it('rejects a rating above 5', async () => {
    const res = await request(app)
      .patch('/api/watchlist/66f1c2e4b7a1d3f0c8e2a9b1')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 9 });
    expect(res.status).toBe(400);
  });

  it('rejects an id that is not an ObjectId', async () => {
    const res = await request(app).delete('/api/watchlist/123')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid id' });
  });
});

describe('/api/auth', () => {
  it('rejects a short password on signup', async () => {
    const res = await request(app).post('/api/auth/signup')
      .send({ email: 'a@b.co', password: 'short', displayName: 'A' });
    expect(res.status).toBe(400);
  });

  it('rejects an object where the email should be (injection)', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: { $ne: '' }, password: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('/api/users/me (settings)', () => {
  it('rejects a missing token', async () => {
    const res = await request(app).patch('/api/users/me')
      .send({ country: 'FR' });
    expect(res.status).toBe(401);
  });

  it('rejects a country that is not a 2-letter code', async () => {
    const res = await request(app).patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ country: 'France' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Country must be a 2-letter code' });
  });

  it('rejects an update with nothing it may change (email is not one)', async () => {
    const res = await request(app).patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'new@uni.edu' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Send displayName or country' });
  });

  it('rejects a new password shorter than 8 characters', async () => {
    const res = await request(app).patch('/api/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'whatever1', newPassword: 'short' });
    expect(res.status).toBe(400);
  });

  it('refuses to delete the account without the password', async () => {
    const res = await request(app).delete('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('/api/genie', () => {
  it('rejects a missing token', async () => {
    const res = await request(app).post('/api/genie')
      .send({ seedTmdbIds: [1] });
    expect(res.status).toBe(401);
  });

  it('rejects more than 10 seeds', async () => {
    const res = await request(app).post('/api/genie')
      .set('Authorization', `Bearer ${token}`)
      .send({ seedTmdbIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] });
    expect(res.status).toBe(400);
  });

  it('rejects an ask with no seeds and no whole watchlist', async () => {
    const res = await request(app).post('/api/genie')
      .set('Authorization', `Bearer ${token}`)
      .send({ seedTmdbIds: [] });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Pick at least one saved movie' });
  });
});

describe('errors', () => {
  it('answers unknown routes with JSON', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('answers broken JSON with a 400, not a stack trace', async () => {
    const res = await request(app).post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid JSON' });
  });
});

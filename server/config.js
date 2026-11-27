// crash at startup if a required setting is missing
for (const key of ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_ORIGIN', 'TMDB_API_KEY']) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

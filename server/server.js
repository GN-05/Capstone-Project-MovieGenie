import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const dbUri = process.env.MONGODB_URI;
const port = Number(process.env.PORT) || 3000;

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

// lets the client (and us) check that the API is up
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// connect first, then listen
try {
  await mongoose.connect(dbUri);
  console.log('connected to MongoDB');
  app.listen(port, () => console.log(
    `API listening on http://localhost:${port}`));
} catch (err) {
  console.error('DB connection failed:', err.message);
  process.exit(1);
}

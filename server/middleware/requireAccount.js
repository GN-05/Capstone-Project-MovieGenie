import mongoose from 'mongoose';
import { User } from '../models/User.js';

// A token stays valid for up to an hour, even after its account is deleted.
// Routes that create data run this after requireAuth, so an old token can
// never save anything for an account that no longer exists.
export async function requireAccount(req, res, next) {
  try {
    const exists = mongoose.isValidObjectId(req.userId)
      && await User.exists({ _id: req.userId });
    if (!exists) {
      return res.status(401).json({ error: 'This account no longer exists' });
    }
    next();
  } catch (err) {
    console.error('account check failed:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
}

import express from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { WatchlistItem } from '../models/WatchlistItem.js';
import { GenieRequest } from '../models/GenieRequest.js';
import { publicUser } from './auth.js';
import { requireAccount } from '../middleware/requireAccount.js';
import {
  validate, ProfileUpdate, PasswordChange, AccountDelete,
} from '../middleware/validate.js';

// every route here runs after requireAuth, so req.userId is set;
// "me" is always the user in the token, never an id from the request
const usersRouter = express.Router();

// the routes that check a password get the same limit as login
const passwordLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  message: { error: 'Too many attempts. Try again later.' },
});

// the user's own account, with its password checked; answers null if the
// password is wrong. That is answered with 400, not 401: the user is logged
// in, they only mistyped, and a 401 would log them out (see apiFetch).
async function checkedUser(userId, password) {
  const user = await User.findById(userId);
  const ok = user && await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

// update: display name and/or country
usersRouter.patch('/me', validate(ProfileUpdate), requireAccount,
  async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(req.userId, req.body,
        { returnDocument: 'after', runValidators: true });
      res.json(publicUser(user));
    } catch (err) {
      console.error('profile update failed:', err.message);
      res.status(500).json({ error: 'Could not save your settings' });
    }
  });

// change the password: the current one first
usersRouter.patch('/me/password', passwordLimiter, validate(PasswordChange),
  requireAccount,
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
      const user = await checkedUser(req.userId, currentPassword);
      if (!user) {
        return res.status(400).json({ error: 'Current password is wrong' });
      }
      user.passwordHash = await bcrypt.hash(newPassword, 12);
      await user.save();
      res.status(204).end();
    } catch (err) {
      console.error('password change failed:', err.message);
      res.status(500).json({ error: 'Could not change your password' });
    }
  });

// delete the account and everything it owns
usersRouter.delete('/me', passwordLimiter, validate(AccountDelete),
  requireAccount,
  async (req, res) => {
    try {
      const user = await checkedUser(req.userId, req.body.password);
      if (!user) {
        return res.status(400).json({ error: 'Password is wrong' });
      }
      await WatchlistItem.deleteMany({ userId: user._id });
      await GenieRequest.deleteMany({ userId: user._id });
      await user.deleteOne();
      res.status(204).end();
    } catch (err) {
      console.error('account delete failed:', err.message);
      res.status(500).json({ error: 'Could not delete your account' });
    }
  });

export default usersRouter;

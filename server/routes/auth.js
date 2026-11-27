import express from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { signToken } from '../auth/token.js';
import { validate, SignupInput, LoginInput } from '../middleware/validate.js';

const authRouter = express.Router();

// what the client may know about a user: never the hash
export function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName,
    country: user.country,
  };
}

authRouter.post('/signup', validate(SignupInput), async (req, res) => {
  const { email, password, displayName, country } = req.body;
  try {
    if (await User.findOne({ email })) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create(
      { email, passwordHash, displayName, country });
    res.status(201).json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    // two signups with the same email at the same moment: both pass the
    // findOne check, and the unique index stops the second one
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('signup failed:', err.message);
    res.status(500).json({ error: 'Could not create the account' });
  }
});

authRouter.post('/login', validate(LoginInput), async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    const ok = user &&
      await bcrypt.compare(password, user.passwordHash);
    const error = 'Invalid email or password';
    if (!ok) return res.status(401).json({ error });
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('login failed:', err.message);
    res.status(500).json({ error: 'Could not log in' });
  }
});

export default authRouter;

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String, required: true,
    unique: true, lowercase: true, trim: true,
  },
  passwordHash: { type: String, required: true },
  displayName: { type: String, required: true, trim: true, maxlength: 40 },
  country: { type: String, default: 'LB' },   // for "where to watch"
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);

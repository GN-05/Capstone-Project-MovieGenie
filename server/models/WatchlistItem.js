import mongoose from 'mongoose';

const watchlistItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tmdbId: { type: Number, required: true },
    mediaType: { type: String, default: 'movie' },

    // cached from TMDB when the movie is saved
    title: { type: String, required: true, trim: true },
    posterPath: { type: String, default: '' },
    releaseYear: { type: Number, default: null },
    voteAverage: { type: Number, default: 0 },

    // genie features, also cached when the movie is saved
    genreIds: { type: [Number], default: [] },
    keywordIds: { type: [Number], default: [] },
    castIds: { type: [Number], default: [] },
    directorId: { type: Number, default: null },

    // the fields the user can edit
    watched: { type: Boolean, default: true },   // saved = seen, unless told otherwise
    rating: { type: Number, default: null },     // 1 to 5, or null; only when watched
    watchedAt: { type: Date, default: Date.now },   // when it was marked watched, or null
  },
  { timestamps: true }
);

// a user cannot save the same title twice
watchlistItemSchema.index(
  { userId: 1, tmdbId: 1, mediaType: 1 }, { unique: true });
// matches: find({ userId }).sort({ createdAt: -1 })
watchlistItemSchema.index({ userId: 1, createdAt: -1 });

export const WatchlistItem =
  mongoose.model('WatchlistItem', watchlistItemSchema);

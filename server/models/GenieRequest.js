import mongoose from 'mongoose';

const genieRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    seedTmdbIds: { type: [Number], required: true },
    filters: {
      genreId: { type: Number, default: null },
      yearFrom: { type: Number, default: null },
      yearTo: { type: Number, default: null },
      minRating: { type: Number, default: null },
    },
    // the ranked picks, best first
    results: [{
      _id: false,
      tmdbId: Number,
      title: String,
      posterPath: String,
      releaseYear: Number,
      voteAverage: Number,
      score: Number,
      reasons: [String],
    }],
  },
  { timestamps: true }
);

// matches: find({ userId }).sort({ createdAt: -1 })
genieRequestSchema.index({ userId: 1, createdAt: -1 });

export const GenieRequest =
  mongoose.model('GenieRequest', genieRequestSchema);

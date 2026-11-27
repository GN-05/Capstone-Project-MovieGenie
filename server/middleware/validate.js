import { z } from 'zod';

const THIS_YEAR = new Date().getFullYear();

// ---- request bodies ----

export const SignupInput = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(200),
  password: z.string()
    .min(8, 'Password must be at least 8 characters').max(72),
  displayName: z.string().trim()
    .min(1, 'Display name is required').max(40),
  country: z.string().trim().toUpperCase()
    .length(2, 'Country must be a 2-letter code').default('LB'),
});

export const LoginInput = z.object({
  email: z.string().trim().toLowerCase().max(200),
  password: z.string().max(72),
});

// the settings page: only these two fields can change (never the email)
export const ProfileUpdate = z.object({
  displayName: z.string().trim()
    .min(1, 'Display name is required').max(40).optional(),
  country: z.string().trim().toUpperCase()
    .length(2, 'Country must be a 2-letter code').optional(),
}).refine(
  data => data.displayName !== undefined || data.country !== undefined,
  'Send displayName or country'
);

export const PasswordChange = z.object({
  currentPassword: z.string('Enter your current password').max(72),
  newPassword: z.string('Enter a new password')
    .min(8, 'New password must be at least 8 characters').max(72),
});

// deleting the account asks for the password again
export const AccountDelete = z.object({
  password: z.string('Enter your password').max(72),
});

export const WatchlistInput = z.object({
  tmdbId: z.number('tmdbId must be a number').int().positive(),
  // saved as "watched" or as "to watch"
  watched: z.boolean('watched must be true or false').default(true),
});

export const WatchlistUpdate = z.object({
  watched: z.boolean('watched must be true or false').optional(),
  rating: z.number('rating must be a number from 1 to 5')
    .int().min(1).max(5).nullable().optional(),
}).refine(
  data => data.watched !== undefined || data.rating !== undefined,
  'Send watched or rating'
);

// Two ways to ask: wholeWatchlist true (the server chooses the seeds), or a
// list of 1 to 10 movies picked by the user.
export const GenieInput = z.object({
  wholeWatchlist: z.boolean().default(false),
  seedTmdbIds: z.array(z.number().int().positive())
    .max(10, 'Pick at most 10 saved movies').default([]),
  genreId: z.number().int().positive().nullable().default(null),
  yearFrom: z.number().int().min(1900).max(THIS_YEAR + 1)
    .nullable().default(null),
  yearTo: z.number().int().min(1900).max(THIS_YEAR + 1)
    .nullable().default(null),
  minRating: z.number().min(0).max(10).nullable().default(null),
}).refine(
  data => data.wholeWatchlist || data.seedTmdbIds.length > 0,
  'Pick at least one saved movie'
).refine(
  data => !data.yearFrom || !data.yearTo || data.yearFrom <= data.yearTo,
  'The era must start before it ends'
);

// ---- query strings (every value arrives as a string) ----

export const ListQuery = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export const DiscoverQuery = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  sort: z.enum(['popular', 'newest', 'oldest', 'rating-high', 'rating-low',
    'title-az', 'title-za']).default('popular'),
  genre: z.coerce.number().int().positive().optional(),
  provider: z.coerce.number().int().positive().optional(),
  country: z.string().trim().toUpperCase().length(2).default('LB'),
  top: z.enum(['true']).optional(),   // only well-rated movies
});

export const CountryQuery = z.object({
  country: z.string().trim().toUpperCase().length(2).default('LB'),
});

export const SearchQuery = z.object({
  q: z.string('Type something to search').trim()
    .min(1, 'Type something to search').max(100),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export const WatchlistQuery = z.object({
  watched: z.enum(['true', 'false']).optional(),
});

// ---- middleware ----

export const validate = schema => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const msg = result.error.issues[0].message;
    return res.status(400).json({ error: msg });
  }
  req.body = result.data;   // only declared fields
  next();
};

// same check for the query string; the clean values go in req.filters
export const validateQuery = schema => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const msg = result.error.issues[0].message;
    return res.status(400).json({ error: msg });
  }
  req.filters = result.data;
  next();
};

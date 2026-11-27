# MovieGenie: database schema (final for Milestone 1)

MongoDB Atlas with Mongoose. Three collections. Every private document carries a
`userId`, set from the token (`req.userId`) and never from the request body.

```
            ┌────────────────────────┐
            │         users          │
            └───────────▲────────────┘
        userId (ref)    │    userId (ref)
        ┌───────────────┴───────────────┐
┌───────┴────────────┐        ┌─────────┴──────────┐
│   watchlistitems   │        │   genierequests    │
└───────┬────────────┘        └─────────┬──────────┘
        │ tmdbId                        │ seedTmdbIds, results.tmdbId
        ▼                               ▼
   ┌─────────────────────────────────────────────┐
   │ TMDB API (external, called only by Express)  │
   └─────────────────────────────────────────────┘
```

One user has many watchlist items and many genie requests. Deleting a user
(Settings) deletes their watchlist items and genie requests too, so nothing is
left pointing at a missing user.

## users

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | created by MongoDB |
| `email` | String | required, unique, trimmed, lowercase |
| `passwordHash` | String | required; bcrypt hash, cost 12. The plain password is never stored |
| `displayName` | String | required, trimmed, 1 to 40 characters; editable in Settings |
| `country` | String | 2-letter code for "where to watch", default `'LB'`; editable in Settings |
| `createdAt`, `updatedAt` | Date | added by `{ timestamps: true }` |

## watchlistitems

The main resource: create (save a movie), read (show the list), update (watched
and rating), delete (remove).

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | created by MongoDB |
| `userId` | ObjectId, ref `'User'` | required; the owner |
| `tmdbId` | Number | required; the movie's id on TMDB |
| `mediaType` | String | `'movie'` or `'tv'`, default `'movie'` (TV is a nice-to-have) |
| `title` | String | required; cached so the list shows without calling TMDB |
| `posterPath` | String | cached, may be empty |
| `releaseYear` | Number | cached |
| `voteAverage` | Number | cached TMDB rating, 0 to 10 |
| `genreIds` | [Number] | cached TMDB genre ids; genie feature |
| `keywordIds` | [Number] | cached TMDB keyword ids; genie feature |
| `castIds` | [Number] | cached ids of the top 5 cast members; genie feature |
| `directorId` | Number | cached id of the director, or `null`; genie feature |
| `watched` | Boolean | chosen when the movie is saved ("To watch" or "Watched"), `true` when not sent; **editable** |
| `rating` | Number | whole number 1 to 5, or `null` when not rated; **editable**, only while `watched` is true (marking a movie not watched sets it back to `null`) |
| `watchedAt` | Date | when the movie was marked watched, or `null` while it is not; set by the server, used to sort by "latest watched" |
| `createdAt`, `updatedAt` | Date | added by `{ timestamps: true }` |

Indexes:

- `{ userId: 1, tmdbId: 1, mediaType: 1 }`, unique: a user cannot save the same title twice (the API answers 409).
- `{ userId: 1, createdAt: -1 }`: matches the watchlist query, newest first.

The four genie feature fields are filled once, by the server, when the movie is
saved. That is why asking the genie needs no TMDB request for the saved movies.

## genierequests

One document per "Ask the genie" run: what was asked and what was answered.
It is written on every ask; no screen lists the past runs yet.

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | created by MongoDB |
| `userId` | ObjectId, ref `'User'` | required; the owner |
| `seedTmdbIds` | [Number] | required, 1 to 10 ids taken from the user's watchlist |
| `filters.genreId` | Number | optional TMDB genre id |
| `filters.yearFrom` | Number | optional start of the era |
| `filters.yearTo` | Number | optional end of the era |
| `filters.minRating` | Number | optional, 0 to 10 |
| `results` | [Object] | the ranked picks, best first, at most 10 |
| `results[].tmdbId` | Number | the recommended movie |
| `results[].title` | String | cached |
| `results[].posterPath` | String | cached |
| `results[].releaseYear` | Number | cached |
| `results[].voteAverage` | Number | cached TMDB rating |
| `results[].score` | Number | final score, 0 to 1 |
| `results[].reasons` | [String] | for example `"Because you saved Inception"` |
| `createdAt`, `updatedAt` | Date | added by `{ timestamps: true }` |

Index: `{ userId: 1, createdAt: -1 }` for the history list.

## Changes from the proposal sketch

- `watchlistitems` gained `watched` and `rating` (the editable fields that make the
  resource full CRUD) and the cached genie features.
- `genierequests` stores `results` with a score and reasons instead of a bare list
  of ids, so a past run can be shown again without recomputing it.
- `addedAt` became the `createdAt` that Mongoose timestamps provide.

## Where each screen's data lives

| Screen | Data | Source |
|---|---|---|
| Sign up, Log in | email, password, display name, country | `users` |
| Settings | display name, country, password; delete | `users` (+ the user's `watchlistitems` and `genierequests` on delete) |
| Browse, Search | trending, top rated, by genre, by platform, sorted, search results | TMDB through Express |
| Movie detail | overview, runtime, genres, director, cast | TMDB through Express |
| Movie detail | "saved?" state | `watchlistitems` |
| Watchlist | saved titles, watched, rating | `watchlistitems` |
| Ask the genie | seed choices | `watchlistitems` |
| Ask the genie | picks and reasons | computed by the server, saved in `genierequests` |

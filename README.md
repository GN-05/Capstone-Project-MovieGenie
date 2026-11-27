# MovieGenie

MovieGenie ends the nightly "what should we watch?" scroll. You save the movies
you love to a watchlist, then ask the genie: it turns the saved titles you pick
into a short, ranked list of recommendations, and explains each one.

Capstone project for the Web Development course.
Team: Vanessa Badr, Ghadi Nehme, Elie Hadchity.

**Status: Milestone 2** (the back end works: authentication plus the CRUD
routes; the React screens come in Milestone 3). The proposal is in
[docs/proposal.md](docs/proposal.md).

## Tech stack

| Layer | Choice |
|---|---|
| Front end | React (JavaScript) with Vite, React Router, plain CSS, lucide-react icons |
| Back end | Node.js with Express, as ES modules |
| Database | MongoDB Atlas with Mongoose |
| Authentication | bcrypt password hashes (cost 12), JWT (1 hour) sent as `Authorization: Bearer` |
| Validation and security | zod, helmet, express-rate-limit, Mongoose `sanitizeFilter` |
| Third-party API | TMDB, called only from the server so the key stays secret |
| Tests | Vitest on both sides, with Supertest (server) and React Testing Library (client) |

## Project structure

```
Movie_claude/
├── client/                    # Vite + React (the scaffold; screens in Milestone 3)
│   ├── src/                   # App.jsx checks that the API answers
│   └── .env.example
├── server/                    # Express · http://localhost:3000
│   ├── app.js                 # middleware and routes (no port: testable)
│   ├── server.js              # connects to MongoDB, then listens
│   ├── config.js              # stops the server if a setting is missing
│   ├── auth/token.js          # signToken, verifyToken
│   ├── middleware/
│   │   ├── requireAuth.js     # checks the token, sets req.userId
│   │   ├── requireAccount.js  # the token's account still exists
│   │   └── validate.js        # zod schemas and the validate middleware
│   ├── models/                # User, WatchlistItem, GenieRequest
│   ├── routes/                # auth, users (settings), movies, watchlist, genie
│   ├── services/
│   │   ├── tmdb.js            # every TMDB request, with a cache
│   │   ├── movieRules.js      # which movies are trusted (rating, 300+ votes)
│   │   └── genie.js           # the ranking: pure functions
│   ├── tests/                 # api, genie and watchlist tests
│   └── .env.example
└── docs/
    ├── proposal.md            # the one-page proposal
    ├── wireframes.md          # every main screen and how users move between them
    ├── schema.md              # collections, fields, types and references
    └── genie-ranking.md       # how picks are merged, weighted and filtered
```

## Setup

You need Node.js 22.22 or later (or 24.15 or later), a MongoDB Atlas connection
string and a TMDB API key.

### 1. Server

```sh
cd server
npm install
cp .env.example .env
```

Open `server/.env` and fill in:

- `MONGODB_URI`: your Atlas connection string.
- `JWT_SECRET`: a long random string. Generate one with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `TMDB_API_KEY`: the v3 "API Key" from https://www.themoviedb.org/settings/api.

Then start it:

```sh
npm run dev
```

It prints `connected to MongoDB` and `API listening on http://localhost:3000`.
If a setting is missing, it stops and names it.

### 2. Client

The client is still the Milestone 1 scaffold: see the client steps there. It
only checks that the API answers.

### 3. Tests

```sh
cd server && npm test    # the genie's ranking, the watched rule, and the API's 401 and 400
                         # cases (auth, watchlist, genie, settings)
```

The tests need no database and no TMDB key.

## API

Errors always have the shape `{ "error": "message" }`.
🔒 = needs the header `Authorization: Bearer <token>`.

### Authentication

| Method and path | Body | Answers |
|---|---|---|
| `POST /api/auth/signup` | `{ email, password, displayName, country? }` | 201 `{ token, user }` · 400 bad input · 409 email taken |
| `POST /api/auth/login` | `{ email, password }` | 200 `{ token, user }` · 401 wrong email or password · 429 after 5 tries in 15 minutes |

### Movies (public, from TMDB)

| Method and path | Answers |
|---|---|
| `GET /api/movies/trending?page=1` | 200 `{ page, totalPages, results }` |
| `GET /api/movies/top-rated?page=1` | same |
| `GET /api/movies/discover?sort=newest&genre=28&provider=8&country=LB&top=true&page=1` | same, sorted and filtered; every parameter is optional · 400 unknown `sort` |
| `GET /api/movies/search?q=inception&page=1` | same · 400 empty `q` |
| `GET /api/movies/genres` | 200 `[{ id, name }]` |
| `GET /api/movies/providers?country=LB` | 200 the streaming platforms of a country `[{ id, name, logoPath }]` |
| `GET /api/movies/:id?country=LB` | 200 one movie: overview, runtime, genres, director, cast, trailer, providers · 404 |

`sort` is one of `popular`, `newest`, `oldest`, `rating-high`, `rating-low`,
`title-az`, `title-za`. A TMDB failure is answered with 502 `Could not reach TMDB`.

### Watchlist 🔒

| Method and path | Body | Answers |
|---|---|---|
| `GET /api/watchlist?watched=true` | | 200 the user's items, newest first |
| `GET /api/watchlist/:id` | | 200 · 400 bad id · 404 |
| `POST /api/watchlist` | `{ tmdbId, watched? }` (`watched` is `true` when not sent) | 201 the new item · 400 · 404 unknown movie · 409 already saved |
| `PATCH /api/watchlist/:id` | `{ watched?, rating? }` (rating 1 to 5, or `null`) | 200 the updated item · 400 bad input, or a rating on a movie not watched · 404 |
| `DELETE /api/watchlist/:id` | | 204 · 400 bad id · 404 |

Every query is filtered by the user in the token. Another user's item answers 404.

### Settings 🔒

"me" is always the user in the token. The email cannot be changed.

| Method and path | Body | Answers |
|---|---|---|
| `PATCH /api/users/me` | `{ displayName?, country? }` | 200 the updated user · 400 |
| `PATCH /api/users/me/password` | `{ currentPassword, newPassword }` (8+ characters) | 204 · 400 bad input or wrong current password · 429 after 5 tries in 15 minutes |
| `DELETE /api/users/me` | `{ password }` | 204, and the user's watchlist and genie requests are deleted too · 400 bad input or wrong password · 429 |

A wrong password answers 400, not 401: the user is still logged in, and the
client logs out on any 401. A token outlives a deleted account by up to an
hour, so the routes that create data (and these three) first check that the
account still exists, and answer 401 if not.

### Genie 🔒

| Method and path | Body | Answers |
|---|---|---|
| `POST /api/genie` | `{ seedTmdbIds }` or `{ wholeWatchlist: true }`, plus optional `genreId`, `yearFrom`, `yearTo`, `minRating` | 201 the request with its ranked `results` · 400 |

`seedTmdbIds` holds 1 to 10 TMDB ids of watched movies on the user's watchlist. With
`wholeWatchlist`, the server takes the user's 10 best rated watched movies of
`genreId` (of any genre when it is absent).

### Try it with curl

```sh
# 1 · no token
curl -i localhost:3000/api/watchlist                     # 401

# 2 · Alice signs up; copy the token from the answer
curl -X POST localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@uni.edu","password":"hunter222","displayName":"Alice"}'
TOKEN=paste-the-token-here

# 3 · save Inception, rate it, list, ask the genie
curl -X POST localhost:3000/api/watchlist \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"tmdbId":27205}'
curl -X PATCH localhost:3000/api/watchlist/PASTE-THE-_id \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"watched":true,"rating":5}'
curl localhost:3000/api/watchlist -H "Authorization: Bearer $TOKEN"
curl -X POST localhost:3000/api/genie \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"seedTmdbIds":[27205],"minRating":7}'
```

## Features (back end)

- **Accounts:** signup and login, passwords hashed with bcrypt (cost 12), a JWT
  (1 hour) returned at login. `requireAuth` locks the watchlist, the genie and
  the settings; a missing or bad token answers 401, never a crash.
- **Watchlist (the main resource):** full CRUD, every query scoped to the user
  in the token; another user's item answers 404. A movie is saved as "to
  watch" or "watched"; only a watched movie can be rated 1 to 5.
- **Movies:** trending, top rated, by genre and platform, sorted, search, one
  movie with cast and where to watch, all from TMDB through our server, with a
  cache. Movies with no rating or fewer than 300 votes are dropped.
- **Ask the Genie:** ranks recommendations from the user's watched movies; see
  [docs/genie-ranking.md](docs/genie-ranking.md).
- **Settings:** change display name, country and password; delete the account
  and everything it owns.
- **Security:** zod validation on every input, helmet, rate limits (5 logins
  per 15 minutes), `sanitizeFilter`, secrets only in `.env`.

Every route can be tried with curl (above).

## Architecture overview

```
React component ─▶ apiFetch ─▶ Express middleware ─▶ route ─▶ MongoDB
   (client)        base URL     helmet, rate limit,    │
                   + token      requireAuth, validate  └▶ services ─▶ TMDB API
```

The browser talks only to our Express API. The API owns the database and is the
only part that calls TMDB. The genie's ranking lives in `server/services/genie.js`
as pure functions, so it is tested without a server, a database or the network.

## Credits

This product uses the TMDB API but is not endorsed or certified by TMDB.

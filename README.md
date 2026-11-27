# MovieGenie

MovieGenie ends the nightly "what should we watch?" scroll. You save the movies
you love to a watchlist, then ask the genie: it turns the saved titles you pick
into a short, ranked list of recommendations, and explains each one.

Capstone project for the Web Development course.
Team: Vanessa Badr, Ghadi Nehme, Elie Hadchity.

**Status: Milestone 4** (deployed: the app, the API and the database all run
online).

## Live

| | Address |
|---|---|
| App (Netlify) | https://your-site-name.netlify.app |
| API (Render) | https://your-api-name.onrender.com · check it at `/api/health` |

The API runs on Render's free plan, which sleeps when nobody uses it: the first
request after a quiet while can take about 30 seconds.

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
├── client/                    # Vite + React · hosted on Netlify
│   ├── src/
│   │   ├── api/client.js      # apiFetch: base URL, token, errors
│   │   ├── auth/              # AuthContext (login, signup, logout, settings),
│   │   │                      # RequireAuth
│   │   ├── watchlist/         # WatchlistContext: the saved movies, shared app-wide
│   │   ├── genie/             # GenieContext: the current ask, kept across pages
│   │   ├── hooks/             # useApi (one GET), useMovies (paged lists)
│   │   ├── components/        # Header, Footer, BrowseControls, MovieGrid,
│   │   │                      # MovieCard, Poster, SaveButton, StarRating
│   │   ├── pages/             # Browse, Movie, Login, Signup, Watchlist, Genie,
│   │   │                      # Settings, NotFound
│   │   ├── utils/             # movies.js (pure helpers), countries.js
│   │   ├── App.jsx            # routes; pages are loaded on demand
│   │   ├── main.jsx           # mounts React inside the providers
│   │   └── index.css          # design tokens and styles
│   ├── public/_redirects      # Netlify: every address serves the React app
│   └── .env.example
├── server/                    # Express · hosted on Render
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
├── .github/workflows/ci.yml   # runs both test suites on every push
└── docs/
    ├── proposal.md            # the one-page proposal
    ├── wireframes.md          # every main screen and how users move between them
    ├── schema.md              # collections, fields, types and references
    └── genie-ranking.md       # how picks are merged, weighted and filtered
```

## Run it on your own computer

You need Node.js 22.22 or later (or 24.15 or later), a MongoDB Atlas connection
string and a TMDB API key. Older versions of Node cannot run the client's tests:
jsdom, the fake browser they run in, needs one of these. Check yours with
`node -v`.

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
- `CLIENT_ORIGIN`: the address of the React app, exactly as Vite prints it in
  step 2, with no trailing slash.

Then start it:

```sh
npm run dev
```

It prints `connected to MongoDB` and `API listening on port 3000`.
If a setting is missing, it stops and names it.

### 2. Client

In a second terminal:

```sh
cd client
npm install
cp .env.example .env.development
npm run dev
```

In `client/.env.development`, set `VITE_API_URL` to the address of your API
(the one the server printed, with its port). Then open the address Vite prints.
The Browse page shows this week's trending movies.

### 3. Tests

```sh
cd server && npm test    # the genie's ranking, the watched rule, and the API's 401 and 400
                         # cases (auth, watchlist, genie, settings)
cd client && npm test    # the star rating component and the list helpers
```

The tests need no database and no TMDB key.

## Deployment

Three pieces, three hosts: the database on MongoDB Atlas, the API on Render, the
React app on Netlify. The browser talks only to the API; only the API talks to
the database and to TMDB.

| Host | Settings |
|---|---|
| MongoDB Atlas | Network Access allows `0.0.0.0/0`, so Render can connect |
| Render (web service) | Root directory `server` · build `npm ci` · start `npm start` · environment variables `MONGODB_URI`, `JWT_SECRET` (a new one, not the development one), `CLIENT_ORIGIN` (the Netlify address), `TMDB_API_KEY`, `NODE_ENV=production`; Render sets `PORT` itself |
| Netlify (site) | Base directory `client` · build `npm run build` · publish `client/dist` · environment variable `VITE_API_URL` (the Render address) |

`client/public/_redirects` sends every address to `index.html`, so refreshing a
page like `/watchlist` does not answer 404. Every push to `master` redeploys both
hosts. A `VITE_` value is built into the app: after changing one, deploy the
site again.

GitHub Actions (`.github/workflows/ci.yml`) runs the server and client tests on
every push and pull request.

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
API=https://your-api-name.onrender.com

# 1 · no token
curl -i $API/api/watchlist                               # 401

# 2 · Alice signs up; copy the token from the answer
curl -X POST $API/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@uni.edu","password":"hunter222","displayName":"Alice"}'
TOKEN=paste-the-token-here

# 3 · save Inception, rate it, list, ask the genie
curl -X POST $API/api/watchlist \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"tmdbId":27205}'
curl -X PATCH $API/api/watchlist/PASTE-THE-_id \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"watched":true,"rating":5}'
curl $API/api/watchlist -H "Authorization: Bearer $TOKEN"
curl -X POST $API/api/genie \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"seedTmdbIds":[27205],"minRating":7}'
```

## Features

- **Accounts:** sign up, log in and log out. The watchlist, the genie and the
  settings are protected routes; an expired session returns to the login
  screen. The navbar shows who is logged in; their name opens the settings.
- **Settings:** change the display name and the country (which changes "where
  to watch" and the platform filters at once), change the password (the
  current one is asked first), or delete the account with its watchlist and
  genie history (password and a confirmation asked).
- **Browse:** trending, top rated and by genre, plus search, in a grid that
  loads the next page as you scroll and never shows a movie twice. Movies
  with no TMDB rating ("n/a") or fewer than 300 votes are dropped on the
  server, so no list in the app ever shows them.
- **Sort and filter:** every list can be filtered by the streaming platforms
  available in the user's country. The Genres list can also be sorted by
  popularity (the default), release date, rating or title; Trending and Top
  rated keep their own order.
- **Movie page:** a scene image that plays the trailer, the overview, runtime,
  genres, director, cast and where to watch in the user's country.
- **Watchlist:** every movie card has two buttons, "To watch" and "Watched".
  The chosen one turns green; clicking it again removes the movie, clicking
  the other moves it. A watched movie can be rated from 1 to 5 stars.
  Changes appear at once and are saved behind the scenes (optimistic
  updates); if the server refuses, the old state comes back with a message.
  The list can be filtered (to watch, watched), searched by title (as you type, ignoring case and accents) and sorted
  (latest added, latest watched, my rating, title, release date).
  Everything is stored in the database.
- **Ask the Genie:** pick up to 10 watched movies by their posters (searched
  and sorted as you like), or let the genie use the best rated ones of the
  genre you feel like watching (with "Any genre", ties go to the movies that
  widen the mix of genres); narrow by era and minimum rating, and get 10 ranked picks, each with its reasons.
  See [docs/genie-ranking.md](docs/genie-ranking.md).
- **Responsive:** built mobile-first, from two cards per row on a phone to
  four on a desktop.

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

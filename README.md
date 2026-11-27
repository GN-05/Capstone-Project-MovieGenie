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
| App (Netlify) | https://moviegenie.netlify.app |
| API (Render) | https://moviegenie-api.onrender.com · check it at [/api/health](https://moviegenie-api.onrender.com/api/health) |

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
Capstone_Project-MovieGenie/
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

Follow the steps in order. Every command is typed in a **terminal**:

- **Windows:** use **Git Bash** (installed with Git in step 1). Right-click a
  folder → "Open Git Bash here", or open Git Bash from the Start menu.
- **macOS:** use the **Terminal** app.

Type one command at a time and press Enter. To stop a running program in a
terminal, press `Ctrl + C`.

### Step 1 · Install the tools

1. **Node.js** (version 22.22 or later, or 24.15 or later): download the
   "LTS" version from https://nodejs.org and install it with the default options.
2. **Git**: download it from https://git-scm.com and install it with the
   default options.
3. Close and reopen your terminal, then check both are installed:

   ```sh
   node -v
   git --version
   ```

   `node -v` must print `v22.22` or higher (or `v24.15` or higher).

### Step 2 · Get the code

```sh
git clone https://github.com/GN-05/Capstone_Project-MovieGenie.git
cd Capstone_Project-MovieGenie
```

### Step 3 · Create a free MongoDB Atlas database

1. Sign up at https://www.mongodb.com/cloud/atlas/register.
2. Create a **free cluster** (the "M0" / Free option). Any region works.
3. **Database Access** (left menu, under Security) → **Add New Database User** →
   choose a username and a password (avoid symbols like `@ : / ?` in the
   password) → role "Read and write to any database" → **Add User**.
4. **Network Access** (left menu) → **Add IP Address** → **Add Current IP
   Address** → **Confirm**. (Choosing "Allow access from anywhere",
   `0.0.0.0/0`, also works and is needed later for Render.)
5. **Database** (left menu) → your cluster → **Connect** → **Drivers** → copy the
   connection string. It looks like:

   ```
   mongodb+srv://myuser:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```

6. In that string, replace `<db_password>` with the password from point 3, and
   add a database name, `moviegenie`, just before the `?`:

   ```
   mongodb+srv://myuser:MyPassword123@cluster0.abcde.mongodb.net/moviegenie?retryWrites=true&w=majority
   ```

   Keep it: this is your `MONGODB_URI`.

### Step 4 · Get a free TMDB API key

1. Sign up at https://www.themoviedb.org/signup and confirm your email.
2. Go to https://www.themoviedb.org/settings/api → request an API key → choose
   **Developer** → fill in the short form (any description, e.g. "student
   project").
3. On the same page, copy the **API Key** (the short one, about 32 characters),
   **not** the long "API Read Access Token". This is your `TMDB_API_KEY`.

### Step 5 · Install and configure the server (the API)

From the project folder:

```sh
cd server
npm install
cp .env.example .env
```

Open the new file `server/.env` in any text editor (VS Code, Notepad...) and
set these lines:

- `MONGODB_URI=` paste your connection string from step 3.
- `JWT_SECRET=` paste a long random text. To make one, run this in the terminal
  and copy what it prints:

  ```sh
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- `TMDB_API_KEY=` paste your key from step 4.
- Leave `CLIENT_ORIGIN` for now: you will fill it in step 7.

Save the file. Each line is `NAME=value`, with no spaces and no quotes.

### Step 6 · Install the client (the React app)

Go back to the project folder, then into `client`:

```sh
cd ../client
npm install
cp .env.example .env.development
npm run dev
```

Vite prints a few lines, one of which starts with `Local:`, for example
`Local:   http://<address>:5173/`. **Copy that address** (everything after
`Local:`). Then press `Ctrl + C` to stop the client for now.

### Step 7 · Connect the two halves

The client must know where the API is, and the API must accept the client:

1. Open `client/.env.development` and set `VITE_API_URL` to the **same address
   Vite printed, but with port `3000` instead of `5173`**, and with no `/` at the
   end. Example: if Vite printed `http://<address>:5173/`, write
   `VITE_API_URL=http://<address>:3000`.
2. Open `server/.env` and set `CLIENT_ORIGIN` to the **address Vite printed**,
   without the `/` at the end. Example: `CLIENT_ORIGIN=http://<address>:5173`.

Save both files.

### Step 8 · Start it

You need **two terminals**, both open in the project folder.

Terminal 1, the API:

```sh
cd server
npm run dev
```

Wait until it prints `connected to MongoDB` and `API listening on port 3000`.
Leave this terminal open.

Terminal 2, the React app:

```sh
cd client
npm run dev
```

Open the `Local:` address in your browser. The Browse page shows this week's
trending movies. Create an account with **Sign up** and try the app.

### Step 9 · Run the tests (optional)

From the project folder:

```sh
cd server
npm test
cd ../client
npm test
```

The server tests check the genie's ranking, the watched rule and the API's 401
and 400 cases; the client tests check the star rating component and the list
helpers. They need no database and no TMDB key.

### If something goes wrong

| You see | What to do |
|---|---|
| `Missing env var: X` when starting the server | The line `X=` in `server/.env` is empty or misspelled. Fill it in and start again. |
| `DB connection failed` | Check `MONGODB_URI` (password, database name before `?`) and Atlas **Network Access** (step 3.4). |
| The page says "Could not load movies" | Check that terminal 1 is still running, then `VITE_API_URL` (step 7.1). After changing it, stop the client (`Ctrl + C`) and run `npm run dev` again. |
| The browser console says "blocked by CORS policy" | `CLIENT_ORIGIN` in `server/.env` must be exactly the `Local:` address, without the final `/`. Restart the server after changing it. |
| `npm` or `node` is "not found" | Node.js is not installed, or the terminal was opened before installing it: reopen the terminal. |
| `node -v` shows an older version | Install the current LTS from https://nodejs.org. |

## Deploy it online

Three pieces, three hosts: the database on **MongoDB Atlas**, the API on
**Render**, the React app on **Netlify**. The browser talks only to the API;
only the API talks to the database and to TMDB. Do the steps in this order:
the API first, then the app.

You need the code in your own GitHub repository (push it, or fork this one),
and the `MONGODB_URI`, `TMDB_API_KEY` from steps 3 and 4.

### Step A · Atlas: allow Render to connect

Atlas → **Network Access** → **Add IP Address** → **Allow Access from
Anywhere** (`0.0.0.0/0`) → **Confirm**. Wait until it shows **Active**.
Render's servers have no fixed address, so this is required.

### Step B · Render: put the API online

1. Sign up at https://render.com **with GitHub**.
2. **New** → **Web Service** → choose your repository (if it is not listed,
   click **Configure account** and give Render access to it).
3. Fill in:

   | Field | Value |
   |---|---|
   | Name | e.g. `moviegenie-api` (it becomes the address) |
   | Language | Node |
   | Branch | `master` (or the branch your repository uses) |
   | Root Directory | `server` |
   | Build Command | `npm ci` |
   | Start Command | `npm start` |
   | Instance Type | Free |

4. **Environment Variables**, one row each:

   | Key | Value |
   |---|---|
   | `MONGODB_URI` | your connection string |
   | `TMDB_API_KEY` | your TMDB key |
   | `JWT_SECRET` | a **new** random text (same command as in step 5) |
   | `CLIENT_ORIGIN` | for now `https://placeholder.netlify.app` (fixed in step D) |
   | `NODE_ENV` | `production` |

   Do not add `PORT`: Render chooses it.
5. **Advanced** → **Health Check Path**: `/api/health`.
6. **Deploy Web Service**. In **Logs**, wait for `connected to MongoDB`, then a
   green **Live** badge.
7. Copy your address (e.g. `https://moviegenie-api.onrender.com`) and open
   `<your address>/api/health`: it must show `{"status":"ok"}`.

### Step C · Netlify: put the app online

1. Sign up at https://www.netlify.com **with GitHub**.
2. **Add new project** → **Import an existing project** → **GitHub** → your
   repository.
3. Fill in:

   | Field | Value |
   |---|---|
   | Branch to deploy | `master` (or your branch) |
   | Base directory | `client` |
   | Build command | `npm run build` |
   | Publish directory | `client/dist` |

4. **Add environment variables**: `VITE_API_URL` = your Render address from
   step B.7, with no `/` at the end and no `/api`.
5. **Deploy**. When it says **Published**, open **Project configuration** →
   **Change project name** to choose your address (e.g. `moviegenie` gives
   `https://moviegenie.netlify.app`).
6. Make sure the site is **public**: in Project configuration, under visitor
   access / password protection, choose no protection. Check by opening the
   address in a private (incognito) window.

`client/public/_redirects` sends every address to the app, so refreshing a page
like `/watchlist` does not answer 404.

### Step D · Render: accept the real app

Render → your service → **Environment** → set `CLIENT_ORIGIN` to your Netlify
address, exactly, with no `/` at the end (e.g. `https://moviegenie.netlify.app`)
→ **Save, rebuild, and deploy**. Wait for **Live**.

### Step E · Test it like a stranger

On a phone, on mobile data, open your Netlify address and: browse movies, sign
up, save a movie as Watched and rate it, refresh the page on `/watchlist`, ask
the genie, log out and log in again.

| You see | What to do |
|---|---|
| "blocked by CORS policy" in the browser console | `CLIENT_ORIGIN` on Render does not match the Netlify address exactly (step D). |
| "Could not load movies" or requests to `undefined/api` | `VITE_API_URL` is missing on Netlify: add it, then **Deploys** → **Trigger deploy** (a `VITE_` value is built into the app, so the site must be rebuilt). |
| The first load takes about 30 seconds | Normal: Render's free plan was asleep. |
| The Render service stops right after starting | Read its **Logs**: a missing environment variable, or Atlas Network Access (step A). |

After this, every push to the deployed branch redeploys both hosts, and GitHub
Actions (`.github/workflows/ci.yml`) runs the server and client tests on every
push and pull request.

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

`seedTmdbIds` holds 1 to 10 TMDB ids of watched movies on the user's watchlist.
With `wholeWatchlist`, the server takes the user's 10 best rated watched movies
of `genreId` (of any genre when it is absent).

### Try it with curl

```sh
API=https://moviegenie-api.onrender.com

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
  The list can be filtered (to watch, watched), searched by title (as you
  type, ignoring case and accents) and sorted (latest added, latest watched,
  my rating, title, release date). Everything is stored in the database.
- **Ask the Genie:** pick up to 10 watched movies by their posters (searched
  and sorted as you like), or let the genie use the best rated ones of the
  genre you feel like watching (with "Any genre", ties go to the movies that
  widen the mix of genres); narrow by era and minimum rating, and get 10
  ranked picks, each with its reasons. See
  [docs/genie-ranking.md](docs/genie-ranking.md).
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
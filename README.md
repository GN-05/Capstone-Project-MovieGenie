# MovieGenie

MovieGenie ends the nightly "what should we watch?" scroll. You save the movies
you love to a watchlist, then ask the genie: it turns the saved titles you pick
into a short, ranked list of recommendations, and explains each one.

Capstone project for the Web Development course.
Team: Vanessa Badr, Ghadi Nehme, Elie Hadchity.

**Status: Milestone 1** (the project scaffold; wireframes and database schema
finalized). The proposal is in [docs/proposal.md](docs/proposal.md).

## Tech stack

| Layer | Choice |
|---|---|
| Front end | React (JavaScript) with Vite |
| Back end | Node.js with Express, as ES modules |
| Database | MongoDB Atlas with Mongoose |
| Authentication (next milestone) | bcrypt password hashes, JWT sent as `Authorization: Bearer` |
| Third-party API (next milestone) | TMDB, called only from the server so the key stays secret |

## Project structure

```
Movie_claude/
├── client/                    # Vite + React · http://localhost:5173
│   ├── src/
│   │   ├── App.jsx            # checks that the API answers
│   │   ├── main.jsx           # mounts React
│   │   └── index.css          # design tokens and base styles
│   └── .env.example
├── server/                    # Express · http://localhost:3000
│   ├── server.js              # connects to MongoDB, then listens; GET /api/health
│   └── .env.example
└── docs/
    ├── proposal.md            # the one-page proposal
    ├── wireframes.md          # every main screen and how users move between them
    └── schema.md              # collections, fields, types and references
```

## Setup

You need Node.js 22 or later and a MongoDB Atlas connection string.

### 1. Server

```sh
cd server
npm install
cp .env.example .env
```

Open `server/.env` and fill in `MONGODB_URI` (your Atlas connection string).
Then start it:

```sh
npm run dev
```

It prints `connected to MongoDB` and `API listening on http://localhost:3000`.

### 2. Client

In a second terminal:

```sh
cd client
npm install
cp .env.example .env.development
npm run dev
```

Open http://localhost:5173: the page says whether the API answers.

## Design documents

- [docs/wireframes.md](docs/wireframes.md): every main screen, phone first, and
  how users move between them.
- [docs/schema.md](docs/schema.md): every collection with its fields, types and
  references (`userId`).

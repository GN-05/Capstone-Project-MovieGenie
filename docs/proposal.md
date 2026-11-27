# MovieGenie: project proposal

Capstone project for the Web Development course (Session 19).
Team: Vanessa Badr, Ghadi Nehme, Elie Hadchity.

## 1. The idea

**The problem.** Every evening the same question: "what should we watch?".
Streaming apps push what is popular, not what *you* liked, and the scroll goes
on for half an hour.

**For whom.** Anyone who watches movies regularly and remembers what they
loved, but not what to watch next.

**What MovieGenie does.** You browse movies and save the ones you have seen or
want to see to a watchlist. Then you ask the genie: it takes the saved movies
you pick and answers with a short, ranked list of recommendations, and tells
you why each one was chosen ("Because you saved Inception: same director").

## 2. Feature list

**Must-have**

- Sign up, log in, log out; the watchlist and the genie need an account.
- Browse movies: trending, top rated, by genre, and search.
- A movie page: overview, year, runtime, genres, director, cast, trailer.
- A watchlist (the main resource, full CRUD): save a movie, list it, mark it
  watched and rate it 1 to 5 stars, remove it.
- Ask the Genie: pick saved movies, get about 10 ranked picks with reasons.
- Responsive: usable on a phone and on a desktop.

**Nice-to-have**

- "Where to watch" in the user's country, and a filter by streaming platform.
- Filters for the genie: genre, era, minimum rating.
- Sorting the lists (release date, rating, title).
- TV series as well as movies.

## 3. Tech stack

| Part | Choice |
|---|---|
| Front end | React with Vite, React Router, plain CSS |
| Back end | Node.js with Express, a REST API |
| Database | MongoDB Atlas with Mongoose |
| Authentication | Passwords hashed with bcrypt; a JWT sent as `Authorization: Bearer` |
| Third-party API | TMDB (The Movie Database), called only from our server so the key stays secret |
| Custom feature | The genie's ranking, written by us |
| Hosting | Front end on Netlify, API on Render, database on Atlas |

## 4. Rough sketch

**Screens:** Browse (trending, top rated, genres, search) · Movie page ·
Sign up · Log in · Watchlist 🔒 · Ask the Genie 🔒 (🔒 = needs an account).

**Database sketch:**

```
users            { email, passwordHash, displayName, country }
watchlistitems   { userId → users, tmdbId, title, posterPath, addedAt }
genierequests    { userId → users, seedTmdbIds, results: [tmdbId] }
```

Every private document points to its owner with `userId`. Movie details come
from TMDB; only what the watchlist needs is copied into the database.

# MovieGenie: how the genie ranks its picks

This answers the question raised on the proposal: how picks from several seed
titles are **merged**, **weighted** and **filtered**, so that the ranking is our
own logic and not TMDB's recommendations.

A **seed** is a saved movie the genie starts from. There are at most 10, and
only movies the user has **watched** can be seeds: a movie not seen yet says
nothing reliable about their taste, and it cannot be rated.

## The method in one paragraph

The genie is a **content-based** recommender that uses **cosine similarity**.
It turns the selected seeds into one taste profile, and scores every candidate
movie by how closely its content matches that profile. TMDB is used only as a
data source: it supplies the list of candidates and the facts about each movie.
TMDB's own order is never used.

True collaborative filtering needs the ratings of many users, which a new app
does not have. The genie keeps a small collaborative signal instead: TMDB builds
its recommendation lists from the behaviour of its users, and the genie counts
how many of the user's seeds a candidate was recommended for (step 5).

## Step by step

**0. Choose the seeds.** The user has two ways to ask:

- **Pick posters:** the seeds are the 1 to 10 watched movies the user clicked.
- **Use my whole watchlist:** the user chooses the genre they feel like
  watching. The genie keeps the watched movies of that genre, orders them by the
  user's stars (unrated counts as 3, the most recently saved wins a tie) and
  takes the first 10. With "Any genre" it takes the 10 best rated overall,
  and a tie on stars is broken by **genre variety**: seeds are chosen one at
  a time, and among movies with the same stars the one adding the most genres
  not yet covered by the chosen seeds wins (then the most recently
  *watched*). Without this, ten recent sci-fi saves would hide a 5-star
  comedy saved long ago, and the genie would think the user only likes
  sci-fi. Stars always come first: variety never lets a 4-star movie beat a
  5-star one.

**1. Describe each movie with four groups of features.**
Its genres, its keywords (themes such as "time travel"), its director and its
top 5 cast members. Each group is a vector: 1 for a feature the movie has, 0
for the rest.

**2. Weight each seed by the user's stars.**
`seedWeight = rating / 5`. A seed with no rating counts as 3 stars (0.6).

**3. Merge the seeds into one taste profile.**
For each group, `profile = Σ seedWeight × seedVector`. A feature shared by
several seeds, or belonging to a highly rated seed, becomes stronger.

**4. Collect and filter the candidates.**
Candidates are the union of the first two pages of TMDB's recommendation list
for each seed (about 40 movies per seed). A movie recommended for several seeds
is kept once, with the list of seeds it came from. A candidate is removed when:

- it is already on the user's watchlist (seed or not, watched or not);
- it fails the user's filters: genre, era (release year range), minimum rating;
- it has no TMDB rating (shown as "n/a"), fewer than 300 votes on TMDB, or
  no poster. The vote rule is app-wide (`isTrusted` in `services/tmdb.js`):
  such movies are already dropped from every TMDB list the server fetches,
  and the genie checks again.

**5. Score each remaining candidate with three parts, each from 0 to 1.**

- **Similarity.** The cosine between the profile and the candidate is computed
  in each group, then the four results are mixed:

  | Group | Share | Why |
  |---|---|---|
  | Genres | 0.40 | the broadest signal of taste |
  | Keywords | 0.25 | the themes of the story |
  | Director | 0.20 | strong signal, one per movie |
  | Cast | 0.15 | weakest: actors work across very different films |

  `similarity = 0.40 × cos(genres) + 0.25 × cos(keywords) + 0.20 × cos(director) + 0.15 × cos(cast)`
  with `cos(a, b) = (a · b) / (|a| × |b|)`.

- **Agreement.**
  `agreement = (sum of seedWeight of the seeds whose list contains the candidate) / (sum of all seedWeight)`

- **Quality.**
  `weightedRating = (v / (v + m)) × R + (m / (v + m)) × C`
  with `R` the TMDB rating, `v` its vote count, `m = 500` and `C = 6.5`: a
  rating backed by few votes is pulled toward the average.
  `quality = (weightedRating − 5) / 4`, kept between 0 and 1, so 5/10 gives 0
  and 9/10 gives 1.

**6. Combine and rank.**
`score = 0.55 × similarity + 0.15 × agreement + 0.30 × quality`
The 10 highest scores are returned, best first.

**7. Explain each pick.**
The reasons name the one or two seeds that contributed most and what they share
with the pick, for example: "Because you saved Inception: same director, 2
shared genres, 1 shared theme".

## Small worked example (genres only, to show the arithmetic)

Seeds: *A* (Action, Sci-Fi) rated 5 stars, *B* (Action, Comedy) rated 3 stars.

- Seed weights: A = 1.0, B = 0.6.
- Genre profile: Action = 1.0 + 0.6 = 1.6, Sci-Fi = 1.0, Comedy = 0.6.
- `|profile| = √(1.6² + 1.0² + 0.6²) = √3.92 ≈ 1.98`

| Candidate | Genres | Dot product | Length | Cosine |
|---|---|---|---|---|
| X | Action, Sci-Fi | 1.6 + 1.0 = 2.6 | √2 ≈ 1.41 | 2.6 / (1.98 × 1.41) ≈ **0.93** |
| Y | Comedy, Romance | 0.6 | √2 ≈ 1.41 | 0.6 / (1.98 × 1.41) ≈ **0.21** |

X matches both seeds on Action and the 5-star seed on Sci-Fi, so it ranks far
above Y, which matches only the 3-star seed on one genre. This example is one
of the automated tests.

## How the numbers were chosen

The first version put all features in one vector and gave quality 15% of the
score. Tested on real TMDB data with Inception and The Dark Knight as seeds, it
ranked little-known films above Tenet. Two causes were found and fixed:

- **One big vector diluted well-described movies.** A film with 25 keywords has
  a long vector, so its cosine dropped even when its genres and director
  matched. Comparing each group separately removes this effect.
- **Quality counted too little.** Its share went from 15% to 30%, the minimum
  number of votes from 50 to 200 (later raised to 300), and the rating is stretched over the 5 to 9
  range, where almost all movies fall.

The candidate pool was also widened from one page of recommendations per seed
to two, which doubled the choice.

With the final values, the same two seeds give: The Dark Knight Rises, Batman
Begins, Tenet, Batman (1989), The Matrix. La La Land alone gives: Singin' in
the Rain, (500) Days of Summer, Pretty Woman.

## Keeping it fast

| Data | TMDB requests when the user asks |
|---|---|
| Seed features | 0: stored on the watchlist item when the movie was saved |
| Candidate lists | 2 per seed, sent at the same time, kept in an in-memory cache |
| Candidate features | only for the 30 candidates that lead a first pass on genres, agreement and quality (all already present in the lists); sent at the same time, kept in the same cache |

Measured on a laptop: 2 to 3 seconds for a first ask, about 1 second when the
answers are in the cache. The number of seeds is capped at 10, so the time
does not grow with the size of the watchlist.

## Business rules, cases and edge cases

### The flow the user sees

1. **Choose.** The page lists only the user's *watched* movies. The user
   taps up to 10 posters (search and sort help find them), or presses
   **Use my whole watchlist**. The sticky bar at the bottom shows
   "n of 10 picked" and a one-line tip.
2. **Narrow it down.** Genre, era (from / up to) and minimum TMDB rating.
   Every field is optional.
3. **Your picks.** Up to 10 movies, each with a "Match %" and one or two
   reasons. "Ask again" starts over.

The progress is kept in `GenieContext`, so opening a pick and pressing Back
returns to the picks. Logging out (or another user logging in) clears it.
Every ask is saved as a `genierequests` document.

### The two ways to ask

| | Pick posters | Use my whole watchlist |
|---|---|---|
| Seeds | exactly the movies picked (1 to 10) | the 10 best rated watched movies, of the chosen genre if one is chosen |
| Genre filter | filters the *candidates* only | chooses the *seeds* **and** filters the candidates |
| Fewer than 10 watched | n/a | uses all of them |
| Unrated movies | allowed, count as 3 stars | allowed, count as 3 stars when choosing and weighting |
| Tie on stars | n/a | one genre chosen: the most recently saved wins. Any genre: the movie adding the most new genres wins, then the most recently watched |

### Input checks (answers 400)

| Case | Message |
|---|---|
| Neither posters picked nor whole watchlist | Pick at least one saved movie |
| More than 10 posters | Pick at most 10 saved movies |
| A picked id is not on *this* user's watchlist | Pick movies from your own watchlist |
| A picked movie is not marked watched | The genie only uses movies you have watched |
| Whole watchlist, but no watched movie of the chosen genre | You have no watched movie in this genre yet |
| "From" year after "up to" year | The era must start before it ends (checked in the browser and on the server) |
| Year outside 1900 to next year, rating outside 0 to 10 | the zod message for that field |

The same id sent twice is not an error: it counts as one seed. When
`wholeWatchlist` is true, `seedTmdbIds` is ignored.

### General cases

- **One seed.** The profile is that one movie, so the picks are the movies
  most like it. Agreement is 1 for every candidate (all come from its list),
  so it does not change the order.
- **Several similar seeds** (e.g. three Nolan films). Shared features add up,
  so the director, genres and themes they share dominate the profile, and
  candidates recommended for several of them also gain agreement.
- **Several very different seeds** (e.g. a horror film and a musical). The
  profile is a mix. Candidates close to *one* seed still score well on that
  part, so the picks are usually a blend of both tastes, with the higher
  rated seed pulling harder.
- **Stars change the pull, not the direction.** A 5-star seed weighs 1.0 and
  a 1-star seed 0.2. A low rating makes a seed matter less; it never pushes
  the genie *away* from similar movies.

### Edge cases

| Case | What happens |
|---|---|
| No watched movie at all | The page shows a short message and a button: "Browse movies" (empty watchlist) or "Open my watchlist" (saved but none watched). No request is sent. |
| A seed has no TMDB recommendations | It adds no candidates but still shapes the profile. |
| A seed lacks a feature group (no keywords, unknown director) | That group's cosine is 0, never `NaN` (`cosine` returns 0 when a vector is empty). |
| A candidate is already saved (to watch or watched) | Dropped. Seeds are saved, so a seed is never one of its own picks. |
| A candidate has no poster, no rating, or fewer than 300 votes | Dropped (already at fetch time for the vote rule). |
| An era filter is set and a candidate has no release year | Dropped: its year cannot be checked. |
| Every candidate is filtered out | 201 with an empty list; the page says "Nothing matched. Loosen the filters and ask again." |
| Fewer than 10 candidates survive | Fewer than 10 picks are returned. |
| A strong candidate has weak genres | It may miss the 30-movie shortlist, which is ranked on genres, agreement and quality only. This is the price of fetching full details for 30 movies instead of hundreds. |
| TMDB fails for one shortlisted movie's details | That movie keeps the genres it already had and is still ranked, just with less information. |
| TMDB fails for a recommendation list | The whole ask answers 502 "Could not reach TMDB". |
| Two picks have the same score | They keep the order they were collected in (seed order, then TMDB's order). |
| A pick shares no feature with any seed | It still gets a reason: every candidate came from at least one seed's TMDB list, so that seed is named alone: "Because you saved X". |
| A seed is removed from the watchlist after the ask | The picks stay; "Based on" shows "a removed movie" for it. |
| The user saves a pick, then asks again | That movie is now on the watchlist, so it is no longer offered. |

### What the Match % means

`Match = round(score × 100)`. The score mixes three parts that are each
between 0 and 1, so 100% would need a perfect content match, agreement from
every seed and a 9/10 weighted rating. In practice the best picks land
around 45 to 60%. The number ranks the picks against each other; it is not
a probability.

## Where it lives in the code

- `server/services/genie.js`: the ranking, as pure functions with no Express,
  no database and no network. `pickSeeds` chooses the seeds for a whole
  watchlist ask, `mergeLists` merges the candidate lists,
  `shortlist` runs the first pass and `rankPicks` the final ranking. The weights
  are the constants at the top of the file.
- `server/tests/genie.test.js`: the automated tests, including the worked example above.
- `server/services/tmdb.js`: the TMDB requests and the cache.
- `server/routes/genie.js`: `POST /api/genie` validates the input, loads the seeds
  for `req.userId`, calls the two services, saves a `genierequests` document and
  returns the picks.

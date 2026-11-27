# MovieGenie: wireframes

Low-fidelity sketches of every main screen. Layouts are drawn for a phone first;
the note under each one says what changes on a wide screen. The look follows the
first prototype: light page, white cards, one purple navbar.

## How users move between screens

```
                ┌──────────────┐  success
     ┌─────────▶│   Sign up    │───────────┐
     │          └──────┬───────┘           │
     │                 │ "Log in"          ▼
┌────┴─────────┐ ┌─────▼────────┐   ┌──────────────┐
│   Browse     │▶│   Log in     │──▶│ Watchlist 🔒  │◀──────────┐
│ Trending     │ └──────────────┘   └──────┬───────┘           │
│ Top Rated    │                           │ "Ask the Genie"   │
│ Genres       │                           ▼                   │ "+"
└──┬───────▲───┘                    ┌──────────────┐           │
   │ card  │ Back                   │ Ask Genie 🔒  │───────────┤
   ▼       │                        │ choose →     │           │
┌──────────┴───┐  "+" (logged in)   │ filters →    │           │
│ Movie page   │───────────────────▶│ picks        │           │
│              │◀───────────────────┴──────────────┘           │
└──────────────┘        pick card                              │
   navbar: Trending · Top Rated · Genres · Watchlist · Ask the Genie
   any private request answered 401 ──▶ Log in
   "Log out" on a 🔒 screen          ──▶ Log in
```

🔒 = protected route: without a token the user is sent to Log in.

| Route | Screen | Access |
|---|---|---|
| `/` | Browse: Trending | public |
| `/top-rated` | Browse: Top Rated | public |
| `/genres` | Browse: Genres | public |
| `/movie/:id` | Movie page | public (saving needs login) |
| `/signup` | Sign up | public |
| `/login` | Log in | public |
| `/watchlist` | Watchlist | protected |
| `/genie` | Ask the Genie | protected |
| `/settings` | Settings | protected |
| `*` | Page not found | public |

## Navbar (every screen)

```
┌──────────────────────────────────────────────────────────────┐
│ ✨ Movie Genie   Trending  Top Rated  Genres  Watchlist  Genie   (E) Elie ⇥ │
└──────────────────────────────────────────────────────────────┘
```

- Right side, logged in: a circle with the user's initial, the display name
  (both open Settings) and a log-out icon. Logged out: "Log in" and a "Sign up" button.
- Watchlist and Ask the Genie appear only when logged in.
- Phone: the three groups wrap onto separate lines.

## 1. Browse (`/`, `/top-rated`, `/genres`)

```
┌──────────────────────────────┐
│ [ Search for a movie…][Search]│
│ Trending this week           │
│ (All genres)(Action)(Comedy)… │  genre chips: only on /genres
│ [All platforms][N][P][▶][D+]  │  streaming platforms of the user's country
│ ⇅ [ Default order         ▾] │  sort menu
├──────────────────────────────┤
│ ┌───────────┐ ┌───────────┐  │
│ │           │ │           │  │
│ │  poster   │ │  poster   │  │
│ │           │ │           │  │
│ ├───────────┤ ├───────────┤  │
│ │Title   (+)│ │Title   (✓)│  │  "+" saves; green "✓" = saved, click removes
│ │★ 7.8 (2024)│ │★ 8.1 (2019)│  │
│ │Overview…  │ │Overview…  │  │
│ └───────────┘ └───────────┘  │
│        Loading more…         │  the next page loads near the end of the list
└──────────────────────────────┘
```

- Sort menu: default, release date (newest / oldest), rating (highest /
  lowest), title (A–Z / Z–A). Sorting and platform filtering are done by the
  server, so they stay correct across every page.
- A search replaces the list; the genre, platform and sort controls hide
  while its results are shown.
- States: loading, error with "Try again", empty ("No movies found").
- No movie may appear twice in the grid.
- The genre, platform, sort and search are written in the address
  (`/genres?genre=10749&sort=newest`), and the loaded list is kept. Coming
  back from a movie page returns to the same list, at the same place.
- Only well-known platforms are offered, from those TMDB reports for the country.
- Logged out, the "+" leads to Log in.
- Wide screen: 3 then 4 cards per row; platforms and sort on one line.

## 2. Movie page (`/movie/:id`)

```
┌──────────────────────────────┐
│ ← Back                       │
│ ┌──────────────────────────┐ │
│ │                          │ │
│ │      scene image   ▶     │ │  ▶ replaces the image with the trailer
│ │                          │ │
│ ├──────────────────────────┤ │
│ │ Title          [+ Save]  │ │
│ │ 2010 · 2h 28m · Action   │ │
│ │ ★ 8.4 (37,000 votes)     │ │
│ │ Directed by Name         │ │
│ │                          │ │
│ │ Overview text…           │ │
│ │                          │ │
│ │ Cast                     │ │
│ │ [photo] Name             │ │
│ │         Character        │ │
│ │ Where to watch (LB)      │ │  for the country of the account
│ │ Stream on  (N) Netflix   │ │
│ │ Rent from  (▶) Apple TV  │ │
│ │ View all watching options│ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

- A full page rather than a popup, so each movie has its own address.
- Wide screen: Cast and Where to watch sit side by side.

## 3. Sign up (`/signup`) and 4. Log in (`/login`)

```
┌──────────────────────────────┐   ┌──────────────────────────────┐
│          Sign up             │   │           Log in             │
│ Display name [____________]  │   │ Email        [____________]  │
│ Email        [____________]  │   │ Password     [____________]  │
│ Password     [____________]  │   │ ⚠ Invalid email or password  │
│ Country      [ Lebanon   ▾]  │   │        [ Log in ]            │
│ ⚠ error message under field  │   │ New here? Sign up            │
│        [ Create account ]    │   └──────────────────────────────┘
│ Have an account? Log in      │
└──────────────────────────────┘
```

- Every field has a label. Errors are shown in text, under the field.
- The country decides the platforms on Browse and "Where to watch".
- Success goes to the Watchlist.

## 5. Watchlist (`/watchlist`) 🔒

```
┌──────────────────────────────┐
│ Your watchlist (7) [Ask the Genie]
│ (All)(To watch)(Watched)     │
│ ⇅ [ Latest added          ▾] │  sort menu
├──────────────────────────────┤
│ ┌───────────┐ ┌───────────┐  │
│ │  poster   │ │  poster   │  │
│ ├───────────┤ ├───────────┤  │
│ │Title   (🗑)│ │Title   (🗑)│  │  remove
│ │(👁) Watched│ │(○) Not yet│  │  round button; watched by default when saved
│ │★ ★ ★ ★ ☆  │ │Watch it to │  │  1 to 5 stars, only for a watched movie
│ │           │ │rate it     │  │
│ └───────────┘ └───────────┘  │
└──────────────────────────────┘
```

- Sort menu: latest added, oldest added, latest watched, my rating, title,
  release date. The filter and the order are written in the address.
- The round button is green with an eye when watched, an empty circle when
  not. Switching to "not watched" removes the stars and the rating.
- A card's buttons wait while a change is being saved.
- If the list cannot be loaded, the reason is shown with a "Try again" button.
- Empty state: "Your watchlist is empty" with a link to Browse.
- The poster and the title open the movie page.

## 6. Ask the Genie (`/genie`) 🔒

Three steps on one screen.

```
 step 1 · choose                 step 2 · narrow down           step 3 · picks
┌───────────────────────────┐   ┌─────────────────────────┐   ┌───────────────────────────┐
│ Ask the Genie             │   │ ← Back                  │   │ Your picks     [Ask again]│
│ [Based on all my watchlist]──▶│ What do you feel like   │   │ Based on: A, B, C         │
│ …or click up to 10 posters│   │ watching?               │   │ ┌─────────┐ ┌─────────┐   │
│ ┌────────┐ ┌────────┐     │   │ Genre    [ Comedy    ▾] │   │ │ poster  │ │ poster  │   │
│ │ poster │ │ poster │     │   │ Released from [ 1990 ]  │   │ ├─────────┤ ├─────────┤   │
│ ├────────┤ ├────────┤     │   │ Released up to [ 2026 ] │──▶│ │Title (+)│ │Title (+)│   │
│ │Title ✓ │ │Title   │     │   │ Min rating   [ 6.5 ]    │   │ │★ 7.8    │ │★ 7.7    │   │
│ │★★★★★   │ │★★★☆☆   │     │   │   [ Get my picks ]      │   │ │Match 61%│ │Match 59%│   │
│ └────────┘ └────────┘     │   └─────────────────────────┘   │ │Because… │ │Because… │   │
│ Selected: 1 / 10          │                                 │ └─────────┘ └─────────┘   │
│ [Continue with 1 movie]───────▶ (same form, "Narrow it down")└───────────────────────────┘
└───────────────────────────┘
```

- **Based on all my watchlist:** the user chooses a genre, and the genie uses
  the 10 best rated saved movies of that genre ("Any genre" uses the 10 best
  rated overall).
- **Picking posters:** a picked card gets a green border and a check; the
  genie uses exactly those movies.
- Only watched movies are offered and used. Movies not watched yet are still
  left out of the picks, since they are already saved.
- States: nothing saved yet (link to Browse), "The genie is thinking…", error
  message, no saved movie in the chosen genre, no result ("Nothing matched").
- Opening a pick and coming back returns to the picks.
- "Ask again" starts over with nothing picked and no filters.

## 7. Settings (`/settings`) 🔒

```
┌──────────────────────────────┐
│ Settings                     │
│ ┌──────────────────────────┐ │
│ │ Profile                  │ │
│ │ Email   [elie@uni.edu]   │ │  greyed: cannot change
│ │ Display name [Elie     ] │ │
│ │ Country  [Lebanon     ▾] │ │
│ │ [ Save changes ]  Saved. │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Password                 │ │
│ │ Current  [••••••••     ] │ │
│ │ New      [             ] │ │
│ │ Again    [             ] │ │
│ │ [ Change password ]      │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │  red border
│ │ Delete account           │ │
│ │ Removes your watchlist…  │ │
│ │ Password [             ] │ │
│ │ [ Delete my account ]    │ │  asks "Are you sure?"
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

- Each form has its own message under it. After deleting, the user lands on
  Browse, logged out.
- Wide screen: the cards sit two per row.

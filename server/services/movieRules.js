// Rules about which movies the app trusts. Pure functions: no network, so
// both the TMDB service and the genie can use them, and tests need nothing.

// A movie with no rating ("n/a") or fewer votes than this is too little
// known to trust, so the app never shows it, in any list or in the genie.
export const MIN_VOTES = 300;

export function isTrusted(movie) {
  return movie.voteAverage > 0 && movie.voteCount >= MIN_VOTES;
}

// The rule that ties stars to "watched". Pure function: no database.
//
// A movie can only be rated once it is watched, so:
// - rating a movie that is not watched is refused;
// - marking a movie as not watched removes its rating.
//
// The date a movie was marked watched is kept too, so the watchlist can be
// sorted by "latest watched".
//
// item is the saved movie, changes is what the user sent ({ watched, rating }).
// Answers { error } when the change is refused, { update } otherwise.
export function applyWatchRules(item, changes) {
  const watched = changes.watched ?? item.watched;

  if (!watched && changes.rating) {
    return { error: 'Mark the movie as watched before rating it' };
  }
  if (!watched) {
    return { update: { ...changes, rating: null, watchedAt: null } };
  }
  if (!item.watched) {
    // it just became watched: remember when
    return { update: { ...changes, watchedAt: new Date() } };
  }
  return { update: changes };
}

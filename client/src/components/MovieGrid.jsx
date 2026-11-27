import { useEffect, useRef } from 'react';
import { useNavigationType } from 'react-router-dom';
import { useMovies, rememberScroll, savedScroll } from '../hooks/useMovies.js';
import MovieCard from './MovieCard.jsx';

// A grid of movies that loads the next page when the user nears the end.
// The parent gives it key={path}, so a new list starts from an empty grid.
export default function MovieGrid({ path }) {
  const { movies, status, hasMore, loadMore, retry } = useMovies(path);
  const sentinel = useRef(null);
  const cameBack = useNavigationType() === 'POP';   // Back or Forward button

  // back on this list: return to where the user was
  useEffect(() => {
    if (cameBack) window.scrollTo(0, savedScroll(path));
  }, [cameBack, path]);

  // watch the element under the grid; when it comes into view, load more
  useEffect(() => {
    if (status !== 'ready' || !hasMore) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '400px' });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [status, hasMore, loadMore]);

  return (
    <>
      {/* a click on any card: remember the place before leaving the list */}
      <div className="movie-grid" onClick={() => rememberScroll(path)}>
        {movies.map(m => <MovieCard key={m.tmdbId} movie={m} />)}
      </div>

      {status === 'ready' && !hasMore && movies.length === 0 && (
        <p className="notice">No movies found.</p>
      )}
      {status === 'loading' && (
        <p className="notice">
          {movies.length === 0 ? 'Loading movies…' : 'Loading more…'}
        </p>
      )}
      {status === 'error' && (
        <div className="notice">
          <p role="alert" className="error">Could not load movies.</p>
          <button type="button" className="button" onClick={retry}>Try again</button>
        </div>
      )}
      {status === 'ready' && !hasMore && movies.length > 0 && (
        <p className="notice">You reached the end.</p>
      )}

      <div ref={sentinel} />
    </>
  );
}

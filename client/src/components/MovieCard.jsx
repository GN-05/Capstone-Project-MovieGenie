import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import Poster from './Poster.jsx';
import SaveButton from './SaveButton.jsx';
import { formatRating, truncate } from '../utils/movies.js';

// children is an optional extra line under the title (the genie uses it
// for the match and the reasons)
export default function MovieCard({ movie, children }) {
  return (
    <article className="movie-card">
      <Link to={`/movie/${movie.tmdbId}`} className="movie-card-poster">
        <Poster path={movie.posterPath} title={movie.title} />
      </Link>
      <div className="movie-card-body">
        <h3 className="movie-card-title">
          <Link to={`/movie/${movie.tmdbId}`}>{truncate(movie.title, 40)}</Link>
        </h3>
        <p className="movie-card-meta">
          <Star size={16} aria-hidden="true" className="star star--on" />
          {formatRating(movie.voteAverage)}
          {movie.releaseYear && <small>({movie.releaseYear})</small>}
        </p>
        {children ?? (
          movie.overview && <p className="movie-card-text">{truncate(movie.overview, 90)}</p>
        )}
        {/* at the bottom of every card, so the buttons line up in a row */}
        <div className="movie-card-actions">
          <SaveButton movie={movie} />
        </div>
      </div>
    </article>
  );
}

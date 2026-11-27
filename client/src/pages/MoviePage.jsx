import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Star, User } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import SaveButton from '../components/SaveButton.jsx';
import { imageUrl, formatRuntime, formatRating } from '../utils/movies.js';

function ProviderGroup({ title, providers }) {
  if (providers.length === 0) return null;
  return (
    <div className="provider-group">
      <h3>{title}</h3>
      <ul className="provider-list">
        {providers.map(p => (
          <li key={p.id} className="provider">
            <img src={imageUrl(p.logoPath, 'w92')} alt="" width="28" height="28" />
            {p.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MoviePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const country = user?.country ?? 'LB';
  const { data: movie, loading, error, reload } =
    useApi(`/api/movies/${id}?country=${country}`);
  const [playing, setPlaying] = useState(false);

  if (loading) return <p className="notice">Loading the movie…</p>;
  if (error) {
    return (
      <div className="notice">
        <p role="alert" className="error">{error.message}</p>
        <button type="button" className="button" onClick={reload}>Try again</button>
      </div>
    );
  }

  const image = movie.backdropPath || movie.posterPath;
  const facts = [
    movie.releaseYear,
    formatRuntime(movie.runtime),
    movie.genres.map(g => g.name).join(', '),
  ].filter(Boolean);
  // TMDB can know the country but list no service in it
  const { stream = [], rent = [], buy = [] } = movie.providers ?? {};
  const hasProviders = stream.length + rent.length + buy.length > 0;

  return (
    <>
      <button type="button" className="link-button" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} aria-hidden="true" /> Back
      </button>

      <article className="movie">
        {/* the image, the play button and the player share one grid area */}
        <div className="stage">
          {image && (
            <img src={imageUrl(image, 'w1280')} alt={`Scene from ${movie.title}`}
              width="1280" height="720" />
          )}
          {movie.trailerKey && !playing && (
            <button type="button" className="stage-play"
              onClick={() => setPlaying(true)}
              aria-label={`Play the trailer of ${movie.title}`}>
              <Play size={72} aria-hidden="true" />
            </button>
          )}
          {playing && (
            <iframe title={`Trailer of ${movie.title}`} allowFullScreen
              allow="autoplay; encrypted-media"
              src={`https://www.youtube-nocookie.com/embed/${movie.trailerKey}?autoplay=1&rel=0`} />
          )}
        </div>

        <div className="movie-body">
          <div className="movie-head">
            <div>
              <h1>{movie.title}</h1>
              <p className="movie-facts">
                {facts.map(fact => <span key={fact}>{fact}</span>)}
                <span className="movie-rating">
                  <Star size={18} aria-hidden="true" className="star star--on" />
                  {formatRating(movie.voteAverage)}
                  <small>({movie.voteCount.toLocaleString()} votes)</small>
                </span>
              </p>
              {movie.director && (
                <p>Directed by <strong>{movie.director.name}</strong></p>
              )}
            </div>
            <SaveButton movie={movie} large />
          </div>

          <p className="movie-overview">
            {movie.overview || 'No overview available.'}
          </p>

          <div className="movie-columns">
            <section>
              <h2>Cast</h2>
              {movie.cast.length === 0 && <p>No cast information available.</p>}
              <ul className="cast">
                {movie.cast.map(person => (
                  <li key={person.id} className="cast-member">
                    {person.profilePath ? (
                      <img src={imageUrl(person.profilePath, 'w185')} alt=""
                        width="185" height="278" loading="lazy" />
                    ) : (
                      <span className="cast-empty"><User size={40} aria-hidden="true" /></span>
                    )}
                    <div>
                      <strong>{person.name}</strong>
                      <small>{person.character}</small>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Where to watch ({country})</h2>
              {hasProviders ? (
                <>
                  <ProviderGroup title="Stream on" providers={movie.providers.stream} />
                  <ProviderGroup title="Rent from" providers={movie.providers.rent} />
                  <ProviderGroup title="Buy from" providers={movie.providers.buy} />
                </>
              ) : (
                <p>No streaming information available for your country.</p>
              )}
            </section>
          </div>
        </div>
      </article>
    </>
  );
}

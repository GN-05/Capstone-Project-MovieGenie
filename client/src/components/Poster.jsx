import { Film } from 'lucide-react';
import { imageUrl } from '../utils/movies.js';

// A movie poster, or a placeholder when TMDB has none.
// width and height reserve the space, so the page does not jump on load.
export default function Poster({ path, title, size = 'w342' }) {
  if (!path) {
    return (
      <div className="poster poster--empty" role="img" aria-label={`No poster for ${title}`}>
        <Film size={32} aria-hidden="true" />
      </div>
    );
  }
  return (
    <img className="poster" src={imageUrl(path, size)} alt={`Poster of ${title}`}
      width="342" height="513" loading="lazy" />
  );
}

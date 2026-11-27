import { ArrowUpDown } from 'lucide-react';
import { imageUrl } from '../utils/movies.js';

export const SORTS = [
  // TMDB's popularity: what people view, search and save the most right now
  { value: '', label: 'Most popular' },
  { value: 'newest', label: 'Release date (newest)' },
  { value: 'oldest', label: 'Release date (oldest)' },
  { value: 'rating-high', label: 'Rating (highest)' },
  { value: 'rating-low', label: 'Rating (lowest)' },
  { value: 'title-az', label: 'Title (A–Z)' },
  { value: 'title-za', label: 'Title (Z–A)' },
];

// The row of streaming platform icons, with the sort menu on its right
// when showSort is true. The parent owns the values; this component only
// reports the changes.
export default function BrowseControls({
  providers, providerId, onProvider, showSort, sort, onSort,
}) {
  return (
    <div className="controls">
      <div className="platforms">
        <button type="button" onClick={() => onProvider(null)}
          className={providerId === null ? 'platform platform--on' : 'platform'}>
          All platforms
        </button>
        {providers.map(p => (
          <button key={p.id} type="button" onClick={() => onProvider(p.id)}
            className={providerId === p.id ? 'platform platform--on' : 'platform'}
            aria-label={p.name} aria-pressed={providerId === p.id} title={p.name}>
            <img src={imageUrl(p.logoPath, 'w92')} alt="" width="36" height="36" />
          </button>
        ))}
      </div>

      {showSort && (
        <div className="sort">
          <ArrowUpDown size={18} aria-hidden="true" />
          <select value={sort} onChange={e => onSort(e.target.value)}
            aria-label="Sort movies">
            {SORTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

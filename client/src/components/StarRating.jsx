import { Star } from 'lucide-react';

const STARS = [1, 2, 3, 4, 5];

// Five star buttons. Clicking the current rating again clears it.
// Without onChange the stars are only shown, not clickable.
export default function StarRating({ value, onChange, disabled = false }) {
  if (!onChange) {
    return (
      <span className="stars" aria-label={value ? `${value} of 5 stars` : 'Not rated'}>
        {STARS.map(n => (
          <Star key={n} size={16} aria-hidden="true"
            className={n <= (value ?? 0) ? 'star star--on' : 'star'} />
        ))}
      </span>
    );
  }

  return (
    <span className="stars">
      {STARS.map(n => (
        <button key={n} type="button" className="star-button"
          aria-label={`Rate ${n} of 5`}
          aria-pressed={n === value} disabled={disabled}
          onClick={() => onChange(n === value ? null : n)}>
          <Star size={22} aria-hidden="true"
            className={n <= (value ?? 0) ? 'star star--on' : 'star'} />
        </button>
      ))}
    </span>
  );
}

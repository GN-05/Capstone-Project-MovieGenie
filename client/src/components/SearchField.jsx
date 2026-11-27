import { Search, X } from 'lucide-react';

// A search box that filters a list already on the screen, as the user
// types: no button and no request. The parent owns the text.
export default function SearchField({ value, onChange, label }) {
  return (
    <div className="search-field" role="search">
      <Search size={18} aria-hidden="true" />
      <input type="search" value={value} maxLength={100}
        placeholder={label} aria-label={label}
        onChange={e => onChange(e.target.value)} />
      {value && (
        <button type="button" className="search-field-clear"
          onClick={() => onChange('')} aria-label="Clear the search">
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

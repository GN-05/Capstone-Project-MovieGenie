import { Link, NavLink } from 'react-router-dom';
import {
  Sparkles, TrendingUp, Star, LayoutGrid, List, Wand2, LogOut, Settings,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Header() {
  const { token, user, logout } = useAuth();

  return (
    <header className="site-header">
      <Link to="/" className="brand">
        <Sparkles size={28} aria-hidden="true" />
        Movie Genie
      </Link>

      <nav className="nav-links" aria-label="Main">
        <NavLink to="/" end>
          <TrendingUp size={18} aria-hidden="true" /> Trending
        </NavLink>
        <NavLink to="/top-rated">
          <Star size={18} aria-hidden="true" /> Top Rated
        </NavLink>
        <NavLink to="/genres">
          <LayoutGrid size={18} aria-hidden="true" /> Genres
        </NavLink>
        {token && (
          <>
            <NavLink to="/watchlist">
              <List size={18} aria-hidden="true" /> Watchlist
            </NavLink>
            <NavLink to="/genie">
              <Wand2 size={18} aria-hidden="true" /> Ask the Genie
            </NavLink>
          </>
        )}
      </nav>

      {token ? (
        <div className="identity">
          {/* the name opens the settings */}
          <Link to="/settings" className="identity-link" title="Settings">
            <span className="avatar" aria-hidden="true">
              {user ? user.displayName[0].toUpperCase() : '?'}
            </span>
            <span>{user ? user.displayName : 'Account'}</span>
            <Settings size={16} aria-hidden="true" />
          </Link>
          <button type="button" className="round-button round-button--plain"
            onClick={logout} aria-label="Log out" title="Log out">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="identity">
          <Link to="/login">Log in</Link>
          <Link to="/signup" className="button button--light">Sign up</Link>
        </div>
      )}
    </header>
  );
}

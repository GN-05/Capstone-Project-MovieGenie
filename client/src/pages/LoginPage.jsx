import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function LoginPage() {
  const { token, login } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // already logged in, or just logged in: go to the watchlist
  if (token) return <Navigate to="/watchlist" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    setBusy(true);
    setError('');
    try {
      await login(form.get('email'), form.get('password'));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <section className="card card--narrow">
      <h1>Log in</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required
          autoComplete="current-password" />

        {error && <p role="alert" className="error">{error}</p>}
        <button className="button" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p>New here? <Link to="/signup">Sign up</Link></p>
    </section>
  );
}

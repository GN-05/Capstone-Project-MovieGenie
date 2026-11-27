import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { COUNTRIES } from '../utils/countries.js';

function validate(form) {
  const errors = {};
  if (!form.displayName.trim()) errors.displayName = 'Add a display name';
  else if (form.displayName.trim().length > 40)
    errors.displayName = 'Keep it under 40 characters';
  if (!form.email.trim()) errors.email = 'Add your email';
  if (form.password.length < 8)
    errors.password = 'Use at least 8 characters';
  return errors;
}

export default function SignupPage() {
  const { token, signup } = useAuth();
  const [form, setForm] = useState(
    { displayName: '', email: '', password: '', country: 'LB' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to="/watchlist" replace />;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setServerError('');
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await signup(form);
    } catch (err) {
      setServerError(err.message);
      setBusy(false);
    }
  }

  return (
    <section className="card card--narrow">
      <h1>Sign up</h1>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="displayName">Display name</label>
        <input id="displayName" name="displayName" value={form.displayName}
          onChange={handleChange} autoComplete="nickname"
          aria-invalid={!!errors.displayName} />
        {errors.displayName && <p className="error">{errors.displayName}</p>}

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" value={form.email}
          onChange={handleChange} autoComplete="email"
          aria-invalid={!!errors.email} />
        {errors.email && <p className="error">{errors.email}</p>}

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" value={form.password}
          onChange={handleChange} autoComplete="new-password"
          aria-invalid={!!errors.password} />
        {errors.password && <p className="error">{errors.password}</p>}

        <label htmlFor="country">Country</label>
        <select id="country" name="country" value={form.country}
          onChange={handleChange}>
          {COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>

        {serverError && <p role="alert" className="error">{serverError}</p>}
        <button className="button" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p>Have an account? <Link to="/login">Log in</Link></p>
    </section>
  );
}

import { useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { COUNTRIES } from '../utils/countries.js';

// Three small forms, each with its own state, message and busy flag.
// The email cannot be changed.

function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    displayName: user?.displayName ?? '',
    country: user?.country ?? 'LB',
  });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setSaved(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const name = form.displayName.trim();
    if (!name) return setError('Add a display name');
    if (name.length > 40) return setError('Keep it under 40 characters');

    setError('');
    setBusy(true);
    try {
      await updateProfile({ displayName: name, country: form.country });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h2>Profile</h2>
      <div className="form">
        <label htmlFor="email">Email</label>
        <input id="email" value={user?.email ?? ''} disabled />
        <small>Your email cannot be changed.</small>

        <label htmlFor="displayName">Display name</label>
        <input id="displayName" name="displayName" value={form.displayName}
          onChange={handleChange} autoComplete="nickname"
          aria-invalid={!!error} />

        <label htmlFor="country">Country</label>
        <select id="country" name="country" value={form.country}
          onChange={handleChange}>
          {COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
        <small>Used for "where to watch" and the streaming platform filters.</small>

        {error && <p role="alert" className="error">{error}</p>}
        {saved && <p role="status" className="success">Saved.</p>}
        <button className="button" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const { changePassword } = useAuth();
  const empty = { currentPassword: '', newPassword: '', confirm: '' };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setSaved(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.currentPassword) return setError('Enter your current password');
    if (form.newPassword.length < 8) {
      return setError('Use at least 8 characters for the new password');
    }
    if (form.newPassword !== form.confirm) {
      return setError('The two new passwords do not match');
    }

    setError('');
    setBusy(true);
    try {
      await changePassword(form.currentPassword, form.newPassword);
      setForm(empty);   // never leave passwords sitting in the fields
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h2>Password</h2>
      <div className="form">
        <label htmlFor="currentPassword">Current password</label>
        <input id="currentPassword" name="currentPassword" type="password"
          value={form.currentPassword} onChange={handleChange}
          autoComplete="current-password" />

        <label htmlFor="newPassword">New password</label>
        <input id="newPassword" name="newPassword" type="password"
          value={form.newPassword} onChange={handleChange}
          autoComplete="new-password" />

        <label htmlFor="confirm">New password again</label>
        <input id="confirm" name="confirm" type="password"
          value={form.confirm} onChange={handleChange}
          autoComplete="new-password" />

        {error && <p role="alert" className="error">{error}</p>}
        {saved && <p role="status" className="success">Password changed.</p>}
        <button className="button" disabled={busy}>
          {busy ? 'Changing…' : 'Change password'}
        </button>
      </div>
    </form>
  );
}

function DeleteForm() {
  const { deleteAccount, logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) return setError('Enter your password to confirm');
    const sure = window.confirm(
      'Delete your account, your watchlist and your genie history? This cannot be undone.');
    if (!sure) return;

    setError('');
    setBusy(true);
    try {
      await deleteAccount(password);
      // React Router runs a navigation as a transition. Logging out inside
      // the same transition makes both happen in one render: the page is
      // left for Browse before RequireAuth could send the user to Log in.
      startTransition(() => {
        navigate('/', { replace: true });
        logout();
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="card card--danger" onSubmit={handleSubmit} noValidate>
      <h2>Delete account</h2>
      <p>
        This removes your account, your watchlist and every genie answer.
        It cannot be undone.
      </p>
      <div className="form">
        <label htmlFor="deletePassword">Your password</label>
        <input id="deletePassword" type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password" />

        {error && <p role="alert" className="error">{error}</p>}
        <button className="button button--danger" disabled={busy}>
          {busy ? 'Deleting…' : 'Delete my account'}
        </button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  return (
    <>
      <h1>Settings</h1>
      <div className="settings">
        <ProfileForm />
        <PasswordForm />
        <DeleteForm />
      </div>
    </>
  );
}

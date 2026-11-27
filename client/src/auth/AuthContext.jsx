import { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function loadUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] =
    useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(loadUser);

  // keep localStorage and state in sync: write to both, clear both
  function startSession(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }

  async function login(email, password) {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    });
    startSession(data);
  }

  async function signup(form) {
    const data = await apiFetch('/api/auth/signup', {
      method: 'POST', body: JSON.stringify(form),
    });
    startSession(data);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }

  // ---- the settings page ----

  // changes is { displayName?, country? }; the server answers the new user
  async function updateProfile(changes) {
    const data = await apiFetch('/api/users/me', {
      method: 'PATCH', body: JSON.stringify(changes),
    });
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
  }

  async function changePassword(currentPassword, newPassword) {
    await apiFetch('/api/users/me/password', {
      method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // the caller logs out once the account is gone: it first leaves the
  // protected page, or RequireAuth would send it to Log in
  async function deleteAccount(password) {
    await apiFetch('/api/users/me', {
      method: 'DELETE', body: JSON.stringify({ password }),
    });
  }

  // the token expired: apiFetch fires the event, we go back to logged out
  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () =>
      window.removeEventListener('auth:expired', logout);
  }, []);

  const value = {
    token, user, login, signup, logout,
    updateProfile, changePassword, deleteAccount,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

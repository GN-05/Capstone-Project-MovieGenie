import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

// Milestone 1: the scaffold. The page only checks that the API answers;
// the screens of docs/wireframes.md come in Milestone 3.
export default function App() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        if (!res.ok) throw new Error(res.status);
        setStatus('ok');
      } catch {
        setStatus('error');
      }
    }
    check();
  }, []);

  return (
    <main className="page-main">
      <h1>MovieGenie</h1>
      <p>Save the movies you love, then ask the genie what to watch next.</p>
      {status === 'checking' && <p>Checking the API…</p>}
      {status === 'ok' && <p>The API is running.</p>}
      {status === 'error' && <p className="error">The API does not answer.</p>}
    </main>
  );
}

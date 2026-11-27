const API_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  let res;
  try {
    res = await fetch(API_URL + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  } catch {
    // no answer at all: the server is down, restarting, or the network is
    throw new Error('Could not reach the server. Check that it is running.');
  }
  // a private request refused: the token is missing or expired
  if (res.status === 401 && token) {
    window.dispatchEvent(new Event('auth:expired'));
  }
  if (!res.ok) {
    // our API always answers { error }, but a host's error page is HTML:
    // fall back to a message with the status code
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

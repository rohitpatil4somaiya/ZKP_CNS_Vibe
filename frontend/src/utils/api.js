// Use Vite runtime environment variables (set VITE_API_URL / VITE_MAILER_URL in Vercel or locally)
const BASE_URL = (import.meta.env?.VITE_API_URL) || 'http://localhost:5000'
const MAILER_URL = (import.meta.env?.VITE_MAILER_URL) || 'http://localhost:5050'

export async function register(payload) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function requestChallenge(username) {
  const res = await fetch(`${BASE_URL}/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  return res.json();
}

export async function verifyLogin(payload) {
  const res = await fetch(`${BASE_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

//ENCRYPTED VAULT FUNCTIONS
export async function getVault() {
  const sessionToken = localStorage.getItem('session_token');
  if (!sessionToken)
    return { status: 'error', message: 'Missing session token' };

  const res = await fetch(`${BASE_URL}/vault`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    }
  });
  return res.json();
}

export async function updateVault(vault_blob) {
  const sessionToken = localStorage.getItem('session_token');
  if (!sessionToken)
    return { status: 'error', message: 'Missing session token' };

  const res = await fetch(`${BASE_URL}/vault`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify({ vault_blob })
  });
  return res.json();
}

export async function logout() {
  const sessionToken = localStorage.getItem('session_token');
  if (!sessionToken)
    return { status: 'error', message: 'Missing session token' };

  const res = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    }
  });
  return res.json();
}

// Send shares via email using the mailer service
export async function sendSharesEmail({ recipients, fromEmail, username }) {
  const res = await fetch(`${MAILER_URL}/api/send-shares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipients, fromEmail, username })
  });
  if (!res.ok) {
    return { status: 'error', message: `Mailer service error: ${res.status} ${res.statusText}` };
  }
  return res.json();
}

// Save vault for a username without a session token (used after wallet setup)
export async function saveVault(username, vault_blob) {
  const res = await fetch(`${BASE_URL}/auth/save-vault`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, vault_blob })
  })
  if (!res.ok) {
    return { status: 'error', message: `Save vault error: ${res.status} ${res.statusText}` }
  }
  return res.json()
}
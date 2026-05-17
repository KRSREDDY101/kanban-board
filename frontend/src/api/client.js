const API = '/api';

async function parseError(res) {
  const err = new Error('Request failed');
  err.status = res.status;
  try {
    err.data = await res.json();
  } catch {
    err.data = null;
  }
  return err;
}

export async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = localStorage.getItem('access');
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });

  if (res.status === 401 && !options._retry) {
    const refresh = localStorage.getItem('refresh');
    if (refresh) {
      try {
        const refreshRes = await fetch(`${API}/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('access', data.access);
          return request(path, { ...options, _retry: true });
        }
      } catch {
        /* fall through */
      }
    }
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    window.location.reload();
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return null;
  return res.json();
}

export function get(path) {
  return request(path);
}

export function post(path, body) {
  return request(path, { method: 'POST', body: JSON.stringify(body) });
}

export function patch(path, body) {
  return request(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function del(path) {
  return request(path, { method: 'DELETE' });
}

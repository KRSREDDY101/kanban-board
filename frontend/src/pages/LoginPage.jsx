import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ onNavigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      onNavigate('boards');
    } catch (err) {
      setError(
        err.data?.detail || 'Could not sign in. Check your email and password.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <h1>Tasks on a board, not in your head.</h1>
        <p>Drag cards between columns. Keep the team aligned without the noise.</p>
      </aside>
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Sign in</h2>
          <p className="subtitle">Welcome back</p>
          {error && <div className="auth-error">{error}</div>}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="auth-footer">
            New here?{' '}
            <button
              type="button"
              className="btn btn-ghost"
              style={{ display: 'inline', padding: 0 }}
              onClick={() => onNavigate('register')}
            >
              Create an account
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

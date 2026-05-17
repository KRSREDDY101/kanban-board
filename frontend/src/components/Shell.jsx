import { useAuth } from '../context/AuthContext';

export default function Shell({ children, onNavigate }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    onNavigate?.('login');
  };

  return (
    <div className="shell">
      <header className="shell-header">
        <button
          type="button"
          className="shell-brand"
          onClick={() => onNavigate?.('boards')}
        >
          Pinboard
        </button>
        <nav className="shell-nav">
          <span className="shell-user">{user?.email}</span>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Sign out
          </button>
        </nav>
      </header>
      <main className="shell-main">{children}</main>
    </div>
  );
}

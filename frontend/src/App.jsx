import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BoardsPage from './pages/BoardsPage';
import BoardPage from './pages/BoardPage';

export default function App() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState('login');
  const [boardId, setBoardId] = useState(null);

  const navigate = (to, id = null) => {
    setScreen(to);
    if (id != null) setBoardId(id);
  };

  if (loading) {
    return <div className="app-loading">Loading…</div>;
  }

  if (!user) {
    if (screen === 'register') {
      return <RegisterPage onNavigate={navigate} />;
    }
    return <LoginPage onNavigate={navigate} />;
  }

  if (screen === 'board' && boardId != null) {
    return <BoardPage boardId={boardId} onNavigate={navigate} />;
  }

  return <BoardsPage onNavigate={navigate} />;
}

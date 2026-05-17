import { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import { boards as boardsApi } from '../api';

export default function BoardsPage({ onNavigate }) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    boardsApi
      .list()
      .then(setBoards)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await boardsApi.create(name.trim());
      setName('');
      setShowForm(false);
      load();
    } finally {
      setCreating(false);
    }
  };

  return (
    <Shell onNavigate={onNavigate}>
      <header className="boards-header">
        <div>
          <h1>Your boards</h1>
          <p>Pick a board or start a new one.</p>
        </div>
      </header>

      {loading ? (
        <p className="empty-state">Loading boards…</p>
      ) : (
        <div className="boards-grid">
          {boards.map((board) => (
            <button
              key={board.id}
              type="button"
              className="board-card"
              onClick={() => onNavigate('board', board.id)}
            >
              <h3>{board.name}</h3>
              <span className="meta">
                {board.owner_email} ·{' '}
                {new Date(board.created_at).toLocaleDateString()}
              </span>
            </button>
          ))}

          {showForm ? (
            <form className="board-card board-card-new" onSubmit={handleCreate}>
              <input
                placeholder="Board name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <div className="inline-form">
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  Add
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="board-card board-card-new"
              onClick={() => setShowForm(true)}
            >
              + New board
            </button>
          )}
        </div>
      )}
    </Shell>
  );
}

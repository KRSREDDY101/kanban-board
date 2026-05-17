import { useCallback, useEffect, useState } from 'react';
import Shell from '../components/Shell';
import KanbanBoard from '../components/KanbanBoard';
import InviteMembersPanel from '../components/InviteMembersPanel';
import { boards as boardsApi, lists as listsApi } from '../api';

export default function BoardPage({ boardId, onNavigate }) {
  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [b, l, m] = await Promise.all([
        boardsApi.get(boardId),
        listsApi.byBoard(boardId),
        boardsApi.members(boardId),
      ]);
      setBoard(b);
      setLists(l);
      setMembers(m);
      setError('');
    } catch (err) {
      setError(
        err.status === 403 || err.status === 404
          ? 'You do not have access to this board.'
          : 'Could not load board.',
      );
    }
  }, [boardId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <Shell onNavigate={onNavigate}>
        <div className="empty-state">
          <h2>Board unavailable</h2>
          <p>{error}</p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onNavigate('boards')}
          >
            ← Back to boards
          </button>
        </div>
      </Shell>
    );
  }

  if (!board) {
    return (
      <Shell onNavigate={onNavigate}>
        <p className="empty-state">Loading board…</p>
      </Shell>
    );
  }

  return (
    <Shell onNavigate={onNavigate}>
      <div className="board-toolbar">
        <div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ paddingLeft: 0 }}
            onClick={() => onNavigate('boards')}
          >
            ← Boards
          </button>
          <h1>{board.name}</h1>
        </div>
        <InviteMembersPanel boardId={boardId} onMembersChange={setMembers} />
      </div>
      <KanbanBoard
        boardId={boardId}
        lists={lists}
        setLists={setLists}
        members={members}
        onRefresh={load}
      />
    </Shell>
  );
}

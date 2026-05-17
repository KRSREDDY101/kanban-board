import { useEffect, useState } from 'react';
import { boards as boardsApi } from '../api';

export default function InviteMembersPanel({ boardId, onMembersChange }) {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const load = () => {
    setLoading(true);
    boardsApi
      .members(boardId)
      .then((data) => {
        setMembers(data);
        onMembersChange?.(data);
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [boardId]);

  const invite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    setError('');
    try {
      await boardsApi.invite(boardId, email.trim());
      setEmail('');
      load();
    } catch (err) {
      const msg =
        err.data?.email?.[0] ||
        err.data?.detail ||
        'Could not invite member.';
      setError(typeof msg === 'string' ? msg : 'Could not invite member.');
    } finally {
      setInviting(false);
    }
  };

  const remove = async (userId) => {
    if (!window.confirm('Remove this member from the board?')) return;
    try {
      await boardsApi.removeMember(boardId, userId);
      load();
    } catch {
      setError('Could not remove member.');
    }
  };

  return (
    <div className="invite-wrap">
      <button
        type="button"
        className="btn btn-ghost invite-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide team' : 'Team & invites'}
      </button>
      {open && (
        <div className="invite-panel">
          <form className="invite-form" onSubmit={invite}>
            <input
              type="email"
              placeholder="colleague@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={inviting}>
              Invite
            </button>
          </form>
          {error && <p className="form-error">{error}</p>}
          {loading ? (
            <p className="invite-meta">Loading members…</p>
          ) : (
            <ul className="member-list">
              {members.map((m) => (
                <li key={`${m.user}-${m.role}`}>
                  <span>
                    {m.user_email}
                    <em>{m.role}</em>
                  </span>
                  {m.role !== 'owner' && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-danger"
                      onClick={() => remove(m.user)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

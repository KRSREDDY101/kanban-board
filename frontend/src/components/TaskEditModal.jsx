import { useEffect, useState } from 'react';
import { tasks as tasksApi } from '../api';

export default function TaskEditModal({ task, members, onClose, onSaved }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [assignedTo, setAssignedTo] = useState(
    task.assigned_to != null ? String(task.assigned_to) : '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.due_date || '');
    setAssignedTo(task.assigned_to != null ? String(task.assigned_to) : '');
  }, [task]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const updated = await tasksApi.update(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        assigned_to: assignedTo ? Number(assignedTo) : null,
      });
      onSaved(updated);
      onClose();
    } catch {
      setError('Could not save task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <form className="modal-card" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Edit task</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Due date</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Assign to</span>
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.user} value={m.user}>
                {m.user_email}
                {m.role === 'owner' ? ' (owner)' : ''}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="form-error">{error}</p>}
        <footer className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </form>
    </div>
  );
}

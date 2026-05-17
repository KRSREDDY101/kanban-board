import { useEffect, useState } from 'react';
import TaskCard from './TaskCard';

export default function KanbanColumn({
  list,
  tone,
  tasks,
  onAddTask,
  onDeleteTask,
  onDragStart,
  onDragOver,
  onDragOverCard,
  onDrop,
  onDropOnCard,
  onEditTask,
  dragOver,
  dropIndex,
  onRenameList,
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [listTitle, setListTitle] = useState(list.title);

  useEffect(() => {
    setListTitle(list.title);
  }, [list.title]);

  const submitTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onAddTask(list.id, title.trim());
    setTitle('');
    setAdding(false);
  };

  const saveListTitle = async () => {
    const next = listTitle.trim();
    if (!next || next === list.title) {
      setListTitle(list.title);
      setEditingTitle(false);
      return;
    }
    await onRenameList(list.id, next);
    setEditingTitle(false);
  };

  return (
    <section className="kanban-column" data-tone={tone}>
      <header className="column-header">
        {editingTitle ? (
          <input
            className="column-title-input"
            value={listTitle}
            onChange={(e) => setListTitle(e.target.value)}
            onBlur={saveListTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveListTitle();
              if (e.key === 'Escape') {
                setListTitle(list.title);
                setEditingTitle(false);
              }
            }}
            autoFocus
          />
        ) : (
          <h3 onDoubleClick={() => setEditingTitle(true)} title="Double-click to rename">
            {list.title}
          </h3>
        )}
        <span className="column-count">{tasks.length}</span>
      </header>
      <div
        className={`column-cards${dragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => onDragOver(e, list.id)}
        onDrop={(e) => onDrop(e, list.id)}
      >
        {tasks.map((task, index) => (
          <div
            key={task.id}
            onDragOver={(e) => onDragOverCard(e, list.id, index)}
            onDrop={(e) => onDropOnCard(e, list.id, index)}
          >
            <TaskCard
              task={task}
              dropBefore={dragOver && dropIndex === index}
              onDragStart={onDragStart}
              onEdit={onEditTask}
              onDelete={() => onDeleteTask(list.id, task.id)}
            />
          </div>
        ))}
      </div>
      {adding ? (
        <form
          className="add-task-form"
          onSubmit={submitTask}
          style={{ padding: '0 0.65rem 0.65rem' }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            autoFocus
          />
          <div className="inline-form">
            <button type="submit" className="btn btn-primary">
              Add
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="add-task-btn"
          onClick={() => setAdding(true)}
        >
          + Add task
        </button>
      )}
    </section>
  );
}

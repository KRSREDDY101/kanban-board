export default function TaskCard({
  task,
  dragging,
  onDelete,
  onDragStart,
  onEdit,
  dropBefore,
}) {
  return (
    <article
      className={`task-card${dragging ? ' dragging' : ''}${dropBefore ? ' drop-before' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={() => onEdit?.(task)}
    >
      <h4>{task.title}</h4>
      {task.description && <p>{task.description}</p>}
      <footer className="task-card-footer">
        <span>
          {task.assigned_user_email && (
            <span className="assignee">{task.assigned_user_email}</span>
          )}
          {task.due_date && (
            <span className="due-date">
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </span>
        {onDelete && (
          <button
            type="button"
            className="btn btn-ghost btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
          >
            Remove
          </button>
        )}
      </footer>
    </article>
  );
}

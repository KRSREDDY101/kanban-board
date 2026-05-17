import { useCallback, useEffect, useState } from 'react';
import KanbanColumn from './KanbanColumn';
import TaskEditModal from './TaskEditModal';
import { lists as listsApi, tasks as tasksApi } from '../api';
import { useBoardSocket } from '../hooks/useBoardSocket';

const columnTone = (title) => {
  const t = title.toLowerCase();
  if (t.includes('done')) return 'done';
  if (t.includes('doing') || t.includes('progress')) return 'doing';
  return 'todo';
};

export default function KanbanBoard({
  boardId,
  lists,
  setLists,
  members,
  onRefresh,
}) {
  const [tasksByList, setTasksByList] = useState({});
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const loadAllTasks = useCallback(async () => {
    if (!lists.length) return;
    const entries = await Promise.all(
      lists.map(async (l) => [l.id, await tasksApi.byList(l.id)]),
    );
    setTasksByList(Object.fromEntries(entries));
  }, [lists]);

  useEffect(() => {
    loadAllTasks();
  }, [loadAllTasks]);

  const upsertTask = (task) => {
    setTasksByList((prev) => {
      const next = { ...prev };
      for (const listId of Object.keys(next)) {
        next[listId] = (next[listId] || []).filter((t) => t.id !== task.id);
      }
      const listId = task.list;
      next[listId] = [...(next[listId] || []), task].sort(
        (a, b) => a.position - b.position,
      );
      return next;
    });
  };

  const removeTaskFromState = (taskId, listId) => {
    setTasksByList((prev) => ({
      ...prev,
      [listId]: (prev[listId] || []).filter((t) => t.id !== taskId),
    }));
  };

  const handleSocketEvent = useCallback(
    (msg) => {
      switch (msg.event) {
        case 'task_created':
        case 'task_updated':
        case 'task_moved':
        case 'task_deleted':
          loadAllTasks();
          break;
        case 'list_created':
          setLists((prev) =>
            [...prev, msg.list].sort((a, b) => a.position - b.position),
          );
          setTasksByList((prev) => ({ ...prev, [msg.list.id]: [] }));
          break;
        case 'list_updated':
          setLists((prev) =>
            prev
              .map((l) => (l.id === msg.list.id ? msg.list : l))
              .sort((a, b) => a.position - b.position),
          );
          break;
        default:
          break;
      }
    },
    [setLists],
  );

  useBoardSocket(boardId, handleSocketEvent);

  const findTask = (id) => {
    for (const listId of Object.keys(tasksByList)) {
      const task = tasksByList[listId]?.find((t) => t.id === id);
      if (task) return { task, listId: Number(listId) };
    }
    return null;
  };

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('taskId', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
    setDragTaskId(task.id);
  };

  const handleDragOver = (e, listId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const tasks = tasksByList[listId] || [];
    setDropTarget({ listId, index: tasks.length });
  };

  const handleDragOverCard = (e, listId, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ listId, index });
  };

  const performMove = async (taskId, targetListId, position) => {
    try {
      const updated = await tasksApi.move(taskId, targetListId, position);
      await loadAllTasks();
      return updated;
    } catch {
      onRefresh();
      return null;
    }
  };

  const resolveDropPosition = (targetListId, index) => {
    const found = findTask(Number(dragTaskId || 0));
    const tasks = tasksByList[targetListId] || [];
    let position = index + 1;

    if (found && found.listId === targetListId && found.task.position <= position) {
      position -= 1;
    }

    return Math.max(1, Math.min(position, tasks.length + (found ? 0 : 1)));
  };

  const handleDrop = async (e, targetListId) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData('taskId'));
    const index = dropTarget?.listId === targetListId ? dropTarget.index : (tasksByList[targetListId] || []).length;
    setDropTarget(null);
    setDragTaskId(null);

    if (!taskId) return;
    const position = resolveDropPosition(targetListId, index);
    await performMove(taskId, targetListId, position);
  };

  const handleDropOnCard = async (e, targetListId, index) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = Number(e.dataTransfer.getData('taskId'));
    setDropTarget(null);
    setDragTaskId(null);
    if (!taskId) return;
    const position = resolveDropPosition(targetListId, index);
    await performMove(taskId, targetListId, position);
  };

  const addList = async (title) => {
    const list = await listsApi.create(Number(boardId), title);
    setLists((prev) => [...prev, list].sort((a, b) => a.position - b.position));
    setTasksByList((prev) => ({ ...prev, [list.id]: [] }));
  };

  const renameList = async (listId, title) => {
    const updated = await listsApi.update(listId, { title });
    setLists((prev) =>
      prev.map((l) => (l.id === listId ? updated : l)).sort((a, b) => a.position - b.position),
    );
  };

  const addTask = async (listId, title) => {
    const task = await tasksApi.create(listId, title);
    upsertTask(task);
  };

  const deleteTask = async (listId, taskId) => {
    await tasksApi.remove(taskId);
    removeTaskFromState(taskId, listId);
  };

  const handleTaskSaved = (task) => {
    upsertTask(task);
  };

  return (
    <>
      <div className="kanban">
        {lists.map((list) => (
          <KanbanColumn
            key={list.id}
            list={list}
            tone={columnTone(list.title)}
            tasks={tasksByList[list.id] || []}
            dragOver={dropTarget?.listId === list.id}
            dropIndex={dropTarget?.listId === list.id ? dropTarget.index : null}
            onAddTask={addTask}
            onDeleteTask={deleteTask}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragOverCard={handleDragOverCard}
            onDrop={handleDrop}
            onDropOnCard={handleDropOnCard}
            onEditTask={setEditingTask}
            onRenameList={renameList}
          />
        ))}
        <div className="add-column-wrap">
          <AddColumnButton onAdd={addList} />
        </div>
      </div>

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          members={members}
          onClose={() => setEditingTask(null)}
          onSaved={handleTaskSaved}
        />
      )}
    </>
  );
}

function AddColumnButton({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onAdd(title.trim());
    setTitle('');
    setOpen(false);
  };

  if (open) {
    return (
      <form className="kanban-column" onSubmit={submit}>
        <div className="column-header">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Column name"
            autoFocus
          />
        </div>
        <div className="inline-form" style={{ padding: '0.65rem' }}>
          <button type="submit" className="btn btn-primary">
            Add
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <button type="button" className="add-column-btn" onClick={() => setOpen(true)}>
      + Add column
    </button>
  );
}

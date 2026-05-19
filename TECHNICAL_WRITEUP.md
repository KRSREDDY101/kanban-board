# Technical Writeup — Real-Time Collaborative Kanban Board

**Candidate:** K Raj Shekhar Reddy  
**Submission:** Full Stack Developer Assignment  
**Repository:** https://github.com/KRSREDDY101/kanban-board

---

## 1. Problem Statement

Build a collaborative task board similar to a simplified Trello or Jira where multiple users can:

- Authenticate securely
- Create shared boards and invite teammates
- Organize work in columns (lists) and cards (tasks)
- Drag tasks between columns and reorder them
- See each other's changes in **real time** without manual refresh

---

## 2. Solution Overview

The application is split into a **React SPA** (frontend) and a **Django REST API** (backend), with **Django Channels** providing WebSocket support on the same ASGI server.

```
┌──────────────┐   REST (JWT)     ┌─────────────────────────┐
│ React + Vite │ ◄──────────────► │ Django + DRF            │
│  :5173       │                  │  :8000                  │
└──────┬───────┘                  │  SQLite                 │
       │ WebSocket                └───────────┬─────────────┘
       │  /ws/tasks/:boardId/               │
       └────────────────────────────────────►│ Channels Consumer
                                             │ group: board_{id}
```

**Design principles:**

- REST for all mutations and initial data load (predictable, cacheable, easy to document)
- WebSockets only for broadcasting changes to other connected clients
- Server-side permission checks on every API and WebSocket connection
- Integer `position` fields for explicit ordering of lists and tasks

---

## 3. Technology Choices

| Requirement | Choice | Rationale |
|-------------|--------|-----------|
| Backend framework | Django 6 | Mature ORM, auth, admin, fast CRUD development |
| API layer | Django REST Framework | Serializers, permissions, browsable patterns |
| Authentication | JWT (Simple JWT) | Stateless tokens suited to SPA; assignment spec |
| Real-time | Django Channels + WebSockets | Same codebase as API; PDF allows WebSockets |
| Frontend | React + Vite | Component model fits board/column/card UI; fast HMR |
| Drag and drop | HTML5 Drag and Drop API | No extra library required; supports cross-column + index |
| Database | SQLite | Zero-config for assignment/demo; easy clone & run |
| API documentation | drf-spectacular | Auto-generated OpenAPI / Swagger at `/api/docs/` |

---

## 4. Database Schema

### 4.1 Entity Relationship

```
User (accounts.User)
  │
  ├── owns ──► Board
  │              │
  │              ├── has many ──► List (column)
  │              │                    │
  │              │                    └── has many ──► Task
  │              │
  │              └── has many ──► BoardMember ──► User
```

### 4.2 Tables (aligned with assignment spec)

**User** (`accounts_user`)

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| username | string | Required by Django |
| email | string | Unique; used as `USERNAME_FIELD` for login |
| password | hashed | Django `create_user` |
| created_at | datetime | |

**Board** (`boards_board`)

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| name | string | |
| owner_id | FK → User | Board creator |
| created_at | datetime | |

**BoardMember** (`boards_boardmember`)

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| board_id | FK → Board | |
| user_id | FK → User | |
| role | enum | `admin` or `member` |
| unique_together | (board, user) | Prevents duplicate invites |

**List** (`lists_app_list`)

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| board_id | FK → Board | |
| title | string | e.g. "To Do" |
| position | positive int | Column order |
| created_at | datetime | |

**Task** (`tasks_task`)

| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| list_id | FK → List | |
| title | string | |
| description | text | Optional |
| assigned_to_id | FK → User | Nullable |
| due_date | date | Nullable |
| position | positive int | Order within column |
| created_at | datetime | |

---

## 5. Authentication & Authorization

### 5.1 JWT Flow

1. **Register:** `POST /api/auth/register/` → creates `User`.
2. **Login:** `POST /api/auth/login/` → returns `access` and `refresh` tokens.
3. **Authenticated requests:** Header `Authorization: Bearer <access>`.
4. **Refresh:** On HTTP 401, frontend calls `POST /api/auth/refresh/` with refresh token, stores new access token, retries request.
5. **Profile:** `GET /api/auth/me/` returns `{ id, email, username }`.

Access token lifetime is configured to 1 day in `SIMPLE_JWT` settings.

### 5.2 Authorization Rules

**Board access** — user can access a board if:

- They are the **owner**, OR
- They exist in **BoardMember** for that board

Implemented in `boards/utils.py`:

```python
Board.objects.filter(Q(owner=user) | Q(members__user=user)).distinct()
```

All list and task endpoints call `user_can_access_board()` before read/write.

**Member management** — only **owner** or **admin** members can invite or remove users (`boards/member_views.py`).

**WebSocket** — connection rejected if:

- JWT missing/invalid (`tasks/middleware.py`)
- User not authenticated
- User cannot access the board (`TaskConsumer.connect`)

---

## 6. REST API Design

Base path: `/api/`

### 6.1 Auth

| Method | Path | Body / Notes |
|--------|------|----------------|
| POST | `/auth/register/` | `{ username, email, password }` |
| POST | `/auth/login/` | `{ email, password }` → tokens |
| POST | `/auth/refresh/` | `{ refresh }` |
| GET | `/auth/me/` | Requires JWT |

### 6.2 Boards

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/boards/` | List accessible boards / create (sets current user as owner + admin member) |
| GET | `/boards/:id/` | Board detail |
| GET | `/boards/:id/members/` | Owner + members list |
| POST | `/boards/:id/members/` | `{ email, role? }` — invite by email |
| DELETE | `/boards/:id/members/:user_id/` | Remove member |

### 6.3 Lists

| Method | Path | Description |
|--------|------|-------------|
| POST | `/lists/` | `{ board, title, position? }` |
| GET | `/lists/board/:board_id/` | All columns for board |
| PATCH | `/lists/:id/` | Rename / change position |
| DELETE | `/lists/delete/:id/` | Delete column |

### 6.4 Tasks

| Method | Path | Description |
|--------|------|-------------|
| POST | `/tasks/` | Create task in list |
| GET | `/tasks/list/:list_id/` | Tasks in one column |
| PATCH | `/tasks/:id/` | Edit title, description, assignee, due date |
| PATCH | `/tasks/:id/move/` | `{ list_id, position }` — move or reorder |
| DELETE | `/tasks/delete/:id/` | Delete task |

Move endpoint accepts JSON body or query parameters for flexibility.

---

## 7. Task Ordering Algorithm

Tasks use a **1-based `position`** integer per list.

When a task moves to `(target_list, new_position)`, `apply_task_move()` in `tasks/utils.py`:

1. If **same list, moving down:** decrement positions of tasks between old and new index.
2. If **same list, moving up:** increment positions in the range shifted.
3. If **different list:** decrement positions after old slot in source list; increment positions from new slot in target list.
4. Assign task to target list and `new_position`.

This avoids duplicate positions and keeps ordering consistent for drag-and-drop.

---

## 8. Real-Time Architecture

### 8.1 Components

| Component | File | Role |
|-----------|------|------|
| ASGI router | `backend/asgi.py` | Routes HTTP + WebSocket |
| JWT middleware | `tasks/middleware.py` | Parses `?token=` on WebSocket handshake |
| Consumer | `tasks/consumers.py` | Joins `board_{id}` group, forwards messages |
| Broadcast helper | `tasks/broadcast.py` | `group_send` from sync Django views |
| Channel layer | `settings.CHANNEL_LAYERS` | InMemory (dev) |
| Frontend hook | `frontend/src/hooks/useBoardSocket.js` | Connects, handles events |

### 8.2 Event Flow

```
User A: PATCH /api/tasks/5/move/
    → DB updated via apply_task_move()
    → broadcast_board_event(board_id, {
          event: 'task_moved',
          actor_id: A,
          task: { serialized task }
      })
    → Channel layer → all sockets in group board_{id}
    → TaskConsumer.task_update() → JSON to clients

User B (WebSocket connected):
    → receives message
    → if actor_id !== B.id → reload tasks / update UI
```

### 8.3 Event Types

| Event | Trigger | Payload |
|-------|---------|---------|
| `task_created` | POST task | `task` |
| `task_updated` | PATCH task | `task` |
| `task_deleted` | DELETE task | `task_id`, `list_id` |
| `task_moved` | PATCH move | `task` |
| `list_created` | POST list | `list` |
| `list_updated` | PATCH list | `list` |

**`actor_id`** prevents the client that initiated the action from applying the same update twice (they already updated from the REST response).

### 8.4 WebSocket URL

```
ws://localhost:5173/ws/tasks/<board_id>/?token=<JWT_access_token>
```

Vite dev server proxies `/ws` to Django (`frontend/vite.config.js`).

### 8.5 Production Consideration

`InMemoryChannelLayer` only works with a **single server process**. For production or multiple workers, replace with **Redis**:

```python
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [("127.0.0.1", 6379)]},
    },
}
```

---

## 9. Frontend Architecture

### 9.1 Structure

| Area | Files | Responsibility |
|------|-------|----------------|
| Entry | `main.jsx`, `App.jsx` | Auth provider, screen routing |
| Auth | `AuthContext.jsx`, `LoginPage`, `RegisterPage` | JWT storage, session restore |
| API | `api/client.js`, `api/index.js` | HTTP + refresh + grouped endpoints |
| Boards | `BoardsPage.jsx` | List/create boards |
| Board | `BoardPage.jsx`, `KanbanBoard.jsx` | Single board workspace |
| Columns | `KanbanColumn.jsx` | Column UI, rename, drop targets |
| Cards | `TaskCard.jsx`, `TaskEditModal.jsx` | Display, edit, assign |
| Collaboration | `InviteMembersPanel.jsx` | Invite/remove members |
| Real-time | `useBoardSocket.js` | WebSocket subscription |

### 9.2 Drag and Drop

- Native HTML5: `draggable` on cards, `onDragOver` / `onDrop` on columns and card wrappers.
- Drop **index** (0-based) is converted to **1-based `position`** for the move API.
- Visual hint: `drop-before` CSS class on target card.

### 9.3 State Management

- React `useState` / `useCallback` / `useEffect` (no Redux).
- `tasksByList` object keyed by `list_id` for column task arrays.
- WebSocket events trigger `loadAllTasks()` for remote changes to stay consistent with server ordering.

---

## 10. Security Summary

| Concern | Mitigation |
|---------|------------|
| Unauthenticated API access | DRF `IsAuthenticated` default via JWT |
| Cross-board data access | `user_can_access_board()` on all resources |
| WebSocket hijacking | JWT required on connect; board access verified |
| CORS (dev) | `django-cors-headers` — all origins allowed in DEBUG |
| Password storage | Django hashed passwords |
| Secrets | `SECRET_KEY` in settings — should move to env in production |

---

## 11. Assignment Requirements Traceability

| Requirement | Implementation |
|-------------|----------------|
| Register | `POST /api/auth/register/` + `RegisterPage` |
| Login | `POST /api/auth/login/` + JWT |
| Create boards | `POST /api/boards/` |
| Invite members | `POST /api/boards/:id/members/` + UI panel |
| Create lists | `POST /api/lists/` |
| Create tasks | `POST /api/tasks/` |
| Edit task | `PATCH /api/tasks/:id/` + modal |
| Delete task | `DELETE /api/tasks/delete/:id/` |
| Assign users | `assigned_to` on Task + dropdown in modal |
| Move between lists | `PATCH /api/tasks/:id/move/` + drag-drop |
| Reorder tasks | Move API with computed `position` |
| Real-time | WebSockets + Channels broadcast |
| Drag & drop UI | React + HTML5 DnD |
| JWT auth | djangorestframework-simplejwt |

---

## 12. How to Run (Summary)

See [README.md](./README.md).

1. `pip install -r requirements.txt`
2. `python manage.py migrate`
3. `python manage.py runserver`
4. `cd frontend && npm install && npm run dev`
5. Open http://localhost:5173

---

## 13. Future Improvements

- PostgreSQL and Redis in production
- Environment-based configuration (`.env`)
- React Router for shareable board URLs
- Optimistic UI updates with conflict handling
- Unit and integration tests (pytest, React Testing Library)
- CI pipeline (GitHub Actions)
- Role-based permissions per action (e.g. member cannot delete board)
- Email notifications on invite

---

## 14. Conclusion

This project implements a full-stack collaborative Kanban board meeting the assignment specification: JWT-secured REST APIs, relational schema for boards/lists/tasks/members, drag-and-drop task management, and real-time multi-user synchronization via WebSockets. The codebase is modular (Django apps per domain), documented via Swagger, and runnable from a single `README` with pinned Python dependencies in `requirements.txt`.

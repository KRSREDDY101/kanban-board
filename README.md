# Real-Time Collaborative Kanban Board

A full-stack Kanban board (Trello-style) where multiple users can manage tasks on shared boards with **JWT authentication**, **REST APIs**, **drag-and-drop**, and **real-time updates** over **WebSockets**.

**Author:** K Raj Shekhar Reddy  
**Repository:** https://github.com/KRSREDDY101/kanban-board

---

## Tech Stack

| Layer | Technologies |
|-------|----------------|
| Frontend | React 19, Vite |
| Backend | Django 6, Django REST Framework |
| Auth | JSON Web Token (djangorestframework-simplejwt) |
| Real-time | Django Channels, WebSockets (ASGI / Daphne) |
| Database | SQLite (development) |
| API Docs | drf-spectacular (Swagger UI) |

---

## Features

- User **registration** and **login** (JWT access + refresh tokens)
- **Boards** — create and list boards the user owns or is invited to
- **Invite members** by email with roles (`admin` / `member`)
- **Lists (columns)** — create, rename; ordered by `position`
- **Tasks (cards)** — create, edit, delete; title, description, due date, assignee
- **Drag and drop** — move tasks between lists and reorder within a list
- **Real-time sync** — other users on the same board see changes instantly via WebSocket

---

## Project Structure

```
kanban-board/
├── accounts/          # Custom User model, register, JWT login
├── boards/            # Board & BoardMember models, invite API
├── lists_app/         # List (column) model & APIs
├── tasks/             # Task model, move logic, WebSocket consumer
├── backend/           # Django settings, URLs, ASGI
├── frontend/          # React application
├── manage.py
└── requirements.txt
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+ and npm

---

## Setup & Run

### 1. Backend

```bash
git clone https://github.com/KRSREDDY101/kanban-board.git
cd kanban-board

python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend runs at **http://127.0.0.1:8000**

- Swagger API docs: http://127.0.0.1:8000/api/docs/

### 2. Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173** (proxies `/api` and `/ws` to Django).

---

## How to Test

1. Open http://localhost:5173 and **register** two users (e.g. normal + incognito window).
2. User A: create a board → add columns (To Do, In Progress, Done) → add tasks.
3. User A: **Team & invites** → invite User B by email.
4. User B: open the same board from **Your boards**.
5. User A: drag a task or edit it → User B should see the change **without refreshing**.

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register |
| POST | `/api/auth/login/` | Login (returns JWT) |
| GET | `/api/auth/me/` | Current user |
| GET/POST | `/api/boards/` | List / create boards |
| GET | `/api/boards/:id/` | Board detail |
| GET/POST | `/api/boards/:id/members/` | List / invite members |
| DELETE | `/api/boards/:id/members/:user_id/` | Remove member |
| POST | `/api/lists/` | Create column |
| PATCH | `/api/lists/:id/` | Update column |
| GET | `/api/lists/board/:board_id/` | Columns for board |
| POST | `/api/tasks/` | Create task |
| PATCH | `/api/tasks/:id/` | Update task |
| PATCH | `/api/tasks/:id/move/` | Move / reorder task |
| DELETE | `/api/tasks/delete/:id/` | Delete task |

**WebSocket:** `ws://<host>/ws/tasks/<board_id>/?token=<access_token>`

---

## Documentation

See **[TECHNICAL_WRITEUP.md](./TECHNICAL_WRITEUP.md)** for architecture, database design, authentication flow, real-time implementation, and design decisions.

---

## Notes

- `venv/`, `node_modules/`, and `db.sqlite3` are gitignored; run migrations locally after clone.
- Channel layer uses **InMemoryChannelLayer** (single process). Production should use **Redis**.

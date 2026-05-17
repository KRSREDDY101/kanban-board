import { get, post, patch, del } from './client';

export const auth = {
  login: (email, password) => post('/auth/login/', { email, password }),
  register: (username, email, password) =>
    post('/auth/register/', { username, email, password }),
  me: () => get('/auth/me/'),
};

export const boards = {
  list: () => get('/boards/'),
  get: (id) => get(`/boards/${id}/`),
  create: (name) => post('/boards/', { name }),
  members: (boardId) => get(`/boards/${boardId}/members/`),
  invite: (boardId, email, role = 'member') =>
    post(`/boards/${boardId}/members/`, { email, role }),
  removeMember: (boardId, userId) =>
    del(`/boards/${boardId}/members/${userId}/`),
};

export const lists = {
  byBoard: (boardId) => get(`/lists/board/${boardId}/`),
  create: (board, title) => post('/lists/', { board, title }),
  update: (id, data) => patch(`/lists/${id}/`, data),
  remove: (id) => del(`/lists/delete/${id}/`),
};

export const tasks = {
  byList: (listId) => get(`/tasks/list/${listId}/`),
  create: (list, title, extra = {}) => post('/tasks/', { list, title, ...extra }),
  update: (id, data) => patch(`/tasks/${id}/`, data),
  move: (id, listId, position) =>
    patch(`/tasks/${id}/move/`, { list_id: listId, position }),
  remove: (id) => del(`/tasks/delete/${id}/`),
};

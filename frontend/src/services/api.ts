import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

// Aggiungi token a ogni richiesta
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const auth = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Tickets
export const tickets = {
  getAll: (params?: any) => api.get('/tickets', { params }),
  getById: (id: string) => api.get(`/tickets/${id}`),
  create: (data: any) => api.post('/tickets', data),
  update: (id: string, data: any) => api.put(`/tickets/${id}`, data),
  addComment: (id: string, content: string) =>
    api.post(`/tickets/${id}/comments`, { content }),
  uploadFile: (id: string, file: File, commentId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (commentId) {
      formData.append('commentId', commentId);
    }
    return api.post(`/tickets/${id}/attachments`, formData);
  },
  getHistory: (id: string) => api.get(`/tickets/${id}/history`),
  assignUsers: (id: string, userIds: string[]) =>
    api.post(`/tickets/${id}/assign-users`, { userIds }),
  unassignUser: (id: string, userId: string) =>
    api.delete(`/tickets/${id}/assign-users/${userId}`),
  assignDepartments: (id: string, departments: string[]) =>
    api.post(`/tickets/${id}/assign-departments`, { departments }),
};

// Onboarding
export const onboarding = {
  getAll: () => api.get('/onboarding'),
  create: (data: any) => api.post('/onboarding', data),
  updateTask: (id: string, taskId: string, completed: boolean) =>
    api.put(`/onboarding/${id}/tasks/${taskId}`, { completed }),
  get: (id: string) => api.get(`/onboarding/${id}`),
};

// Offboarding
export const offboarding = {
  getAll: () => api.get('/offboarding'),
  create: (data: any) => api.post('/offboarding', data),
  updateTask: (id: string, taskId: string, completed: boolean) =>
    api.put(`/offboarding/${id}/tasks/${taskId}`, { completed }),
  get: (id: string) => api.get(`/offboarding/${id}`),
};

// SLA
export const sla = {
  getMetrics: () => api.get('/sla/metrics'),
  getConfig: () => api.get('/sla/config'),
  updateConfig: (data: any) => api.post('/sla/config', data),
  getViolations: () => api.get('/sla/violations'),
};

// Users
export const users = {
  getAll: () => api.get('/users'),
};

// Audit
export const audit = {
  getLogs: (params?: any) => api.get('/audit', { params }),
  getISOReport: (params?: any) => api.get('/audit/iso-report', { params }),
  export: (params?: any) =>
    api.get('/audit/export', { params, responseType: 'blob' }),
};

export default api;

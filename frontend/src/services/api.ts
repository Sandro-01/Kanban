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
  create: (data: any) => api.post('/tickets', data),
  update: (id: string, data: any) => api.put(`/tickets/${id}`, data),
  addComment: (id: string, content: string) =>
    api.post(`/tickets/${id}/comments`, { content }),
  uploadFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/tickets/${id}/attachments`, formData);
  },
  getHistory: (id: string) => api.get(`/tickets/${id}/history`),
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
  getAllAdmin: () => api.get('/users/all'),
  get: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  uploadAvatar: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post(`/users/${id}/avatar`, formData);
  },
  removeAvatar: (id: string) => api.delete(`/users/${id}/avatar`),
  saveAvatarConfig: (id: string, config: object) =>
    api.put(`/users/${id}/avatar-config`, config),
  removeAvatarConfig: (id: string) => api.delete(`/users/${id}/avatar-config`),
  deactivate: (id: string) => api.delete(`/users/${id}`),
};

// Audit
export const audit = {
  getLogs: (params?: any) => api.get('/audit', { params }),
  getISOReport: (params?: any) => api.get('/audit/iso-report', { params }),
  export: (params?: any) =>
    api.get('/audit/export', { params, responseType: 'blob' }),
};

export default api;

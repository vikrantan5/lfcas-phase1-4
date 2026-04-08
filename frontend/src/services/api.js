import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Advocate APIs
export const advocateAPI = {
  createProfile: (data) => api.post('/advocates/profile', data),
  list: (params) => api.get('/advocates', { params }),
  getById: (id) => api.get(`/advocates/${id}`),
  updateStatus: (id, status) => api.patch(`/advocates/${id}/status`, { new_status: status }),
};

// AI APIs
export const aiAPI = {
  analyze: (data) => api.post('/ai/analyze', data),
};

// Case APIs
export const caseAPI = {
  create: (data) => api.post('/cases', data),
  list: (params) => api.get('/cases', { params }),
  getById: (id) => api.get(`/cases/${id}`),
  assignAdvocate: (caseId, advocateId) => 
    api.patch(`/cases/${caseId}/assign-advocate`, null, { params: { advocate_id: advocateId } }),
  updateStatus: (caseId, status) => 
    api.patch(`/cases/${caseId}/status`, null, { params: { new_status: status } }),
};

// Hearing APIs
export const hearingAPI = {
  create: (data) => api.post('/hearings', data),
  getByCaseId: (caseId) => api.get(`/hearings/case/${caseId}`),
};

// Document APIs
export const documentAPI = {
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getByCaseId: (caseId) => api.get(`/documents/case/${caseId}`),
};

// Message APIs
export const messageAPI = {
  send: (data) => api.post('/messages', data),
  getByCaseId: (caseId) => api.get(`/messages/case/${caseId}`),
};

// Notification APIs
export const notificationAPI = {
  list: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
};

// Rating APIs
export const ratingAPI = {
  create: (data) => api.post('/ratings', data),
  getByAdvocateId: (advocateId, params) => api.get(`/ratings/advocate/${advocateId}`, { params }),
};

// Admin APIs
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getLogs: (params) => api.get('/admin/logs', { params }),
};

export default api;

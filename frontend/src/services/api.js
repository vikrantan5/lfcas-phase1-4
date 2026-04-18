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
   updateOnboardingStatus: (completed) => api.patch('/users/onboarding-status', null, { params: { completed } }),
};

// Advocate APIs
export const advocateAPI = {
  createProfile: (data) => api.post('/advocates/profile', data),
  list: (params) => api.get('/advocates', { params }),
  getById: (id) => api.get(`/advocates/${id}`),
  updateStatus: (id, status) => api.patch(`/advocates/${id}/status`, { new_status: status }),
    updateProfile: (id, data) => api.patch(`/advocates/${id}`, data),
};

// AI APIs
export const aiAPI = {
  analyze: (data) => api.post('/ai/analyze', data),
};

// Meeting Request APIs (NEW - Correct Flow)
export const meetingRequestAPI = {
  create: (data) => api.post('/meeting-requests', data),
  list: (params) => api.get('/meeting-requests', { params }),
  getById: (id) => api.get(`/meeting-requests/${id}`),
  respond: (id, data) => api.patch(`/meeting-requests/${id}/respond`, data),
};

// Meeting APIs (NEW - Correct Flow)
export const meetingAPI = {
  schedule: (data) => api.post('/meetings', data),
  list: (params) => api.get('/meetings', { params }),
  getById: (id) => api.get(`/meetings/${id}`),
  complete: (id) => api.patch(`/meetings/${id}/complete`),
  decision: (id, data) => api.patch(`/meetings/${id}/decision`, data),
};

// Case APIs (Updated for new flow)
export const caseAPI = {
  list: (params) => api.get('/cases', { params }),
  getById: (id) => api.get(`/cases/${id}`),
    create: (data) => api.post('/cases/draft', data),
  updateStage: (id, data) => api.patch(`/cases/${id}/stage`, data),
  getStageHistory: (id) => api.get(`/cases/${id}/stage-history`),
   getAIInsights: (id, forceRegenerate = false) => api.get(`/cases/${id}/ai-insights`, { params: { force_regenerate: forceRegenerate } }),
};


// Client Dashboard API
export const dashboardAPI = {
  getSummary: () => api.get('/client/dashboard-summary'),
   getReminders: () => api.get('/client/reminders'),
  getRecommendedAdvocates: () => api.get('/client/recommended-advocates'),
   getDownloads: () => api.get('/client/downloads'),
  getLegalResources: (category) => api.get('/legal-resources', { params: { category } }),
  getUserProfile: () => api.get('/users/profile'),
  updateUserProfile: (data) => api.patch('/users/profile', data),
  sendAdvocateEmail: (data) => api.post('/client/send-advocate-email', data),
};



// Advocate Dashboard API
export const advocateDashboardAPI = {
  getSummary: () => api.get('/advocate/dashboard-summary'),
  getActivityStats: () => api.get('/advocate/activity-stats'),
  getTodayHearings: () => api.get('/advocate/today-hearings'),
  getReminders: () => api.get('/advocate/reminders'),
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

    // Document Edit Permission APIs
  createEditRequest: (data) => api.post('/documents/edit-request', data),
  getClientEditRequests: () => api.get('/documents/edit-requests/client'),
  getAdvocateEditRequests: (status) => api.get('/documents/edit-requests/advocate', { params: { status } }),
  updateEditRequest: (requestId, data) => api.patch(`/documents/edit-requests/${requestId}`, data),
  getEditStatus: (documentId) => api.get(`/documents/${documentId}/edit-status`),
  
  // Document Version APIs
  getVersions: (documentId) => api.get(`/documents/${documentId}/versions`),
  createVersion: (documentId, formData) => api.post(`/documents/${documentId}/versions`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Message APIs
export const messageAPI = {
  send: (data) => api.post('/messages', data),
  getByCaseId: (caseId) => api.get(`/messages/case/${caseId}`),
  getByMeetingRequestId: (requestId) => api.get(`/messages/meeting-request/${requestId}`),
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
   getTimelineAnalytics: (days = 7) => api.get('/admin/analytics/timeline', { params: { days } }),
  approveAdvocate: (id) => api.patch(`/advocates/${id}/approve`),
  rejectAdvocate: (id, reason) => api.patch(`/advocates/${id}/reject`, null, { params: { reason } }),
  downloadCasesReport: () => api.get('/admin/reports/cases', { responseType: 'blob' }),
  downloadFeedbackReport: () => api.get('/admin/reports/feedback', { responseType: 'blob' }),
  downloadRevenueReport: () => api.get('/admin/reports/revenue', { responseType: 'blob' }),

   // Warnings
  createWarning: (advocateId, severity, reason, description) => 
    api.post('/admin/warnings', null, { 
      params: { advocate_id: advocateId, severity, reason, description } 
    }),
  getWarnings: (params) => api.get('/admin/warnings', { params }),
  
  // View all advocates with ratings
  getAllAdvocates: (params) => api.get('/admin/advocates', { params }),
  getAdvocateDetails: (advocateId) => api.get(`/admin/advocates/${advocateId}/details`),
};



// Payment APIs
export const paymentAPI = {
  // Advocate payment settings
  saveSettings: (data) => api.post('/payments/settings', data),
  getSettings: () => api.get('/payments/settings'),
  
  // Payment requests
  createRequest: (data) => api.post('/payments/request', data),
  getRequests: (params) => api.get('/payments/requests', { params }),
  getRequestById: (id) => api.get(`/payments/requests/${id}`),
  
  // Payment verification
  verify: (data) => api.post('/payments/verify', data),
  
  // Advocate key lookup for clients
  getAdvocateKey: (advocateId) => api.get(`/payments/advocate-key/${advocateId}`),
};

export default api;

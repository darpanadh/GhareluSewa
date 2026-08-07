import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if 401 comes from a protected route (not login endpoint)
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  reverifyKYC: (data) => api.post('/auth/reverify-kyc', data),
  getCurrentUser: () => api.get('/auth/me'),
};

// User endpoints
export const userAPI = {
  updateProfile: (data) => api.patch('/users/profile', data),
  getProviders: (params) => api.get('/users/providers', { params }),
  getProviderById: (userId) => api.get(`/users/providers/${userId}`),
  searchUsers: (params) => api.get('/users/search', { params }),
};

// Category endpoints
export const categoryAPI = {
  getAllCategories: () => api.get('/categories'),
  getProvidersByCategory: (categoryId) => api.get(`/categories/${categoryId}/providers`),
};

// Booking endpoints
export const bookingAPI = {
  createBooking: (data) => api.post('/bookings', data),
  getUserBookings: (params) => api.get('/bookings', { params }),
  getBookingById: (bookingId) => api.get(`/bookings/${bookingId}`),
  updateBookingStatus: (bookingId, data) => api.patch(`/bookings/${bookingId}/status`, data),
  cancelBooking: (bookingId) => api.patch(`/bookings/${bookingId}/cancel`),
  createEmergencyBooking: (data) => api.post('/bookings/emergency/create', data),
};

// Review endpoints
export const reviewAPI = {
  createReview: (data) => api.post('/reviews', data),
  getProviderReviews: (providerId, params) => api.get(`/reviews/provider/${providerId}`, { params }),
  getBookingReview: (bookingId) => api.get(`/reviews/booking/${bookingId}`),
  getProviderStats: (providerId) => api.get(`/reviews/stats/${providerId}`),
  deleteReview: (reviewId) => api.delete(`/reviews/${reviewId}`),
};

// Message endpoints
export const messageAPI = {
  sendMessage: (data) => api.post('/messages', data),
  getBookingMessages: (bookingId, params) => api.get(`/messages/booking/${bookingId}`, { params }),
  getMessageCount: (bookingId) => api.get(`/messages/booking/${bookingId}/count`),
};

// Notification endpoints
export const notificationAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread/count'),
  markAsRead: (notificationId) => api.patch(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  deleteNotification: (notificationId) => api.delete(`/notifications/${notificationId}`),
};

// Provider endpoints
export const providerAPI = {
  createProfile: (data) => api.post('/providers/profile', data),
  getProfile: (providerId) => api.get(`/providers/profile/${providerId}`),
  updateProfile: (data) => api.patch('/providers/profile', data),
  toggleAvailability: (data) => api.patch('/providers/availability', data),
  getEarnings: (params) => api.get('/providers/earnings', { params }),
  requestPayout: (data) => api.post('/providers/payouts', data),
  getPayouts: () => api.get('/providers/payouts'),
};

// Admin endpoints
export const adminAPI = {
  getPlatformStats: () => api.get('/admin/stats'),
  getPendingProviders: (params) => api.get('/admin/providers/pending', { params }),
  getAllProviders: (params) => api.get('/admin/providers/all', { params }),
  verifyProvider: (userId) => api.patch(`/admin/providers/${userId}/verify`),
  rejectProvider: (userId, data) => api.patch(`/admin/providers/${userId}/reject`, data),
  getAllBookings: (params) => api.get('/admin/bookings', { params }),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getAllUsers: (params) => api.get('/admin/users', { params }),
  deactivateUser: (userId, data) => api.patch(`/admin/users/${userId}/deactivate`, data),
  activateUser: (userId) => api.patch(`/admin/users/${userId}/activate`),
  getPayoutRequests: () => api.get('/admin/payouts'),
  updatePayoutStatus: (id, status) => api.patch(`/admin/payouts/${id}/status`, { status }),
};

// Payment endpoints (eSewa)
export const paymentAPI = {
  initiatePayment: (bookingId) => api.post(`/payments/initiate/${bookingId}`),
  verifyPayment: (params) => api.get('/payments/verify', { params }),
  getPaymentByBooking: (bookingId) => api.get(`/payments/booking/${bookingId}`),
  getAllPayments: (params) => api.get('/payments/all', { params }),
};

export default api;

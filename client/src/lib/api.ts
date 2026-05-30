import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// ── In-memory token store ────────────────────────────────────────────────────
// Tokens live only in memory — cleared automatically on every page refresh.
let _userToken: string | null = null;
let _adminToken: string | null = null;

export const setUserToken  = (t: string | null) => { _userToken  = t; };
export const setAdminToken = (t: string | null) => { _adminToken = t; };

// ── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const isAdminRoute = config.url?.startsWith('/admin') || config.url?.includes('/admin/');
  // Admin routes use admin token; everything else uses user token
  // If user IS admin, their token works for both (same JWT, role checked server-side)
  const token = isAdminRoute ? (_adminToken || _userToken) : _userToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error or server completely unreachable
    if (!error.response) {
      if (typeof window !== 'undefined') {
        // Only show once per offline event to avoid toast spam
        const isOffline = !navigator.onLine;
        console.error('[API] Network error:', isOffline ? 'offline' : 'server unreachable');
      }
      return Promise.reject(
        Object.assign(error, {
          response: {
            data: { message: navigator?.onLine === false
              ? 'You appear to be offline. Please check your connection.'
              : 'Cannot reach the server. Please try again shortly.' },
            status: 0,
          },
        })
      );
    }

    if (typeof window !== 'undefined' && error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAdminRoute = url.startsWith('/admin') || url.includes('/admin/');

      if (isAdminRoute) {
        _adminToken = null;
        if (!window.location.pathname.startsWith('/admin/login')) {
          window.location.href = '/admin/login';
          return new Promise(() => {});
        }
      } else {
        _userToken = null;
        const currentPath = window.location.pathname + window.location.search;
        if (!currentPath.startsWith('/auth/')) {
          window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
          return new Promise(() => {});
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Movies ─────────────────────────────
export const getMovies = (params?: Record<string, string>) => api.get('/movies', { params });
export const getMovieById = (id: string) => api.get(`/movies/${id}`);
export const getShowsByMovie = (movieId: string, params?: Record<string, string>) =>
  api.get(`/movies/${movieId}/shows`, { params });
export const getNearbyTheaters = (lat: number, lng: number, radius = 10) =>
  api.get('/theaters/nearby', { params: { lat, lng, radius } });
export const ensureCity = (city: string) => api.post('/theaters/ensure-city', { city });

// ─── Shows ──────────────────────────────
export const getShowById = (id: string) => api.get(`/shows/${id}`);
export const createShow = (data: unknown) => api.post('/shows', data);
export const deleteShow = (id: string) => api.delete(`/shows/${id}`);

// ─── Bookings ───────────────────────────
export const createBooking = (data: unknown) => api.post('/bookings', data);
export const getMyBookings = () => api.get('/bookings/my');
export const getBookingById = (id: string) => api.get(`/bookings/${id}`);
export const cancelBooking = (id: string) => api.put(`/bookings/${id}/cancel`);
export const verifyBooking = (bookingId: string) => api.get(`/bookings/verify/${bookingId}`);
export const lockSeats = (data: unknown) => api.post('/bookings/lock', data);
export const unlockSeats = (data: unknown) => api.post('/bookings/unlock', data);

// ─── Admin ──────────────────────────────
export const getDashboard = () => api.get('/admin/dashboard');
export const getAllUsers = () => api.get('/admin/users');
export const getUserBookings = (userId: string) => api.get(`/admin/users/${userId}/bookings`);
export const getAllBookings = (params?: Record<string, string>) => api.get('/admin/bookings', { params });
export const adminCancelBooking = (id: string) => api.put(`/admin/bookings/${id}/cancel`);
export const createTheater = (data: unknown) => api.post('/admin/theaters', data);
export const getAllTheaters = (params?: Record<string, string>) => api.get('/admin/theaters', { params });
export const getTheaterShows = (theaterId: string) => api.get(`/admin/theaters/${theaterId}/shows`);
export const getShowSeatMap = (showId: string) => api.get(`/admin/shows/${showId}/seatmap`);

// ─── Admin Movies ────────────────────────
export const adminCreateMovie = (data: unknown) => api.post('/movies', data);
export const adminUpdateMovie = (id: string, data: unknown) => api.put(`/movies/${id}`, data);
export const adminDeleteMovie = (id: string) => api.delete(`/movies/${id}`);

export default api;

// ─── User ────────────────────────────────────────────────
export const uploadAvatar = (formData: FormData) =>
  api.post('/auth/upload-avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updatePassword = (data: { newPassword: string; confirmPassword: string }) =>
  api.put('/auth/update-password', data);

// ─── Wallet ──────────────────────────────────────────────
export const getWallet = () => api.get('/wallet');
export const topUpWallet = (data: { amount: number; paymentMethod: string }) => api.post('/wallet/topup', data);

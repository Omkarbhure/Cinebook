import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cinebook_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Movies ─────────────────────────────
export const getMovies = (params?: Record<string, string>) => api.get('/movies', { params });
export const getMovieById = (id: string) => api.get(`/movies/${id}`);
export const getShowsByMovie = (movieId: string, params?: Record<string, string>) =>
  api.get(`/movies/${movieId}/shows`, { params });
export const getNearbyTheaters = (lat: number, lng: number, radius = 10) => 
  api.get('/theaters/nearby', { params: { lat, lng, radius } });

// ─── Shows ──────────────────────────────
export const getShowById = (id: string) => api.get(`/shows/${id}`);
export const createShow = (data: unknown) => api.post('/shows', data);
export const deleteShow = (id: string) => api.delete(`/shows/${id}`);

// ─── Bookings ───────────────────────────
export const createBooking = (data: unknown) => api.post('/bookings', data);
export const getMyBookings = () => api.get('/bookings/my');
export const getBookingById = (id: string) => api.get(`/bookings/${id}`);
export const cancelBooking = (id: string) => api.put(`/bookings/${id}/cancel`);

// ─── Admin ──────────────────────────────
export const getDashboard = () => api.get('/admin/dashboard');
export const getAllUsers = () => api.get('/admin/users');
export const getAllBookings = () => api.get('/admin/bookings');
export const createTheater = (data: unknown) => api.post('/admin/theaters', data);
export const getAllTheaters = () => api.get('/admin/theaters');

// ─── Admin Movies ────────────────────────
export const adminCreateMovie = (data: unknown) => api.post('/movies', data);
export const adminUpdateMovie = (id: string, data: unknown) => api.put(`/movies/${id}`, data);
export const adminDeleteMovie = (id: string) => api.delete(`/movies/${id}`);

export default api;

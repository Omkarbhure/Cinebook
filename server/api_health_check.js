require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const BASE = 'http://localhost:5000/api';
const api  = axios.create({ baseURL: BASE, timeout: 10000, validateStatus: () => true });

let pass = 0, fail = 0;
const failures = [];

const check = (id, name, ok, note = '') => {
  const icon = ok ? '✅' : '❌';
  if (ok) pass++; else { fail++; failures.push(`${id}: ${name} — ${note}`); }
  console.log(`${icon} [${id}] ${name}${note ? '  →  ' + note : ''}`);
};

async function run() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('         CineBook — API Health Check');
  console.log('══════════════════════════════════════════════════════\n');

  // ── Get tokens ──────────────────────────────────────────────────────────
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('./src/models/User');
  const admin = await User.findOne({ role: 'admin' });
  const user  = await User.findOne({ role: 'user' });
  await mongoose.disconnect();

  const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const userToken  = user ? jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' }) : null;
  const authH  = { Authorization: `Bearer ${userToken}` };
  const adminH = { Authorization: `Bearer ${adminToken}` };

  console.log(`Admin: ${admin.name} (${admin.email})`);
  console.log(`User:  ${user?.name || 'none'} (${user?.email || user?.phone || 'N/A'})\n`);

  // ── 1. Health ────────────────────────────────────────────────────────────
  console.log('── Health ──────────────────────────────────────────────');
  let r = await api.get('/health');
  check('H01', 'GET /health', r.status === 200, r.data?.status);

  // ── 2. Auth ──────────────────────────────────────────────────────────────
  console.log('\n── Auth ────────────────────────────────────────────────');

  r = await api.post('/auth/login', { username: 'admin', password: 'admin123' });
  check('A01', 'POST /auth/login (admin username)', r.status === 200 && r.data.user?.role === 'admin', r.data.message || 'ok');

  r = await api.post('/auth/login', { email: admin.email, password: 'admin123' });
  check('A02', 'POST /auth/login (admin email)', r.status === 200 && r.data.user?.role === 'admin', r.data.message || 'ok');

  r = await api.post('/auth/login', { email: 'nobody@x.com', password: 'wrong' });
  check('A03', 'POST /auth/login (wrong creds → 401)', r.status === 401, r.data.message);

  r = await api.post('/auth/send-otp', { phone: '+919876543210' });
  check('A04', 'POST /auth/send-otp (demo)', r.status === 200, r.data.message);

  r = await api.post('/auth/verify-otp', { phone: '+919876543210', otp: '123456' });
  check('A05', 'POST /auth/verify-otp (demo 123456)', r.status === 200 && r.data.token, r.data.message || 'ok');

  r = await api.post('/auth/verify-otp', { phone: '+919876543210', otp: '000000' });
  check('A06', 'POST /auth/verify-otp (wrong → 400)', r.status === 400, r.data.message);

  r = await api.get('/auth/me', { headers: authH });
  check('A07', 'GET /auth/me (valid token)', r.status === 200 && r.data.user, r.data.message || 'ok');

  r = await api.get('/auth/me');
  check('A08', 'GET /auth/me (no token → 401)', r.status === 401, r.data.message);

  r = await api.post('/auth/forgot-password', { email: 'nobody@x.com' });
  check('A09', 'POST /auth/forgot-password (unknown email → 404)', r.status === 404 || r.status === 429, r.data.message);

  // ── 3. Movies ────────────────────────────────────────────────────────────
  console.log('\n── Movies ──────────────────────────────────────────────');

  r = await api.get('/movies');
  check('M01', 'GET /movies', r.status === 200 && Array.isArray(r.data.movies), `count=${r.data.movies?.length}`);
  const movieId = r.data.movies?.[0]?._id;

  r = await api.get('/movies?status=now_playing');
  check('M02', 'GET /movies?status=now_playing', r.status === 200 && r.data.movies?.every(m => m.status === 'now_playing'), `count=${r.data.movies?.length}`);

  r = await api.get('/movies?status=upcoming');
  check('M03', 'GET /movies?status=upcoming', r.status === 200 && r.data.movies?.every(m => m.status === 'upcoming'), `count=${r.data.movies?.length}`);

  r = await api.get('/movies?genre=Action');
  check('M04', 'GET /movies?genre=Action', r.status === 200 && r.data.movies?.every(m => m.genre?.includes('Action')), `count=${r.data.movies?.length}`);

  r = await api.get('/movies?languages=Hindi');
  check('M05', 'GET /movies?languages=Hindi', r.status === 200 && r.data.movies?.every(m => m.languages?.includes('Hindi')), `count=${r.data.movies?.length}`);

  r = await api.get('/movies?sortBy=rating');
  const ratings = r.data.movies?.map(m => m.rating) || [];
  const sorted = ratings.every((v, i) => i === 0 || v <= ratings[i-1]);
  check('M06', 'GET /movies?sortBy=rating (desc)', r.status === 200 && sorted, `first=${ratings[0]}`);

  r = await api.get('/movies?search=Godzilla');
  check('M07', 'GET /movies?search=Godzilla', r.status === 200 && r.data.movies?.length > 0, `count=${r.data.movies?.length}`);

  r = await api.get(`/movies/${movieId}`);
  check('M08', 'GET /movies/:id', r.status === 200 && r.data.movie?._id === movieId, r.data.movie?.title);

  r = await api.get('/movies/invalid-id-xyz');
  check('M09', 'GET /movies/invalid-id → 400/404', r.status === 400 || r.status === 404, r.data.message);

  r = await api.get('/movies/000000000000000000000000');
  check('M10', 'GET /movies/nonexistent → 404', r.status === 404, r.data.message);

  // ── 4. Shows ─────────────────────────────────────────────────────────────
  console.log('\n── Shows ───────────────────────────────────────────────');

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  r = await api.get(`/movies/${movieId}/shows?date=${dateStr}`);
  check('S01', 'GET /movies/:id/shows?date=today', r.status === 200 && Array.isArray(r.data.shows), `count=${r.data.shows?.length}`);
  const showId = r.data.shows?.[0]?._id;

  r = await api.get(`/movies/${movieId}/shows?date=2099-01-01`);
  check('S02', 'GET /movies/:id/shows?date=far-future (empty)', r.status === 200 && r.data.shows?.length === 0, `count=${r.data.shows?.length}`);

  r = await api.get(`/movies/${movieId}/shows?date=${dateStr}&city=Mumbai`);
  check('S03', 'GET /movies/:id/shows?city=Mumbai', r.status === 200 && Array.isArray(r.data.shows), `count=${r.data.shows?.length}`);

  if (showId) {
    r = await api.get(`/shows/${showId}`);
    check('S04', 'GET /shows/:id', r.status === 200 && r.data.show?._id === showId, r.data.show?.time);
  }

  r = await api.get('/shows/000000000000000000000000');
  check('S05', 'GET /shows/nonexistent → 404', r.status === 404, r.data.message);

  // ── 5. Theaters ──────────────────────────────────────────────────────────
  console.log('\n── Theaters ────────────────────────────────────────────');

  r = await api.get('/theaters?city=Mumbai');
  check('T01', 'GET /theaters?city=Mumbai', r.status === 200 && Array.isArray(r.data.data), `count=${r.data.data?.length}`);
  const theaterId = r.data.data?.[0]?._id;

  r = await api.get('/theaters?city=');
  check('T02', 'GET /theaters (no city → 400)', r.status === 400, r.data.message);

  if (theaterId) {
    r = await api.get(`/theaters/details/${theaterId}`);
    check('T03', 'GET /theaters/details/:id', r.status === 200 && r.data.data?._id, r.data.data?.name);

    r = await api.get(`/shows/theater/${theaterId}?date=${dateStr}`);
    check('T04', 'GET /shows/theater/:id?date=today', r.status === 200 && Array.isArray(r.data.shows), `count=${r.data.shows?.length}`);
  }

  r = await api.get('/theaters/nearby?lat=19.076&lng=72.877&radius=10');
  check('T05', 'GET /theaters/nearby', r.status === 200 && Array.isArray(r.data.data), `count=${r.data.data?.length}`);

  r = await api.get('/theaters/nearby');
  check('T06', 'GET /theaters/nearby (no coords → 400)', r.status === 400, r.data.message);

  r = await api.post('/theaters/ensure-city', { city: 'TestHealthCity' });
  check('T07', 'POST /theaters/ensure-city', r.status === 200 || r.status === 201, r.data.message);

  // ── 6. Bookings ──────────────────────────────────────────────────────────
  console.log('\n── Bookings ────────────────────────────────────────────');

  r = await api.post('/bookings', { showId, seats: [{ row: 0, col: 0 }] });
  check('B01', 'POST /bookings (no auth → 401)', r.status === 401, r.data.message);

  if (userToken) {
    r = await api.get('/bookings/my', { headers: authH });
    check('B02', 'GET /bookings/my', r.status === 200 && Array.isArray(r.data.bookings), `count=${r.data.bookings?.length}`);

    r = await api.post('/bookings', { showId, seats: Array.from({length:11}, (_,i) => ({row:0,col:i})), paymentMethod:'card' }, { headers: authH });
    check('B03', 'POST /bookings (11 seats → 400)', r.status === 400, r.data.message);

    r = await api.post('/bookings', { showId, seats: [], paymentMethod: 'card' }, { headers: authH });
    check('B04', 'POST /bookings (empty seats → 400)', r.status === 400, r.data.message);

    r = await api.post('/bookings', { showId, seats: [{ row: 0, col: 0 }], paymentMethod: 'invalid' }, { headers: authH });
    check('B05', 'POST /bookings (invalid payment → 400)', r.status === 400, r.data.message);

    // Lock seats
    if (showId) {
      r = await api.post('/bookings/lock', { showId, seats: [{ row: 5, col: 5 }] }, { headers: authH });
      check('B06', 'POST /bookings/lock', r.status === 200 || r.status === 409, r.data.message);

      r = await api.post('/bookings/unlock', { showId, seats: [{ row: 5, col: 5 }] }, { headers: authH });
      check('B07', 'POST /bookings/unlock', r.status === 200, r.data.message);
    }
  }

  r = await api.get('/bookings/verify/CBFAKENOTEXIST');
  check('B08', 'GET /bookings/verify/fake → 404', r.status === 404, r.data.message);

  // ── 7. Wallet ────────────────────────────────────────────────────────────
  console.log('\n── Wallet ──────────────────────────────────────────────');

  r = await api.get('/wallet');
  check('W01', 'GET /wallet (no auth → 401)', r.status === 401, r.data.message);

  if (userToken) {
    r = await api.get('/wallet', { headers: authH });
    check('W02', 'GET /wallet', r.status === 200 && typeof r.data.balance === 'number', `balance=₹${r.data.balance}`);

    r = await api.post('/wallet/topup', { amount: 100, paymentMethod: 'upi' }, { headers: authH });
    check('W03', 'POST /wallet/topup ₹100', r.status === 200 && r.data.balance > 0, `balance=₹${r.data.balance}`);

    r = await api.post('/wallet/topup', { amount: 0, paymentMethod: 'upi' }, { headers: authH });
    check('W04', 'POST /wallet/topup ₹0 → 400', r.status === 400, r.data.message);

    r = await api.post('/wallet/topup', { amount: 99999, paymentMethod: 'upi' }, { headers: authH });
    check('W05', 'POST /wallet/topup ₹99999 → 400', r.status === 400, r.data.message);
  }

  // ── 8. Admin ─────────────────────────────────────────────────────────────
  console.log('\n── Admin ───────────────────────────────────────────────');

  r = await api.get('/admin/dashboard');
  check('AD01', 'GET /admin/dashboard (no auth → 401)', r.status === 401, r.data.message);

  if (userToken) {
    r = await api.get('/admin/dashboard', { headers: authH });
    check('AD02', 'GET /admin/dashboard (user → 403)', r.status === 403, r.data.message);
  }

  r = await api.get('/admin/dashboard', { headers: adminH });
  check('AD03', 'GET /admin/dashboard (admin)', r.status === 200 && r.data.stats, `revenue=₹${r.data.stats?.totalRevenue}`);

  r = await api.get('/admin/users', { headers: adminH });
  check('AD04', 'GET /admin/users', r.status === 200 && Array.isArray(r.data.users), `count=${r.data.users?.length}`);

  r = await api.get('/admin/bookings', { headers: adminH });
  check('AD05', 'GET /admin/bookings', r.status === 200 && Array.isArray(r.data.bookings), `count=${r.data.bookings?.length}`);

  r = await api.get('/admin/bookings?status=confirmed', { headers: adminH });
  const allConfirmed = r.data.bookings?.every(b => b.status === 'confirmed');
  check('AD06', 'GET /admin/bookings?status=confirmed', r.status === 200 && (r.data.bookings?.length === 0 || allConfirmed), `count=${r.data.bookings?.length}`);

  r = await api.get('/admin/theaters', { headers: adminH });
  check('AD07', 'GET /admin/theaters', r.status === 200 && Array.isArray(r.data.theaters), `count=${r.data.theaters?.length}`);
  const adminTheaterId = r.data.theaters?.[0]?._id;

  if (adminTheaterId) {
    r = await api.get(`/admin/theaters/${adminTheaterId}/shows`, { headers: adminH });
    check('AD08', 'GET /admin/theaters/:id/shows', r.status === 200 && Array.isArray(r.data.shows), `count=${r.data.shows?.length}`);
    const adminShowId = r.data.shows?.[0]?._id;

    if (adminShowId) {
      r = await api.get(`/admin/shows/${adminShowId}/seatmap`, { headers: adminH });
      check('AD09', 'GET /admin/shows/:id/seatmap', r.status === 200 && r.data.show?.seats, `seats=${r.data.show?.totalSeats}`);
    }
  }

  // Admin movie CRUD
  r = await api.post('/movies', {
    title: 'Health Check Movie', description: 'Test', genre: ['Action'],
    languages: ['English'], duration: 90, releaseDate: '2025-01-01',
    poster: 'https://via.placeholder.com/300x450', rating: 7.0, status: 'upcoming'
  }, { headers: adminH });
  check('AD10', 'POST /movies (admin create)', r.status === 201 && r.data.movie?._id, r.data.message || r.data.movie?.title);
  const testMovieId = r.data.movie?._id;

  if (testMovieId) {
    r = await api.put(`/movies/${testMovieId}`, { rating: 8.0 }, { headers: adminH });
    check('AD11', 'PUT /movies/:id (admin update)', r.status === 200 && r.data.movie?.rating === 8.0, `rating=${r.data.movie?.rating}`);

    r = await api.delete(`/movies/${testMovieId}`, { headers: adminH });
    check('AD12', 'DELETE /movies/:id (admin delete)', r.status === 200, r.data.message);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  RESULTS:  ✅ ${pass} PASSED  |  ❌ ${fail} FAILED`);
  console.log(`  TOTAL: ${pass + fail} API endpoints checked`);
  console.log('══════════════════════════════════════════════════════');

  if (failures.length > 0) {
    console.log('\n❌ Failed:');
    failures.forEach(f => console.log('   ' + f));
  }
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

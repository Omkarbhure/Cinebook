require('dotenv').config();
const axios = require('axios');

const BASE = 'http://localhost:5000/api';
const results = [];
let passed = 0, failed = 0, skipped = 0;

const tc = (id, name, status, note = '') => {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️ ';
  results.push({ id, name, status, note });
  if (status === 'PASS') passed++;
  else if (status === 'FAIL') failed++;
  else skipped++;
  console.log(`${icon} [TC-${String(id).padStart(3,'0')}] ${name}${note ? ' — ' + note : ''}`);
};

const api = axios.create({ baseURL: BASE, timeout: 8000, validateStatus: () => true });

// ── helpers ──────────────────────────────────────────────────────────────────
let userToken = '', adminToken = '', userId = '', bookingId = '', showId = '', movieId = '';
const testEmail = `test_${Date.now()}@cinebook.test`;
const testPhone = `+919${Math.floor(100000000 + Math.random()*900000000)}`;

async function runTests() {
  console.log('\n══════════════════════════════════════════════');
  console.log('   CineBook — Automated Test Suite');
  console.log('══════════════════════════════════════════════\n');

  // ── SECTION 1: AUTH — REGISTRATION ───────────────────────────────────────
  console.log('── AUTH: Registration ──');

  // TC-1: Register with valid data
  try {
    const r = await api.post('/auth/register', {
      name: 'Test User', email: testEmail,
      password: 'test123', phone: testPhone
    });
    if (r.status === 200 && r.data.requiresOtp && r.data.userId) {
      userId = r.data.userId;
      tc(1, 'Register with valid data', 'PASS');
    } else tc(1, 'Register with valid data', 'FAIL', `status=${r.status} msg=${r.data.message}`);
  } catch(e) { tc(1, 'Register with valid data', 'FAIL', e.message); }

  // TC-2: Register with duplicate email
  try {
    const r = await api.post('/auth/register', {
      name: 'Test User', email: testEmail,
      password: 'test123', phone: '+919000000001'
    });
    if (r.status === 400 && r.data.message?.toLowerCase().includes('email')) {
      tc(2, 'Register duplicate email', 'PASS');
    } else tc(2, 'Register duplicate email', 'FAIL', `status=${r.status} msg=${r.data.message}`);
  } catch(e) { tc(2, 'Register duplicate email', 'FAIL', e.message); }

  // TC-3: Register with duplicate phone
  try {
    const r = await api.post('/auth/register', {
      name: 'Test User', email: `other_${Date.now()}@test.com`,
      password: 'test123', phone: testPhone
    });
    if (r.status === 400 && r.data.message?.toLowerCase().includes('phone')) {
      tc(3, 'Register duplicate phone', 'PASS');
    } else tc(3, 'Register duplicate phone', 'FAIL', `status=${r.status} msg=${r.data.message}`);
  } catch(e) { tc(3, 'Register duplicate phone', 'FAIL', e.message); }

  // TC-4: Register with short password
  try {
    const r = await api.post('/auth/register', {
      name: 'Test', email: `short_${Date.now()}@test.com`,
      password: '123', phone: '+919000000002'
    });
    if (r.status === 400) tc(4, 'Register short password rejected', 'PASS');
    else tc(4, 'Register short password rejected', 'FAIL', `status=${r.status}`);
  } catch(e) { tc(4, 'Register short password rejected', 'FAIL', e.message); }

  // TC-7: Verify OTP — wrong OTP
  try {
    const r = await api.post('/auth/verify-register-otp', { userId, otp: '000000' });
    if (r.status === 400 && r.data.message?.toLowerCase().includes('invalid')) {
      tc(8, 'Wrong OTP rejected', 'PASS');
    } else tc(8, 'Wrong OTP rejected', 'FAIL', `status=${r.status} msg=${r.data.message}`);
  } catch(e) { tc(8, 'Wrong OTP rejected', 'FAIL', e.message); }

  // ── SECTION 2: AUTH — LOGIN ───────────────────────────────────────────────
  console.log('\n── AUTH: Login ──');

  // TC-11: Login wrong password
  try {
    const r = await api.post('/auth/login', { email: testEmail, password: 'wrongpass' });
    if (r.status === 401) tc(11, 'Login wrong password rejected', 'PASS');
    else tc(11, 'Login wrong password rejected', 'FAIL', `status=${r.status}`);
  } catch(e) { tc(11, 'Login wrong password rejected', 'FAIL', e.message); }

  // TC-13: Login unregistered email
  try {
    const r = await api.post('/auth/login', { email: 'nobody@nowhere.com', password: 'test123' });
    if (r.status === 401) tc(13, 'Login unregistered email rejected', 'PASS');
    else tc(13, 'Login unregistered email rejected', 'FAIL', `status=${r.status}`);
  } catch(e) { tc(13, 'Login unregistered email rejected', 'FAIL', e.message); }

  // TC-14: Admin login
  try {
    const r = await api.post('/auth/login', { username: 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' });
    if (r.status === 200 && r.data.token && r.data.user?.role === 'admin') {
      adminToken = r.data.token;
      tc(14, 'Admin login direct (no OTP)', 'PASS');
    } else tc(14, 'Admin login direct (no OTP)', 'FAIL', `status=${r.status} msg=${r.data.message}`);
  } catch(e) { tc(14, 'Admin login direct (no OTP)', 'FAIL', e.message); }

  // TC-16: Phone OTP login (demo mode)
  try {
    const sendR = await api.post('/auth/send-otp', { phone: '+919876543210' });
    const verR  = await api.post('/auth/verify-otp', { phone: '+919876543210', otp: '123456' });
    if (verR.status === 200 && verR.data.token) {
      userToken = verR.data.token;
      tc(16, 'Phone OTP login (demo 123456)', 'PASS');
    } else tc(16, 'Phone OTP login (demo 123456)', 'FAIL', `status=${verR.status}`);
  } catch(e) { tc(16, 'Phone OTP login (demo 123456)', 'FAIL', e.message); }

  // TC-17: Phone OTP wrong code
  try {
    const r = await api.post('/auth/verify-otp', { phone: '+919876543210', otp: '999999' });
    if (r.status === 400) tc(17, 'Wrong phone OTP rejected', 'PASS');
    else tc(17, 'Wrong phone OTP rejected', 'FAIL', `status=${r.status}`);
  } catch(e) { tc(17, 'Wrong phone OTP rejected', 'FAIL', e.message); }

  // TC-19: Session restore — GET /auth/me with valid token
  try {
    const r = await api.get('/auth/me', { headers: { Authorization: `Bearer ${userToken}` } });
    if (r.status === 200 && r.data.user) tc(19, 'Session restore via /auth/me', 'PASS');
    else tc(19, 'Session restore via /auth/me', 'FAIL', `status=${r.status}`);
  } catch(e) { tc(19, 'Session restore via /auth/me', 'FAIL', e.message); }

  // TC-21: Forgot password valid email
  try {
    const r = await api.post('/auth/forgot-password', { email: testEmail });
    if (r.status === 200 || (r.status === 404 && r.data.message?.includes('No account'))) {
      tc(21, 'Forgot password endpoint responds', 'PASS');
    } else tc(21, 'Forgot password endpoint responds', 'FAIL', `status=${r.status}`);
  } catch(e) { tc(21, 'Forgot password endpoint responds', 'FAIL', e.message); }

  // TC-22: Forgot password unregistered email
  try {
    const r = await api.post('/auth/forgot-password', { email: 'nobody@nowhere.com' });
    if (r.status === 404) tc(22, 'Forgot password unregistered email', 'PASS');
    else tc(22, 'Forgot password unregistered email', 'FAIL', `status=${r.status}`);
  } catch(e) { tc(22, 'Forgot password unregistered email', 'FAIL', e.message); }

  // ── SECTION 3: MOVIES ────────────────────────────────────────────────────
  console.log('\n── Movies ──');

  // TC-24: Get all movies
  try {
    const r = await api.get('/movies');
    if (r.status === 200 && Array.isArray(r.data.movies)) {
      movieId = r.data.movies[0]?._id;
      tc(24, 'GET /movies returns array', 'PASS', `count=${r.data.movies.length}`);
    } else tc(24, 'GET /movies returns array', 'FAIL', `status=${r.status}`);
  } catch(e) { tc(24, 'GET /movies returns array', 'FAIL', e.message); }

  // TC-25: Filter by genre
  try {
    const r = await api.get('/movies?genre=Action');
    const allAction = r.data.movies?.every(m => m.genre?.includes('Action'));
    if (r.status === 200 && allAction) tc(25, 'Filter movies by genre', 'PASS');
    else tc(25, 'Filter movies by genre', 'FAIL', `not all Action genre`);
  } catch(e) { tc(25, 'Filter movies by genre', 'FAIL', e.message); }

  // TC-27: Filter by status upcoming
  try {
    const r = await api.get('/movies?status=upcoming');
    const allUpcoming = r.data.movies?.every(m => m.status === 'upcoming');
    if (r.status === 200 && (r.data.movies.length === 0 || allUpcoming)) {
      tc(27, 'Filter movies by status=upcoming', 'PASS');
    } else tc(27, 'Filter movies by status=upcoming', 'FAIL', 'non-upcoming movies returned');
  } catch(e) { tc(27, 'Filter movies by status=upcoming', 'FAIL', e.message); }

  // TC-30: Get movie by ID
  try {
    const r = await api.get(`/movies/${movieId}`);
    if (r.status === 200 && r.data.movie?._id === movieId) tc(30, 'GET /movies/:id', 'PASS');
    else tc(30, 'GET /movies/:id', 'FAIL', `status=${r.status}`);
  } catch(e) { tc(30, 'GET /movies/:id', 'FAIL', e.message); }

  // TC-31: Invalid movie ID
  try {
    const r = await api.get('/movies/invalid-id-xyz');
    if (r.status === 400 || r.status === 404) tc(31, 'Invalid movie ID returns 400/404', 'PASS');
    else tc(31, 'Invalid movie ID returns 400/404', 'FAIL', `status=${r.status}`);
  } catch(e) { tc(31, 'Invalid movie ID returns 400/404', 'FAIL', e.message); }

  // TC-32: Non-existent movie ID
  try {
    const r = await api.get('/movies/000000000000000000000000');
    if (r.status === 404) tc(32, 'Non-existent movie ID returns 404', 'PASS');
    else tc(32, 'Non-existent movie ID returns 404', 'FAIL', `status=${r.status}`);
  } catch(e) { tc(32, 'Non-existent movie ID returns 404', 'FAIL', e.message); }

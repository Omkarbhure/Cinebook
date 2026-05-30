'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  getDashboard, getAllUsers, getUserBookings,
  getAllBookings, adminCancelBooking,
  getAllTheaters, getTheaterShows, getShowSeatMap,
  adminCreateMovie, adminUpdateMovie, adminDeleteMovie,
  getMovies, deleteShow,
} from '@/lib/api';
import toast from 'react-hot-toast';
import styles from './admin.module.css';


export default function AdminPanel() {
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Dashboard data
  const [stats, setStats] = useState<any>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [topMovies, setTopMovies] = useState<any[]>([]);
  const [theaterStats, setTheaterStats] = useState<any[]>([]);

  // Users data
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);

  // Bookings data
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingFilters, setBookingFilters] = useState({ theater: '', movie: '', status: '', date: '' });

  // Theaters data
  const [theaters, setTheaters] = useState<any[]>([]);
  const [selectedTheater, setSelectedTheater] = useState<any>(null);
  const [theaterShows, setTheaterShows] = useState<any[]>([]);
  const [selectedShow, setSelectedShow] = useState<any>(null);
  const [showSeatMap, setShowSeatMap] = useState<any>(null);
  const [theaterCityFilter, setTheaterCityFilter] = useState('');
  const [theaterPage, setTheaterPage] = useState(1);
  const [theaterTotalPages, setTheaterTotalPages] = useState(1);

  // Movies data
  const [movies, setMovies] = useState<any[]>([]);
  const [editingMovie, setEditingMovie] = useState<any>(null);
  const [movieForm, setMovieForm] = useState<any>({});

  useEffect(() => {
    if (!user) {
      router.push('/auth/login?redirect=/admin');
      return;
    }
    if (!isAdmin) {
      toast.error('Admin access required');
      router.push('/');
      return;
    }
    setLoading(false);
  }, [user, isAdmin, router]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await getDashboard();
      setStats(res.data.stats);
      setRecentBookings(res.data.recentBookings);
      setTopMovies(res.data.topMovies);
      setTheaterStats(res.data.theaterStats || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load dashboard');
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await getAllUsers();
      setUsers(res.data.users);
    } catch (err: any) {
      toast.error('Failed to load users');
    }
  }, []);

  const fetchUserBookings = useCallback(async (userId: string) => {
    try {
      const res = await getUserBookings(userId);
      setUserBookings(res.data.bookings);
    } catch (err: any) {
      toast.error('Failed to load user bookings');
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await getAllBookings(bookingFilters);
      setBookings(res.data.bookings);
    } catch (err: any) {
      toast.error('Failed to load bookings');
    }
  }, [bookingFilters]);

  const fetchTheaters = useCallback(async (page = 1, city = '') => {
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (city) params.city = city;
      const res = await getAllTheaters(params);
      setTheaters(res.data.theaters);
      setTheaterTotalPages(res.data.pages || 1);
      setTheaterPage(page);
    } catch (err: any) {
      toast.error('Failed to load theaters');
    }
  }, []);

  const fetchTheaterShows = useCallback(async (theaterId: string) => {
    try {
      const res = await getTheaterShows(theaterId);
      setTheaterShows(res.data.shows);
    } catch (err: any) {
      toast.error('Failed to load shows');
    }
  }, []);

  const fetchShowSeatMap = useCallback(async (showId: string) => {
    try {
      const res = await getShowSeatMap(showId);
      setShowSeatMap(res.data.show);
    } catch (err: any) {
      toast.error('Failed to load seat map');
    }
  }, []);

  const fetchMovies = useCallback(async () => {
    try {
      const res = await getMovies({ limit: '100' });
      setMovies(res.data.movies);
    } catch (err: any) {
      toast.error('Failed to load movies');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboard();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'bookings') {
      fetchBookings();
      // Bookings tab needs theaters + movies for its filter dropdowns
      if (theaters.length === 0) fetchTheaters();
      if (movies.length === 0) fetchMovies();
    }
    if (activeTab === 'theaters') fetchTheaters();
    if (activeTab === 'movies') fetchMovies();
  }, [activeTab, fetchDashboard, fetchUsers, fetchBookings, fetchTheaters, fetchMovies]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await adminCancelBooking(bookingId);
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const handleDeleteMovie = async (movieId: string) => {
    if (!confirm('Delete this movie? This will also delete all associated shows.')) return;
    try {
      await adminDeleteMovie(movieId);
      toast.success('Movie deleted');
      fetchMovies();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete movie');
    }
  };

  const handleDeleteShow = async (showId: string) => {
    if (!confirm('Delete this show?')) return;
    try {
      await deleteShow(showId);
      toast.success('Show deleted');
      if (selectedTheater) fetchTheaterShows(selectedTheater._id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete show');
    }
  };

  if (loading) return <div className="flex-center" style={{height:'100vh'}}><div className="spinner" /></div>;

  return (
    <div className={styles.adminPage}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          🎬 Cine<span className={styles.sidebarLogoAccent}>Book</span>
        </div>
        <nav className={styles.sidebarNav}>
          <button
            className={`${styles.navItem} ${activeTab === 'dashboard' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`${styles.navItem} ${activeTab === 'bookings' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            🎟️ Bookings
          </button>
          <button
            className={`${styles.navItem} ${activeTab === 'theaters' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('theaters')}
          >
            🏛️ Theaters
          </button>
          <button
            className={`${styles.navItem} ${activeTab === 'movies' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('movies')}
          >
            🎬 Movies
          </button>
          <button
            className={`${styles.navItem} ${activeTab === 'users' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
          <button className={`${styles.navItem} ${styles.logoutBtn}`} onClick={() => { logout(); router.push('/'); }}>
            🚪 Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {activeTab === 'dashboard' && (
          <>
            <header className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>Dashboard</h1>
            </header>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>💰</div>
                <div className={styles.statValue}>₹{stats?.totalRevenue?.toLocaleString('en-IN') || 0}</div>
                <div className={styles.statLabel}>Total Revenue</div>
                <div className={styles.statAccent} style={{background:'var(--success)'}} />
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🎟️</div>
                <div className={styles.statValue}>{stats?.totalBookings || 0}</div>
                <div className={styles.statLabel}>Total Bookings</div>
                <div className={styles.statAccent} style={{background:'var(--primary)'}} />
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>👥</div>
                <div className={styles.statValue}>{stats?.totalUsers || 0}</div>
                <div className={styles.statLabel}>Total Users</div>
                <div className={styles.statAccent} style={{background:'var(--info)'}} />
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🎬</div>
                <div className={styles.statValue}>{stats?.totalMovies || 0}</div>
                <div className={styles.statLabel}>Total Movies</div>
                <div className={styles.statAccent} style={{background:'var(--accent)'}} />
              </div>
            </div>

            {/* Theater Stats */}
            {theaterStats.length > 0 && (
              <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                  <h3 className={styles.tableTitle}>Theater-wise Performance</h3>
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Theater</th>
                      <th>City</th>
                      <th>Bookings</th>
                      <th>Seats Sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {theaterStats.map((t: any) => (
                      <tr key={t._id}>
                        <td>{t.theaterName}</td>
                        <td>{t.city}</td>
                        <td>{t.totalBookings}</td>
                        <td>{t.totalSeats}</td>
                        <td>₹{t.totalRevenue.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Recent Bookings */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3 className={styles.tableTitle}>Recent Bookings</h3>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>User</th>
                    <th>Movie</th>
                    <th>Theater</th>
                    <th>Seats</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b: any) => (
                    <tr key={b._id}>
                      <td>{b.bookingId}</td>
                      <td>{b.user?.name || 'N/A'}</td>
                      <td>{b.movie?.title || 'N/A'}</td>
                      <td>{b.show?.theater?.name || 'N/A'}</td>
                      <td>{b.seats?.length || 0}</td>
                      <td>₹{b.totalAmount}</td>
                      <td>
                        <span className={`${styles.badge} ${b.status === 'confirmed' ? styles.badgeGreen : styles.badgeRed}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── BOOKINGS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'bookings' && (
          <>
            <header className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>All Bookings</h1>
            </header>

            {/* Filters */}
            <div className={styles.formPanel}>
              <div className={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={bookingFilters.status}
                    onChange={e => setBookingFilters(p => ({ ...p, status: e.target.value }))}
                  >
                    <option value="">All Statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="used">Used</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={bookingFilters.date}
                    onChange={e => setBookingFilters(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Theater</label>
                  <select
                    className="form-input"
                    value={bookingFilters.theater}
                    onChange={e => setBookingFilters(p => ({ ...p, theater: e.target.value }))}
                  >
                    <option value="">All Theaters</option>
                    {theaters.map((t: any) => (
                      <option key={t._id} value={t._id}>{t.name} — {t.city}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Movie</label>
                  <select
                    className="form-input"
                    value={bookingFilters.movie}
                    onChange={e => setBookingFilters(p => ({ ...p, movie: e.target.value }))}
                  >
                    <option value="">All Movies</option>
                    {movies.map((m: any) => (
                      <option key={m._id} value={m._id}>{m.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.formActions}>
                <button className="btn btn-primary btn-sm" onClick={fetchBookings}>Apply Filters</button>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  setBookingFilters({ theater: '', movie: '', status: '', date: '' });
                  setTimeout(fetchBookings, 100);
                }}>Reset</button>
              </div>
            </div>

            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3 className={styles.tableTitle}>Bookings ({bookings.length})</h3>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>User</th>
                    <th>Movie</th>
                    <th>Theater</th>
                    <th>Date</th>
                    <th>Seats</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b: any) => (
                    <tr key={b._id}>
                      <td style={{fontFamily:'monospace', fontSize:'12px'}}>{b.bookingId}</td>
                      <td>
                        <div>{b.user?.name || 'N/A'}</div>
                        <div style={{fontSize:'12px', color:'var(--text-muted)'}}>{b.user?.email || b.user?.phone || ''}</div>
                      </td>
                      <td>{b.movie?.title || 'N/A'}</td>
                      <td>{b.show?.theater?.name || 'N/A'}</td>
                      <td>{b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : 'N/A'}</td>
                      <td>{b.seats?.length || 0}</td>
                      <td>₹{b.totalAmount}</td>
                      <td>
                        <span className={`${styles.badge} ${
                          b.status === 'confirmed' ? styles.badgeGreen :
                          b.status === 'cancelled' ? styles.badgeRed : styles.badgeGray
                        }`}>{b.status}</span>
                      </td>
                      <td>
                        {b.status === 'confirmed' && (
                          <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleCancelBooking(b._id)}>
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr><td colSpan={9} style={{textAlign:'center', padding:'40px', color:'var(--text-muted)'}}>No bookings found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── THEATERS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'theaters' && (
          <>
            <header className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>
                {showSeatMap ? '🪑 Seat Map' : selectedShow ? '🎬 Show Detail' : selectedTheater ? `🏛️ ${selectedTheater.name}` : 'Theaters'}
              </h1>
              {(selectedTheater || selectedShow || showSeatMap) && (
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  if (showSeatMap) { setShowSeatMap(null); }
                  else if (selectedShow) { setSelectedShow(null); setShowSeatMap(null); }
                  else { setSelectedTheater(null); setTheaterShows([]); setSelectedShow(null); setShowSeatMap(null); }
                }}>← Back</button>
              )}
            </header>

            {/* Seat Map View */}
            {showSeatMap && (
              <div className={styles.formPanel}>
                <div style={{marginBottom:'16px'}}>
                  <strong>{showSeatMap.movie?.title}</strong> — {showSeatMap.theater?.name}
                  <br />
                  <span style={{color:'var(--text-muted)', fontSize:'13px'}}>
                    {new Date(showSeatMap.date).toLocaleDateString('en-IN')} | {showSeatMap.time} | {showSeatMap.format}
                  </span>
                </div>
                <div style={{display:'flex', gap:'24px', marginBottom:'20px', flexWrap:'wrap'}}>
                  <div style={{background:'rgba(16,185,129,0.15)', color:'#10b981', padding:'8px 16px', borderRadius:'8px'}}>
                    ✅ Available: {showSeatMap.availableSeats}
                  </div>
                  <div style={{background:'rgba(245,158,11,0.15)', color:'#f59e0b', padding:'8px 16px', borderRadius:'8px'}}>
                    ⏱ Held: {showSeatMap.lockedSeats || 0}
                  </div>
                  <div style={{background:'rgba(239,68,68,0.15)', color:'#ef4444', padding:'8px 16px', borderRadius:'8px'}}>
                    🔴 Booked: {showSeatMap.bookedSeats}
                  </div>
                  <div style={{background:'rgba(59,130,246,0.15)', color:'#3b82f6', padding:'8px 16px', borderRadius:'8px'}}>
                    💺 Total: {showSeatMap.totalSeats}
                  </div>
                </div>

                {/* Screen */}
                <div style={{textAlign:'center', marginBottom:'24px'}}>
                  <div style={{background:'linear-gradient(to bottom, rgba(229,9,20,0.4), transparent)', height:'8px', borderRadius:'50%', maxWidth:'400px', margin:'0 auto 8px'}} />
                  <span style={{fontSize:'12px', color:'var(--text-muted)', letterSpacing:'4px'}}>SCREEN</span>
                </div>

                {/* Seat Grid */}
                <div style={{overflowX:'auto'}}>
                  {Array.from({ length: showSeatMap.theater?.rows || 10 }).map((_: any, r: number) => (
                    <div key={r} style={{display:'flex', alignItems:'center', gap:'4px', marginBottom:'4px'}}>
                      <span style={{width:'20px', fontSize:'11px', color:'var(--text-muted)', textAlign:'right', marginRight:'8px'}}>
                        {String.fromCharCode(65 + r)}
                      </span>
                      {showSeatMap.seats.filter((s: any) => s.row === r).map((seat: any) => (
                        <div
                          key={`${seat.row}-${seat.col}`}
                          title={
                            seat.userId
                              ? `BOOKED — ${seat.userName || 'User'} (${seat.userEmail || ''}) | Seat ${String.fromCharCode(65 + r)}${seat.col + 1}`
                              : seat.isLocked
                              ? `HELD — ${seat.lockedByName || 'User'} (expires soon) | Seat ${String.fromCharCode(65 + r)}${seat.col + 1}`
                              : `Available — ${seat.category} | Seat ${String.fromCharCode(65 + r)}${seat.col + 1}`
                          }
                          style={{
                            width: '22px', height: '20px', borderRadius: '4px 4px 0 0', cursor: 'default',
                            background: seat.userId
                              ? '#ef4444'
                              : seat.isLocked
                              ? '#f59e0b'
                              : seat.category === 'platinum' ? '#f59e0b33'
                              : seat.category === 'gold' ? '#3b82f633'
                              : '#22223a',
                            border: seat.userId
                              ? '1px solid #ef4444'
                              : seat.isLocked
                              ? '1px solid #f59e0b'
                              : '1px solid rgba(255,255,255,0.1)',
                            opacity: 1,
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div style={{display:'flex', gap:'16px', marginTop:'20px', flexWrap:'wrap'}}>
                  {[
                    { color:'#22223a', border:'rgba(255,255,255,0.1)', label:'Silver (Available)' },
                    { color:'#3b82f633', border:'#3b82f6', label:'Gold (Available)' },
                    { color:'#f59e0b33', border:'#f59e0b', label:'Platinum (Available)' },
                    { color:'#f59e0b', border:'#f59e0b', label:'Temporarily Held' },
                    { color:'#ef4444', border:'#ef4444', label:'Booked' },
                  ].map(item => (
                    <div key={item.label} style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'var(--text-secondary)'}}>
                      <div style={{width:'16px', height:'14px', borderRadius:'3px 3px 0 0', background:item.color, border:`1px solid ${item.border}`}} />
                      {item.label}
                    </div>
                  ))}
                </div>
                <p style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'12px'}}>💡 Hover over a seat to see booking details</p>
              </div>
            )}

            {/* Theater Shows List */}
            {selectedTheater && !showSeatMap && (
              <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                  <h3 className={styles.tableTitle}>Shows at {selectedTheater.name}</h3>
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Movie</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Format</th>
                      <th>Seat Availability</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {theaterShows.map((show: any) => {
                      const pct = show.totalSeats > 0 ? Math.round((show.bookedSeats / show.totalSeats) * 100) : 0;
                      const barColor = pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981';
                      return (
                        <tr key={show._id}>
                          <td>
                            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                              {show.movie?.poster && <img src={show.movie.poster} alt="" className={styles.miniPoster} />}
                              <span>{show.movie?.title || 'N/A'}</span>
                            </div>
                          </td>
                          <td>{new Date(show.date).toLocaleDateString('en-IN')}</td>
                          <td>{show.time}</td>
                          <td><span className={`${styles.badge} ${styles.badgeBlue}`}>{show.format}</span></td>
                          <td style={{minWidth: '180px'}}>
                            {/* Occupancy bar */}
                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                              <div style={{flex:1, height:'8px', background:'var(--bg-elevated)', borderRadius:'4px', overflow:'hidden'}}>
                                <div style={{width:`${pct}%`, height:'100%', background: barColor, borderRadius:'4px', transition:'width 0.3s'}} />
                              </div>
                              <span style={{fontSize:'12px', color:'var(--text-muted)', whiteSpace:'nowrap'}}>
                                {show.availableSeats}/{show.totalSeats} free
                              </span>
                            </div>
                            <div style={{display:'flex', gap:'8px', marginTop:'4px', fontSize:'11px'}}>
                              <span style={{color:'#10b981'}}>✅ {show.availableSeats} avail</span>
                              <span style={{color:'#ef4444'}}>🔴 {show.bookedSeats} booked</span>
                            </div>
                          </td>
                          <td style={{display:'flex', gap:'6px'}}>
                            <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => {
                              setSelectedShow(show);
                              fetchShowSeatMap(show._id);
                            }}>Seat Map</button>
                            <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteShow(show._id)}>Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                    {theaterShows.length === 0 && (
                      <tr><td colSpan={6} style={{textAlign:'center', padding:'40px', color:'var(--text-muted)'}}>No shows found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Theaters List */}
            {!selectedTheater && !showSeatMap && (
              <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                  <h3 className={styles.tableTitle}>All Theaters ({theaters.length})</h3>
                  <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                    <input
                      className="form-input"
                      placeholder="Filter by city..."
                      value={theaterCityFilter}
                      onChange={e => setTheaterCityFilter(e.target.value)}
                      style={{width:'160px', padding:'6px 12px', fontSize:'13px'}}
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => fetchTheaters(1, theaterCityFilter)}>Search</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setTheaterCityFilter(''); fetchTheaters(1, ''); }}>Reset</button>
                  </div>
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Theater</th>
                      <th>City</th>
                      <th>Capacity</th>
                      <th>Shows</th>
                      <th>Seats Sold</th>
                      <th>Revenue</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {theaters.map((t: any) => {
                      const capacity = (t.rows || 0) * (t.cols || 0);
                      const soldPct = capacity > 0 && t.totalSeatsBooked > 0
                        ? Math.round((t.totalSeatsBooked / (capacity * (t.showCount || 1))) * 100)
                        : 0;
                      return (
                        <tr key={t._id}>
                          <td>
                            <div>{t.name}</div>
                            <div style={{fontSize:'12px', color:'var(--text-muted)'}}>{t.address}</div>
                          </td>
                          <td>{t.city}</td>
                          <td>{capacity} seats</td>
                          <td>{t.showCount || 0}</td>
                          <td>
                            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                              <span style={{color:'#ef4444', fontWeight:600}}>{t.totalSeats || 0}</span>
                              <span style={{fontSize:'11px', color:'var(--text-muted)'}}>seats sold</span>
                            </div>
                          </td>
                          <td>₹{(t.revenue || 0).toLocaleString('en-IN')}</td>
                          <td>
                            <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => {
                              setSelectedTheater(t);
                              fetchTheaterShows(t._id);
                            }}>View Shows & Seats</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Pagination */}
                {theaterTotalPages > 1 && (
                  <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'16px', borderTop:'1px solid var(--border)'}}>
                    <button className="btn btn-secondary btn-sm" disabled={theaterPage <= 1} onClick={() => fetchTheaters(theaterPage - 1, theaterCityFilter)}>← Prev</button>
                    <span style={{fontSize:'13px', color:'var(--text-muted)'}}>Page {theaterPage} of {theaterTotalPages}</span>
                    <button className="btn btn-secondary btn-sm" disabled={theaterPage >= theaterTotalPages} onClick={() => fetchTheaters(theaterPage + 1, theaterCityFilter)}>Next →</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── MOVIES TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'movies' && (
          <>
            <header className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>Movies</h1>
              <button className="btn btn-primary btn-sm" onClick={() => {
                setEditingMovie('new');
                setMovieForm({ title:'', description:'', genre:'', languages:'', duration:'', releaseDate:'', poster:'', banner:'', rating:'', status:'now_playing', director:'', trailerUrl:'' });
              }}>+ Add Movie</button>
            </header>

            {/* Add / Edit Form */}
            {editingMovie && (
              <div className={styles.formPanel}>
                <h3 className={styles.formTitle}>{editingMovie === 'new' ? 'Add New Movie' : `Edit: ${editingMovie.title}`}</h3>
                <div className={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input className="form-input" value={movieForm.title || ''} onChange={e => setMovieForm((p: any) => ({...p, title: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Director</label>
                    <input className="form-input" value={movieForm.director || ''} onChange={e => setMovieForm((p: any) => ({...p, director: e.target.value}))} />
                  </div>
                  <div className={`form-group ${styles.formGridFull}`}>
                    <label className="form-label">Description *</label>
                    <textarea className="form-input" rows={3} value={movieForm.description || ''} onChange={e => setMovieForm((p: any) => ({...p, description: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Genres (comma separated)</label>
                    <input className="form-input" placeholder="Action, Drama, Thriller" value={movieForm.genre || ''} onChange={e => setMovieForm((p: any) => ({...p, genre: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Languages (comma separated)</label>
                    <input className="form-input" placeholder="English, Hindi" value={movieForm.languages || ''} onChange={e => setMovieForm((p: any) => ({...p, languages: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration (minutes) *</label>
                    <input type="number" className="form-input" value={movieForm.duration || ''} onChange={e => setMovieForm((p: any) => ({...p, duration: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Release Date *</label>
                    <input type="date" className="form-input" value={movieForm.releaseDate || ''} onChange={e => setMovieForm((p: any) => ({...p, releaseDate: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rating (0-10)</label>
                    <input type="number" step="0.1" min="0" max="10" className="form-input" value={movieForm.rating || ''} onChange={e => setMovieForm((p: any) => ({...p, rating: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input" value={movieForm.status || 'now_playing'} onChange={e => setMovieForm((p: any) => ({...p, status: e.target.value}))}>
                      <option value="now_playing">Now Playing</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="ended">Ended</option>
                    </select>
                  </div>
                  <div className={`form-group ${styles.formGridFull}`}>
                    <label className="form-label">Poster URL *</label>
                    <input className="form-input" placeholder="https://..." value={movieForm.poster || ''} onChange={e => setMovieForm((p: any) => ({...p, poster: e.target.value}))} />
                  </div>
                  <div className={`form-group ${styles.formGridFull}`}>
                    <label className="form-label">Banner URL</label>
                    <input className="form-input" placeholder="https://..." value={movieForm.banner || ''} onChange={e => setMovieForm((p: any) => ({...p, banner: e.target.value}))} />
                  </div>
                  <div className={`form-group ${styles.formGridFull}`}>
                    <label className="form-label">Trailer URL (YouTube)</label>
                    <input className="form-input" placeholder="https://youtube.com/watch?v=..." value={movieForm.trailerUrl || ''} onChange={e => setMovieForm((p: any) => ({...p, trailerUrl: e.target.value}))} />
                  </div>
                </div>
                <div className={styles.formActions}>
                  <button className="btn btn-primary btn-sm" onClick={async () => {
                    try {
                      const payload = {
                        ...movieForm,
                        genre: movieForm.genre ? movieForm.genre.split(',').map((g: string) => g.trim()).filter(Boolean) : [],
                        languages: movieForm.languages ? movieForm.languages.split(',').map((l: string) => l.trim()).filter(Boolean) : [],
                        duration: Number(movieForm.duration),
                        rating: Number(movieForm.rating),
                      };
                      if (editingMovie === 'new') {
                        await adminCreateMovie(payload);
                        toast.success('Movie added!');
                      } else {
                        await adminUpdateMovie(editingMovie._id, payload);
                        toast.success('Movie updated!');
                      }
                      setEditingMovie(null);
                      fetchMovies();
                    } catch (err: any) {
                      toast.error(err?.response?.data?.message || 'Failed to save movie');
                    }
                  }}>
                    {editingMovie === 'new' ? 'Add Movie' : 'Save Changes'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingMovie(null)}>Cancel</button>
                </div>
              </div>
            )}

            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3 className={styles.tableTitle}>All Movies ({movies.length})</h3>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Poster</th>
                    <th>Title</th>
                    <th>Genre</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Bookings</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {movies.map((m: any) => (
                    <tr key={m._id}>
                      <td><img src={m.poster} alt={m.title} className={styles.miniPoster} /></td>
                      <td>
                        <div>{m.title}</div>
                        <div style={{fontSize:'12px', color:'var(--text-muted)'}}>{m.director}</div>
                      </td>
                      <td style={{fontSize:'12px'}}>{m.genre?.slice(0,2).join(', ')}</td>
                      <td>⭐ {m.rating}</td>
                      <td>
                        <span className={`${styles.badge} ${m.status === 'now_playing' ? styles.badgeGreen : m.status === 'upcoming' ? styles.badgeYellow : styles.badgeGray}`}>
                          {m.status === 'now_playing' ? 'Now Playing' : m.status === 'upcoming' ? 'Upcoming' : 'Ended'}
                        </span>
                      </td>
                      <td>{m.totalBookings || 0}</td>
                      <td style={{display:'flex', gap:'6px'}}>
                        <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => {
                          setEditingMovie(m);
                          setMovieForm({
                            ...m,
                            genre: m.genre?.join(', ') || '',
                            languages: m.languages?.join(', ') || '',
                            releaseDate: m.releaseDate ? new Date(m.releaseDate).toISOString().split('T')[0] : '',
                          });
                        }}>Edit</button>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteMovie(m._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── USERS TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <>
            <header className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>{selectedUser ? `${selectedUser.name}'s Bookings` : 'Users'}</h1>
              {selectedUser && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedUser(null); setUserBookings([]); }}>← Back</button>
              )}
            </header>

            {selectedUser ? (
              <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                  <div>
                    <h3 className={styles.tableTitle}>{selectedUser.name}</h3>
                    <p style={{fontSize:'13px', color:'var(--text-muted)', marginTop:'4px'}}>
                      {selectedUser.email || selectedUser.phone} · Joined {new Date(selectedUser.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Movie</th>
                      <th>Theater</th>
                      <th>Show Time</th>
                      <th>Seats</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userBookings.map((b: any) => (
                      <tr key={b._id}>
                        <td style={{fontFamily:'monospace', fontSize:'12px'}}>{b.bookingId}</td>
                        <td>{b.movie?.title || 'N/A'}</td>
                        <td>{b.show?.theater?.name || 'N/A'}</td>
                        <td>{b.show?.time || 'N/A'}</td>
                        <td>{b.seats?.length || 0}</td>
                        <td>₹{b.totalAmount}</td>
                        <td>
                          <span className={`${styles.badge} ${b.status === 'confirmed' ? styles.badgeGreen : styles.badgeRed}`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {userBookings.length === 0 && (
                      <tr><td colSpan={7} style={{textAlign:'center', padding:'40px', color:'var(--text-muted)'}}>No bookings yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                  <h3 className={styles.tableTitle}>All Users ({users.length})</h3>
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Contact</th>
                      <th>Auth</th>
                      <th>Role</th>
                      <th>Verified</th>
                      <th>Joined</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u: any) => (
                      <tr key={u._id}>
                        <td>
                          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                            {u.avatar
                              ? <img src={u.avatar} alt="" style={{width:'36px', height:'36px', borderRadius:'50%', objectFit:'cover'}} />
                              : <div className={styles.avatarCircle}>{u.name?.[0]?.toUpperCase()}</div>
                            }
                            <span>{u.name}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{fontSize:'13px'}}>{u.email || '—'}</div>
                          <div style={{fontSize:'12px', color:'var(--text-muted)'}}>{u.phone || '—'}</div>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${u.googleId ? styles.badgeBlue : styles.badgeGray}`}>
                            {u.googleId ? 'Google' : u.phone && !u.email ? 'Phone' : 'Email'}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${u.role === 'admin' ? styles.badgeRed : styles.badgeGray}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${u.isVerified ? styles.badgeGreen : styles.badgeYellow}`}>
                            {u.isVerified ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td style={{fontSize:'13px'}}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                        <td>
                          <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => {
                            setSelectedUser(u);
                            fetchUserBookings(u._id);
                          }}>Bookings</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

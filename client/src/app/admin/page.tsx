'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/context/AuthContext';
import { getDashboard, getAllTheaters, adminCreateMovie, createTheater } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import styles from './admin.module.css';

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Form states
  const [movieForm, setMovieForm] = useState({
    title: '', description: '', genre: '', duration: '', releaseDate: '', poster: '', rating: '8.0'
  });

  useEffect(() => {
    if (user && !isAdmin) {
      toast.error('Access denied');
      router.push('/');
      return;
    }

    if (user && isAdmin) {
      const fetchData = async () => {
        try {
          const res = await getDashboard();
          setStats(res.data);
        } catch (err) {
          console.error('Failed to fetch dashboard stats');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user, isAdmin, router]);

  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminCreateMovie({
        ...movieForm,
        genre: movieForm.genre.split(',').map(g => g.trim()),
        duration: Number(movieForm.duration),
        status: 'now_playing'
      });
      toast.success('Movie added successfully!');
      setMovieForm({ title:'', description:'', genre:'', duration:'', releaseDate:'', poster:'', rating:'8.0' });
    } catch (err) {
      toast.error('Failed to add movie');
    }
  };

  if (!user || !isAdmin) return null;

  return (
    <main className={styles.container}>
      <Navbar />
      
      <div className="section">
        <div className="container">
          <header className={styles.header}>
            <h1 className="section-title">Admin Control Panel</h1>
            <p className="section-subtitle">Manage movies, theaters, and view platform statistics.</p>
          </header>

          <div className={styles.layout}>
            <aside className={styles.sidebar}>
               <button className={`${styles.menuBtn} ${activeTab === 'dashboard' ? styles.active : ''}`} onClick={() => setActiveTab('dashboard')}>
                  📊 Dashboard Stats
               </button>
               <button className={`${styles.menuBtn} ${activeTab === 'movies' ? styles.active : ''}`} onClick={() => setActiveTab('movies')}>
                  🎬 Add Movie
               </button>
               <button className={`${styles.menuBtn} ${activeTab === 'theaters' ? styles.active : ''}`} onClick={() => setActiveTab('theaters')}>
                  🏛️ Manage Theaters
               </button>
            </aside>

            <div className={styles.content}>
               {activeTab === 'dashboard' && stats && (
                 <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <h3>Total Revenue</h3>
                        <p>₹{stats.stats.totalRevenue}</p>
                    </div>
                    <div className={styles.statCard}>
                        <h3>Total Bookings</h3>
                        <p>{stats.stats.totalBookings}</p>
                    </div>
                    <div className={styles.statCard}>
                        <h3>Total Users</h3>
                        <p>{stats.stats.totalUsers}</p>
                    </div>
                    <div className={styles.statCard}>
                        <h3>Active Movies</h3>
                        <p>{stats.stats.totalMovies}</p>
                    </div>
                 </div>
               )}

               {activeTab === 'movies' && (
                 <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Add New Movie</h3>
                    <form className={styles.form} onSubmit={handleAddMovie}>
                        <div className="form-group">
                           <label className="form-label">Title</label>
                           <input className="form-input" value={movieForm.title} onChange={e=>setMovieForm({...movieForm, title:e.target.value})} required />
                        </div>
                        <div className="form-group">
                           <label className="form-label">Description</label>
                           <textarea className="form-input" rows={3} value={movieForm.description} onChange={e=>setMovieForm({...movieForm, description:e.target.value})} required />
                        </div>
                        <div className={styles.formRow}>
                           <div className="form-group">
                              <label className="form-label">Genre (comma separated)</label>
                              <input className="form-input" placeholder="Action, Drama" value={movieForm.genre} onChange={e=>setMovieForm({...movieForm, genre:e.target.value})} required />
                           </div>
                           <div className="form-group">
                              <label className="form-label">Duration (mins)</label>
                              <input className="form-input" type="number" value={movieForm.duration} onChange={e=>setMovieForm({...movieForm, duration:e.target.value})} required />
                           </div>
                        </div>
                        <div className="form-group">
                           <label className="form-label">Poster URL</label>
                           <input className="form-input" value={movieForm.poster} onChange={e=>setMovieForm({...movieForm, poster:e.target.value})} required />
                        </div>
                        <button className="btn btn-primary">Add Movie</button>
                    </form>
                 </div>
               )}

               {activeTab === 'theaters' && (
                 <div className={styles.card}>
                    <p>Theater management coming soon...</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

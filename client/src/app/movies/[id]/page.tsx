'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { getMovieById, getShowsByMovie } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/context/LocationContext';
import toast from 'react-hot-toast';
import styles from './detail.module.css';

export default function MovieDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { city } = useLocation();
  const [movie, setMovie] = useState<any>(null);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [movieError, setMovieError] = useState('');
  const [showsError, setShowsError] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Use local date string to avoid timezone offset issues
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    // Generate next 7 days using local dates (not UTC) to avoid timezone issues
    const next7Days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      next7Days.push(`${y}-${m}-${d}`);
    }
    setDates(next7Days);
  }, []);

  // Fetch movie once
  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const movieRes = await getMovieById(id as string);
        setMovie(movieRes.data.movie);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404) setMovieError('Movie not found.');
        else if (status === 400) setMovieError('Invalid movie ID.');
        else setMovieError('Failed to load movie details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  // Re-fetch shows whenever date OR city changes
  useEffect(() => {
    if (!id) return;
    setShowsError(false);
    let retryTimeout: ReturnType<typeof setTimeout>;

    const fetchShows = async (isRetry = false) => {
      try {
        const params: Record<string, string> = { date: selectedDate };
        if (city) params.city = city;
        const showsRes = await getShowsByMovie(id as string, params);
        const fetchedShows = showsRes.data.shows;
        setShows(fetchedShows);

        // If no shows on first attempt, retry once after 4s (city may still be provisioning)
        if (fetchedShows.length === 0 && !isRetry && city) {
          retryTimeout = setTimeout(() => fetchShows(true), 4000);
        }
      } catch (err) {
        setShows([]);
        setShowsError(true);
      }
    };
    fetchShows();
    return () => clearTimeout(retryTimeout);
  }, [id, selectedDate, city]);

  const handleShowClick = (showId: string) => {
    // Wait for auth to finish loading before checking
    if (authLoading) return;
    if (!user) {
      toast.error('Please login to book tickets');
      router.push(`/auth/login?redirect=/booking/${showId}`);
      return;
    }
    router.push(`/booking/${showId}`);
  };

  if (loading) return (
    <div className={styles.loadingContainer}>
      <Navbar />
      <div className="spinner" />
    </div>
  );

  if (movieError) return (
    <div className={styles.loadingContainer}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>{movieError}</h2>
        <button className="btn btn-primary" onClick={() => router.back()}>← Go Back</button>
      </div>
    </div>
  );

  if (!movie) return null;

  return (
    <main className={styles.main}>
      <Navbar />
      
      {/* Banner Section */}
      <section className={styles.hero}>
        <div className={styles.heroBg} style={{ backgroundImage: `url(${movie.banner || movie.poster})` }} />
        <div className={styles.heroOverlay} />
        <div className="container">
          <div className={styles.heroContent}>
            <div className={styles.posterSide}>
              <img
                src={movie.poster}
                alt={movie.title}
                className={styles.poster}
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450?text=No+Poster'; }}
              />
            </div>
            <div className={styles.infoSide}>
              <div className={styles.badges}>
                {movie.genre.map((g: string) => <span key={g} className="badge badge-primary">{g}</span>)}
              </div>
              <h1 className={styles.title}>{movie.title}</h1>
              <div className={styles.meta}>
                <div className={styles.metaItem}>
                  <span className={styles.metaIcon}>⭐</span>
                  <span className={styles.metaVal}>{movie.rating}/10</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaIcon}>⏱</span>
                  <span className={styles.metaVal}>{Math.floor(movie.duration / 60)}h {movie.duration % 60}m</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaIcon}>📅</span>
                  <span className={styles.metaVal}>{new Date(movie.releaseDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                </div>
              </div>
              <div className={styles.languages}>
                {movie.languages.map((l: string) => <span key={l} className={styles.lang}>{l}</span>)}
              </div>
              <button className="btn btn-primary btn-lg" onClick={() => {
                if (!user) {
                  router.push('/auth/login');
                  return;
                }
                document.getElementById('shows')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Book Tickets
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="section">
        <div className="container">
          <div className={styles.grid}>
            <div className={styles.mainContent}>
              <div className={styles.sectionBlock}>
                <h3 className={styles.blockTitle}>About the movie</h3>
                <p className={styles.description}>{movie.description}</p>
              </div>

              {movie.cast && movie.cast.length > 0 && (
                <div className={styles.sectionBlock}>
                  <h3 className={styles.blockTitle}>Cast</h3>
                  <div className={styles.castList}>
                    {movie.cast.map((person: any, idx: number) => (
                      <div key={idx} className={styles.castCard}>
                        <div className={styles.castImgWrapper}>
                          <img src={person.photo || 'https://via.placeholder.com/150'} alt={person.name} />
                        </div>
                        <p className={styles.castName}>{person.name}</p>
                        <p className={styles.castRole}>{person.role}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Show Booking */}
            <div className={styles.showSide} id="shows">
              <div className={styles.bookingCard}>
                <h3 className={styles.bookingTitle}>Booking Shows</h3>
                
                {/* Date Picker */}
                <div className={styles.datePicker}>
                  {dates.map(date => {
                    const d = new Date(date);
                    const isSelected = date === selectedDate;
                    return (
                      <button 
                        key={date}
                        className={`${styles.dateBtn} ${isSelected ? styles.dateActive : ''}`}
                        onClick={() => setSelectedDate(date)}
                      >
                        <span className={styles.dateDay}>{d.toLocaleDateString('en-US', {weekday: 'short'})}</span>
                        <span className={styles.dateNum}>{d.getDate()}</span>
                      </button>
                    )
                  })}
                </div>

                <div className={styles.showsList}>
                  {shows.length > 0 ? (
                    // Group shows by theater
                    Array.from(new Set(shows.map((s: any) => s.theater._id))).map(theaterId => {
                      const theaterShows = shows.filter((s: any) => s.theater._id === theaterId);
                      const theater = (theaterShows[0] as any).theater;
                      return (
                        <div key={theaterId} className={styles.theaterBlock}>
                          <div className={styles.theaterInfo}>
                            <h4 className={styles.theaterName}>{theater.name}</h4>
                            <p className={styles.theaterLoc}>{theater.address}, {theater.city}</p>
                          </div>
                          <div className={styles.timeGrid}>
                            {theaterShows.map((show: any) => (
                              <button 
                                key={show._id} 
                                className={styles.timeBtn}
                                onClick={() => handleShowClick(show._id)}
                              >
                                {show.time}
                                <span className={styles.format}>{show.format}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className={styles.noShows}>
                      {showsError ? (
                        <>
                          <p>Failed to load shows. Please try again.</p>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ marginTop: 12 }}
                            onClick={() => {
                              setShowsError(false);
                              const params: Record<string, string> = { date: selectedDate };
                              if (city) params.city = city;
                              getShowsByMovie(id as string, params)
                                .then(r => setShows(r.data.shows))
                                .catch(() => setShowsError(true));
                            }}
                          >
                            Retry
                          </button>
                        </>
                      ) : (
                        <>
                          <p>No shows available{city ? ` in ${city}` : ''} for this date.</p>
                          {city && <p style={{fontSize:'12px', marginTop:'6px', color:'var(--text-muted)'}}>Try changing your city from the navbar.</p>}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

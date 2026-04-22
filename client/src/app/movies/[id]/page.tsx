'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { getMovieById, getShowsByMovie } from '@/lib/api';
import toast from 'react-hot-toast';
import styles from './detail.module.css';

export default function MovieDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [movie, setMovie] = useState<any>(null);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    // Generate next 7 days for date picker
    const next7Days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      next7Days.push(date.toISOString().split('T')[0]);
    }
    setDates(next7Days);

    const fetchData = async () => {
      try {
        const movieRes = await getMovieById(id as string);
        setMovie(movieRes.data.movie);
        
        const showsRes = await getShowsByMovie(id as string, { date: selectedDate });
        setShows(showsRes.data.shows);
      } catch (err) {
        toast.error('Failed to load movie details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, selectedDate]);

  const handleShowClick = (showId: string) => {
    router.push(`/booking/${showId}`);
  };

  if (loading) return (
    <div className={styles.loadingContainer}>
      <Navbar />
      <div className="spinner" />
    </div>
  );

  if (!movie) return <div className={styles.error}>Movie not found</div>;

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
              <img src={movie.poster} alt={movie.title} className={styles.poster} />
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
                {movie.language.map((l: string) => <span key={l} className={styles.lang}>{l}</span>)}
              </div>
              <button className="btn btn-primary btn-lg" onClick={() => document.getElementById('shows')?.scrollIntoView({behavior:'smooth'})}>
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
                            <p className={styles.theaterLoc}>{theater.location}, {theater.city}</p>
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
                      <p>No shows available for this date.</p>
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

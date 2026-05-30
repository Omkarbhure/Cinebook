'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Link from 'next/link';
import styles from './details.module.css';

// Build local date string YYYY-MM-DD without UTC offset issues
const toLocalDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getNext7Days = () => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
};

export default function TheaterDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [theater, setTheater] = useState<any>(null);
  const [groupedShows, setGroupedShows] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [showsLoading, setShowsLoading] = useState(false);
  const days = getNext7Days();
  const [selectedDate, setSelectedDate] = useState(toLocalDateStr(days[0]));

  // Fetch theater info once
  useEffect(() => {
    api.get(`/theaters/details/${id}`)
      .then(res => setTheater(res.data.data))
      .catch(() => setTheater(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch shows whenever date changes
  useEffect(() => {
    if (!id) return;
    setShowsLoading(true);
    api.get(`/shows/theater/${id}`, { params: { date: selectedDate } })
      .then(res => {
        const shows = res.data.shows || [];
        // Group by movie title, deduplicate by time
        const grouped: Record<string, any[]> = {};
        for (const show of shows) {
          const key = show.movie?.title;
          if (!key) continue;
          if (!grouped[key]) grouped[key] = [];
          // Avoid duplicate times for same movie in same theater
          const alreadyHasTime = grouped[key].some(s => s.time === show.time);
          if (!alreadyHasTime) grouped[key].push(show);
        }
        setGroupedShows(grouped);
      })
      .catch(() => setGroupedShows({}))
      .finally(() => setShowsLoading(false));
  }, [id, selectedDate]);

  const handleShowClick = (showId: string) => {
    if (!user) {
      router.push(`/auth/login?redirect=/booking/${showId}`);
      return;
    }
    router.push(`/booking/${showId}`);
  };

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;
  if (!theater) return <div className="flex-center" style={{ height: '100vh' }}>Theater not found</div>;

  return (
    <main className={styles.container}>
      <Navbar />

      <div className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1>{theater.name}</h1>
            <p className={styles.address}>{theater.address}</p>
            <div className={styles.meta}>
              <span className={styles.rating}>⭐ {theater.rating}</span>
              <span className={styles.facilities}>{theater.facilities?.join(' · ')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Now Playing</h2>

            {/* Date picker */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {days.map(day => {
                const str = toLocalDateStr(day);
                const isSelected = str === selectedDate;
                return (
                  <button
                    key={str}
                    onClick={() => setSelectedDate(str)}
                    style={{
                      minWidth: 56, padding: '10px 8px',
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--primary)' : 'var(--bg-card)',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 800 }}>{day.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {showsLoading ? (
            <div className="flex-center" style={{ height: 200 }}><div className="spinner" /></div>
          ) : (
            <div className={styles.movieList}>
              {Object.keys(groupedShows).length > 0 ? (
                Object.entries(groupedShows).map(([movieTitle, shows]) => (
                  <div key={movieTitle} className={styles.movieRow}>
                    <div className={styles.moviePoster}>
                      <img
                        src={shows[0].movie.poster}
                        alt={movieTitle}
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x120?text=No+Poster'; }}
                      />
                    </div>
                    <div className={styles.movieInfo}>
                      <div className={styles.movieHeader}>
                        <h3>{movieTitle}</h3>
                        <div className={styles.movieMeta}>
                          <span>{shows[0].movie.duration} mins</span>
                          <span>{shows[0].movie.genre?.join(', ')}</span>
                        </div>
                      </div>

                      <div className={styles.showtimes}>
                        {shows.map(show => (
                          <button
                            key={show._id}
                            className={styles.timeSlot}
                            onClick={() => handleShowClick(show._id)}
                          >
                            <span className={styles.time}>{show.time}</span>
                            <span className={styles.format}>{show.format}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyShows}>
                  <p>No shows available for this date. Try another day!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

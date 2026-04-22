'use client';
import { useState, useEffect } from 'react';
import { useLocation } from '@/context/LocationContext';
import Navbar from '@/components/layout/Navbar';
import { getMovies } from '@/lib/api';
import axios from 'axios';
import Link from 'next/link';
import styles from './cinemas.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Theater {
  _id: string;
  name: string;
  address: string;
  city: string;
  facilities: string[];
  rating: number;
  availableMoviesCount: number;
}

export default function CinemasPage() {
  const { city } = useLocation();
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTheaters = async () => {
      if (!city) return;
      setLoading(true);
      try {
        const res = await axios.get(`${API}/theaters?city=${city}`);
        setTheaters(res.data.data);
      } catch (err) {
        console.error('Failed to fetch theaters:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTheaters();
  }, [city]);

  return (
    <main className={styles.container}>
      <Navbar />
      
      <div className="section">
        <div className="container">
          <header className={styles.header}>
            <h1 className="section-title">Cinemas in {city || 'your area'}</h1>
            <p className="section-subtitle">Experience the magic of the big screen at these top-rated venues</p>
          </header>

          <div className={styles.theaterGrid}>
            {loading ? (
              Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{height: '180px', borderRadius: '16px'}} />)
            ) : theaters.length > 0 ? (
              theaters.map(theater => (
                <div key={theater._id} className={styles.theaterCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.info}>
                      <h3>{theater.name}</h3>
                      <p className={styles.address}>{theater.address}</p>
                    </div>
                    <div className={styles.rating}>⭐ {theater.rating}</div>
                  </div>
                  
                  <div className={styles.tags}>
                    {theater.facilities.map(f => (
                      <span key={f} className={styles.tag}>{f}</span>
                    ))}
                  </div>

                  <div className={styles.footer}>
                    <div className={styles.moviesRunning}>🎬 {theater.availableMoviesCount} movies running</div>
                    <Link href={`/cinemas/${theater._id}`} className="btn btn-secondary btn-sm">
                      View Shows
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <p>No theaters found in {city}. Try another location!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { getNearbyTheaters } from '@/lib/api';
import styles from './nearby.module.css';

interface Theater {
  _id: string;
  name: string;
  address: string;
  distance: string;
  rating: number;
  facilities: string[];
  availableMoviesCount: number;
  location: {
    coordinates: [number, number];
  };
}

export default function NearbyTheaters() {
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationPermission, setLocationPermission] = useState<'pending' | 'granted' | 'denied'>('pending');

  const getPosition = () => {
    setLoading(true);
    setError('');
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocationPermission('granted');
        try {
          const { latitude, longitude } = position.coords;
          const res = await getNearbyTheaters(latitude, longitude, 50); // Search within 50km
          setTheaters(res.data.data);
        } catch (err) {
          setError('Failed to fetch nearby cinemas.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLocationPermission('denied');
        setLoading(false);
        if (err.code === 1) {
          setError('Please allow location access to find nearby cinemas.');
        } else {
          setError('Failed to retrieve your location.');
        }
      }
    );
  };

  useEffect(() => {
    getPosition();
  }, []);

  return (
    <main className={styles.main}>
      <Navbar />
      
      <div className="section">
        <div className="container">
          <header className={styles.header}>
            <h1 className="section-title">Cinemas Near You</h1>
            <p className="section-subtitle">Discover the best cinematic experiences within your reach</p>
          </header>

          {locationPermission === 'denied' && (
            <div className={styles.errorCard}>
              <div className={styles.errorIcon}>📍</div>
              <h3>Location Access Required</h3>
              <p>{error}</p>
              <button onClick={getPosition} className="btn btn-primary">Try Again</button>
            </div>
          )}

          {loading ? (
            <div className={styles.loader}>
              <div className="skeleton" style={{ height: '100px', marginBottom: '20px', borderRadius: '12px' }} />
              <div className="skeleton" style={{ height: '100px', marginBottom: '20px', borderRadius: '12px' }} />
              <div className="skeleton" style={{ height: '100px', marginBottom: '20px', borderRadius: '12px' }} />
            </div>
          ) : theaters.length > 0 ? (
            <div className={styles.theaterList}>
              {theaters.map((theater) => (
                <div key={theater._id} className={styles.theaterCard}>
                  <div className={styles.theaterInfo}>
                    <div className={styles.theaterHeader}>
                      <h3>{theater.name}</h3>
                      <div className={styles.distanceBadge}>{theater.distance} km away</div>
                    </div>
                    <p className={styles.address}>{theater.address}</p>
                    <div className={styles.meta}>
                      <span className={styles.rating}>⭐ {theater.rating}</span>
                      <span className={styles.moviesCount}>🎬 {theater.availableMoviesCount} Movies Playing</span>
                    </div>
                    <div className={styles.facilities}>
                      {theater.facilities.map(f => (
                        <span key={f} className={styles.facilityTag}>{f}</span>
                      ))}
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${theater.location.coordinates[1]},${theater.location.coordinates[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                    >
                      Get Directions
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : !loading && locationPermission === 'granted' ? (
            <div className={styles.emptyState}>
              <p>No cinemas found within 50km of your location.</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

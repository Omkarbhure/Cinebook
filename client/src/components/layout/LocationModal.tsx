'use client';
import { useLocation } from '@/context/LocationContext';
import styles from './LocationModal.module.css';
import { useState } from 'react';

export default function LocationModal() {
  const { city, setCity, availableCities, detectLocation, detecting } = useLocation();
  const [locationError, setLocationError] = useState('');

  if (city) return null;

  const handleDetect = async () => {
    setLocationError('');
    const result = await detectLocation();
    if (!result.success) {
      setLocationError(result.error || 'Could not detect location.');
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.icon}>📍</span>
          <h2 className={styles.title}>Where are you?</h2>
          <p className={styles.subtitle}>Select your city or let us detect your location.</p>
        </div>

        <button
          className={styles.detectBtn}
          onClick={handleDetect}
          disabled={detecting}
        >
          <span className={styles.detectIcon}>{detecting ? '⏳' : '🎯'}</span>
          <div className={styles.detectText}>
            <span className={styles.detectTitle}>
              {detecting ? 'Detecting your location...' : 'Use My Current Location'}
            </span>
            <span className={styles.detectSub}>GPS automatic city detection</span>
          </div>
        </button>

        {locationError && (
          <p className={styles.error}>{locationError}</p>
        )}

        <div className={styles.divider}>
          <span>or choose manually</span>
        </div>

        <div className={styles.grid}>
          {availableCities.map(c => (
            <button key={c} className={styles.cityCard} onClick={() => setCity(c)}>
              <span className={styles.cityName}>{c}</span>
              <span className={styles.arrow}>→</span>
            </button>
          ))}
        </div>

        <p className={styles.footer}>Don&apos;t see your city? We&apos;re expanding soon! 🍿</p>
      </div>
    </div>
  );
}

'use client';
import { useLocation } from '@/context/LocationContext';
import styles from './LocationModal.module.css';
import { useEffect, useState } from 'react';

export default function LocationModal() {
  const { city, setCity, availableCities, detectLocation, detecting } = useLocation();
  const [show, setShow] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    setShow(!city);
  }, [city]);

  if (!show) return null;

  const handleDetect = async () => {
    setLocationError('');
    const result = await detectLocation();
    if (result.success) {
      // city is set inside detectLocation — modal will close automatically
    } else {
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

        {/* Detect location button */}
        <button
          className={styles.detectBtn}
          onClick={handleDetect}
          disabled={detecting}
        >
          {detecting ? (
            <>
              <span className={styles.detectSpinner} />
              Detecting your location...
            </>
          ) : (
            <>
              <span className={styles.detectIcon}>🎯</span>
              Use My Current Location
              <span className={styles.detectHint}>accurate via GPS</span>
            </>
          )}
        </button>

        {/* Error message */}
        {locationError && (
          <div className={styles.errorMsg}>
            ⚠️ {locationError}
          </div>
        )}

        <div className={styles.divider}>
          <span>or choose your city</span>
        </div>

        <div className={styles.grid}>
          {availableCities.map(c => (
            <button key={c} className={styles.cityCard} onClick={() => setCity(c)}>
              <span className={styles.cityName}>{c}</span>
              <span className={styles.arrow}>→</span>
            </button>
          ))}
        </div>

        <p className={styles.footer}>Don't see your city? We're expanding soon! 🍿</p>
      </div>
    </div>
  );
}

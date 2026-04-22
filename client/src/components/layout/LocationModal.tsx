'use client';
import { useLocation } from '@/context/LocationContext';
import styles from './LocationModal.module.css';
import { useEffect, useState } from 'react';

export default function LocationModal() {
  const { city, setCity, availableCities } = useLocation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!city) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [city]);

  if (!show) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.icon}>📍</span>
          <h2 className={styles.title}>Where are you?</h2>
          <p className={styles.subtitle}>Select your city to see movies and cinemas near you.</p>
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

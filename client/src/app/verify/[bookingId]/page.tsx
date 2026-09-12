'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { verifyBooking } from '@/lib/api';
import styles from './verify.module.css';

export default function VerifyPage() {
  const { bookingId } = useParams();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await verifyBooking(bookingId as string);
        setResult(res.data);
      } catch (err: any) {
        setResult({
          success: false,
          valid: false,
          message: err?.response?.data?.message || 'Booking not found',
        });
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [bookingId]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Verifying ticket...</p>
        </div>
      </div>
    );
  }

  const b = result?.booking;
  const isValid = result?.valid;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Status icon */}
        <div className={`${styles.statusIcon} ${isValid ? styles.valid : styles.invalid}`}>
          {isValid ? '✅' : '❌'}
        </div>

        <h1 className={`${styles.statusTitle} ${isValid ? styles.validText : styles.invalidText}`}>
          {isValid ? 'Valid Ticket' : 'Invalid Ticket'}
        </h1>

        <p className={styles.statusSub}>
          {isValid
            ? 'This ticket is confirmed and valid for entry.'
            : result?.message || 'This ticket is not valid.'}
        </p>

        {b && (
          <div className={styles.details}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Booking ID</span>
              <span className={styles.detailValue}>{b.bookingId}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Movie</span>
              <span className={styles.detailValue}>{b.movie}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Theater</span>
              <span className={styles.detailValue}>{b.theater}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Date & Time</span>
              <span className={styles.detailValue}>
                {new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} | {b.time}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Seats</span>
              <span className={`${styles.detailValue} ${styles.seats}`}>{b.seats?.join(', ')}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Guest</span>
              <span className={styles.detailValue}>{b.userName}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Amount Paid</span>
              <span className={styles.detailValue}>₹{b.totalAmount}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Status</span>
              <span className={`${styles.statusBadge} ${b.status === 'confirmed' ? styles.badgeGreen : styles.badgeRed}`}>
                {b.status.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        <Link href="/" className={styles.homeLink}>← Back to CineBook</Link>
      </div>
    </div>
  );
}

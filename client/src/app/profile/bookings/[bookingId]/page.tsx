'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { getBookingById, cancelBooking } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import styles from './ticket.module.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CANCEL_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function QRCode({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    import('qrcode').then(QR => {
      QR.toCanvas(canvasRef.current!, value, { width: 120, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
    });
  }, [value]);
  return <canvas ref={canvasRef} style={{ borderRadius: 6, display: 'block' }} />;
}

export default function TicketPage() {
  const { bookingId } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelCountdown, setCancelCountdown] = useState('');
  const [canCancel, setCanCancel] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace(`/auth/login?redirect=/profile/bookings/${bookingId}`); return; }
    getBookingById(bookingId as string)
      .then(res => setBooking(res.data.booking))
      .catch(err => setError(err?.response?.data?.message || 'Failed to load ticket'))
      .finally(() => setLoading(false));
  }, [bookingId, user, authLoading, router]);

  // Countdown timer for cancellation window
  useEffect(() => {
    if (!booking || booking.status !== 'confirmed') return;
    const tick = () => {
      const age = Date.now() - new Date(booking.createdAt).getTime();
      const remaining = CANCEL_WINDOW_MS - age;
      if (remaining <= 0) {
        setCanCancel(false);
        setCancelCountdown('');
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      setCanCancel(true);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCancelCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [booking]);

  const handleCancel = async () => {
    if (!confirm(`Cancel this booking?\n\n₹${booking.totalAmount} will be refunded to your CineBook Wallet.`)) return;
    setCancelling(true);
    try {
      const res = await cancelBooking(booking._id);
      toast.success(res.data.message);
      setBooking((prev: any) => ({ ...prev, status: 'cancelled' }));
      setCanCancel(false);
      setCancelCountdown('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Cancellation failed');
    } finally { setCancelling(false); }
  };

  const handleDownloadPDF = async () => {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const canvas = await html2canvas(ticketRef.current, { scale: 2, backgroundColor: '#0a0a0f', useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, (canvas.height * pdfWidth) / canvas.width);
      pdf.save(`CineBook-Ticket-${booking.bookingId}.pdf`);
    } catch (err) { console.error('PDF generation failed:', err); }
    finally { setDownloading(false); }
  };

  if (authLoading || (user && loading)) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;

  if (error) return (
    <main style={{ minHeight: '100vh', paddingTop: 80 }}>
      <Navbar />
      <div className="flex-center" style={{ height: '60vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>🎟️</div>
        <h2 style={{ color: 'var(--text-primary)' }}>Ticket not found</h2>
        <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => router.push('/profile/bookings')}>My Bookings</button>
      </div>
    </main>
  );

  if (!booking) return null;

  const seatLabels = booking.seats.map((s: any) => `${String.fromCharCode(65 + s.row)}${s.col + 1}`).join(', ');
  const showDate = new Date(booking.show.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main className={styles.page}>
      <Navbar />

      <div className={styles.wrapper}>
        {/* Success banner */}
        <div className={styles.successBanner}>
          <span className={styles.successIcon}>🎉</span>
          <div>
            <h2 className={styles.successTitle}>Booking Confirmed!</h2>
            <p className={styles.successSub}>Your tickets are ready. Enjoy the show!</p>
          </div>
        </div>

        {/* Ticket card */}
        <div className={styles.ticket} ref={ticketRef}>
          {/* Header strip */}
          <div className={styles.ticketHeader}>
            <div className={styles.brand}>🎬 CineBook</div>
            <div className={`${styles.statusPill} ${booking.status === 'confirmed' ? styles.statusConfirmed : styles.statusCancelled}`}>
              {booking.status.toUpperCase()}
            </div>
          </div>

          {/* Movie title */}
          <div className={styles.movieSection}>
            <h1 className={styles.movieTitle}>{booking.movie.title}</h1>
            <div className={styles.movieMeta}>
              {booking.movie.languages?.slice(0, 2).map((l: string) => (
                <span key={l} className={styles.metaTag}>{l}</span>
              ))}
              {booking.movie.genre?.slice(0, 2).map((g: string) => (
                <span key={g} className={styles.metaTag}>{g}</span>
              ))}
              {booking.show.format && <span className={styles.metaTagAccent}>{booking.show.format}</span>}
            </div>
          </div>

          {/* Divider with notches */}
          <div className={styles.dividerRow}>
            <div className={styles.notchLeft} />
            <div className={styles.dashedLine} />
            <div className={styles.notchRight} />
          </div>

          {/* Info grid */}
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>📅</span>
              <div>
                <label className={styles.infoLabel}>Date</label>
                <span className={styles.infoValue}>{showDate}</span>
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>🕐</span>
              <div>
                <label className={styles.infoLabel}>Time</label>
                <span className={styles.infoValue}>{booking.show.time}</span>
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>🏛️</span>
              <div>
                <label className={styles.infoLabel}>Theater</label>
                <span className={styles.infoValue}>{booking.show.theater.name}</span>
                <span className={styles.infoSub}>{booking.show.theater.address}, {booking.show.theater.city}</span>
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>🪑</span>
              <div>
                <label className={styles.infoLabel}>Seats</label>
                <span className={`${styles.infoValue} ${styles.seatValue}`}>{seatLabels}</span>
                <span className={styles.infoSub}>{booking.seats.length} ticket{booking.seats.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Divider with notches */}
          <div className={styles.dividerRow}>
            <div className={styles.notchLeft} />
            <div className={styles.dashedLine} />
            <div className={styles.notchRight} />
          </div>

          {/* Bottom: QR + Booking ID + Amount */}
          <div className={styles.ticketBottom}>
            <div className={styles.qrSection}>
              <div className={styles.qrWrapper}>
                <QRCode value={`${APP_URL}/verify/${booking.bookingId}`} />
              </div>
              <p className={styles.qrLabel}>Scan to Verify</p>
            </div>

            <div className={styles.bottomRight}>
              <div className={styles.bookingIdBlock}>
                <label className={styles.infoLabel}>Booking ID</label>
                <span className={styles.bookingIdValue}>{booking.bookingId}</span>
              </div>
              <div className={styles.amountBlock}>
                <label className={styles.infoLabel}>Total Paid</label>
                <span className={styles.amountValue}>₹{booking.totalAmount}</span>
              </div>
              <div className={styles.payMethodBlock}>
                <label className={styles.infoLabel}>Payment</label>
                <span className={styles.payMethodValue}>{booking.paymentMethod?.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={styles.ticketFooter}>
            <span>Please arrive 15 minutes before showtime</span>
            <span>•</span>
            <span>Outside food not allowed</span>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className="btn btn-primary btn-lg" onClick={handleDownloadPDF} disabled={downloading}>
            {downloading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, marginRight: 8 }} />Generating PDF...</> : '⬇️ Download PDF'}
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => router.push('/movies')}>
            🎬 Book More Tickets
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => router.push('/profile/bookings')}>
            My Bookings
          </button>
        </div>

        {/* Cancel window */}
        {booking.status === 'confirmed' && canCancel && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ fontWeight: 700, color: '#ef4444', marginBottom: 2 }}>⏱ Cancel available for {cancelCountdown}</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>₹{booking.totalAmount} will be refunded to your CineBook Wallet</p>
            </div>
            <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }} onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Cancel Booking'}
            </button>
          </div>
        )}
        {booking.status === 'cancelled' && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
            <p style={{ color: '#ef4444', fontWeight: 700 }}>❌ This booking has been cancelled</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Refund has been credited to your CineBook Wallet</p>
          </div>
        )}
      </div>
    </main>
  );
}

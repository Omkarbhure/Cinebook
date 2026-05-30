'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { getMyBookings, cancelBooking } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

const CANCEL_WINDOW_MS = 10 * 60 * 1000;

function CancelTimer({ createdAt, bookingId, status, onCancelled }: { createdAt: string; bookingId: string; status: string; onCancelled: () => void }) {
  const [countdown, setCountdown] = useState('');
  const [canCancel, setCanCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (status !== 'confirmed') return;
    const tick = () => {
      const remaining = CANCEL_WINDOW_MS - (Date.now() - new Date(createdAt).getTime());
      if (remaining <= 0) { setCanCancel(false); setCountdown(''); return; }
      setCanCancel(true);
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [createdAt, status]);

  if (!canCancel) return null;

  const handleCancel = async () => {
    if (!confirm('Cancel this booking? Refund will go to your CineBook Wallet.')) return;
    setCancelling(true);
    try {
      const res = await cancelBooking(bookingId);
      toast.success(res.data.message);
      onCancelled();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Cancellation failed');
    } finally { setCancelling(false); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>⏱ Cancel in {countdown}</span>
      <button
        onClick={handleCancel}
        disabled={cancelling}
        style={{ fontSize: 12, padding: '4px 10px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
      >
        {cancelling ? 'Cancelling...' : 'Cancel'}
      </button>
    </div>
  );
}

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const res = await getMyBookings();
      setBookings(res.data.bookings);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/auth/login?redirect=/profile/bookings'); return; }
    fetchBookings();
  }, [user, authLoading, router]);

  if (authLoading || loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;

  return (
    <main style={{ minHeight: '100vh', paddingTop: 80 }}>
      <Navbar />
      <div className="section">
        <div className="container" style={{ maxWidth: 800 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>My Bookings</h1>
            <Link href="/profile" className="btn btn-secondary btn-sm">← Profile</Link>
          </div>

          {bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🎟️</div>
              <h3 style={{ marginBottom: 8 }}>No bookings yet</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Book your first movie ticket!</p>
              <Link href="/movies" className="btn btn-primary">Browse Movies</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {bookings.map((booking: any) => (
                <div key={booking._id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <img
                    src={booking.movie?.poster}
                    alt={booking.movie?.title}
                    style={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60x90?text=N/A'; }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700 }}>{booking.movie?.title || 'Unknown Movie'}</h3>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: booking.status === 'confirmed' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: booking.status === 'confirmed' ? '#10b981' : '#ef4444',
                      }}>
                        {booking.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                      {booking.show?.theater?.name || 'Theater N/A'}
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {booking.show?.date ? new Date(booking.show.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'} | {booking.show?.time || ''}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Seats: {booking.seats?.map((s: any) => `${String.fromCharCode(65 + s.row)}${s.col + 1}`).join(', ')} · ₹{booking.totalAmount}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Link href={`/profile/bookings/${booking._id}`} className="btn btn-primary btn-sm">View Ticket</Link>
                      <CancelTimer
                        createdAt={booking.createdAt}
                        bookingId={booking._id}
                        status={booking.status}
                        onCancelled={fetchBookings}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

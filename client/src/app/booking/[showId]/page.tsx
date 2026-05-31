'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { getShowById, createBooking, lockSeats, unlockSeats, getWallet } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import styles from './booking.module.css';

const LOCK_TIMEOUT_MS = 10 * 60 * 1000;

export default function BookingPage() {
  const { showId } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [show, setShow] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockExpiry, setLockExpiry] = useState<Date | null>(null);
  const [lockCountdown, setLockCountdown] = useState('');
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unlockOnUnmountRef = useRef<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);

  // Payment modal state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentStep, setPaymentStep] = useState<'select' | 'processing' | 'done'>('select');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast.error('Please login to book tickets');
      router.replace(`/auth/login?redirect=/booking/${showId}`);
      return;
    }
    const fetchShow = async () => {
      try {
        const res = await getShowById(showId as string);
        setShow(res.data.show);
        // Fetch wallet balance for payment modal
        getWallet().then(r => setWalletBalance(r.data.balance || 0)).catch(() => {});
      } catch (err: any) {
        if (err?.response?.status === 401) return;
        toast.error('Failed to load show details');
        router.replace('/movies');
      } finally {
        setLoading(false);
      }
    };
    fetchShow();
  }, [showId, user, authLoading, router]);

  // Countdown timer for seat lock
  useEffect(() => {
    if (!lockExpiry) { setLockCountdown(''); return; }
    const tick = () => {
      const remaining = lockExpiry.getTime() - Date.now();
      if (remaining <= 0) {
        setLockCountdown('');
        setLockExpiry(null);
        setSelectedSeats([]);
        toast.error('Seat hold expired. Please reselect your seats.');
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setLockCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    tick();
    lockTimerRef.current = setInterval(tick, 1000);
    return () => { if (lockTimerRef.current) clearInterval(lockTimerRef.current); };
  }, [lockExpiry]);

  // Unlock seats when user leaves the page without paying
  useEffect(() => {
    return () => {
      if (unlockOnUnmountRef.current.length > 0 && showId) {
        unlockSeats({ showId, seats: unlockOnUnmountRef.current }).catch(() => {});
      }
    };
  }, [showId]);

  const toggleSeat = async (seat: any) => {
    if (seat.userId) return; // permanently booked
    if (seat.isLocked && !seat.isLockedByMe) {
      toast.error('This seat is temporarily held by another user');
      return;
    }

    const isSelected = selectedSeats.some(s => s.row === seat.row && s.col === seat.col);

    if (isSelected) {
      // Deselect — unlock this seat
      const newSelected = selectedSeats.filter(s => !(s.row === seat.row && s.col === seat.col));
      setSelectedSeats(newSelected);
      unlockOnUnmountRef.current = newSelected;

      try {
        await unlockSeats({ showId, seats: [{ row: seat.row, col: seat.col }] });
      } catch { /* non-critical */ }

      // If no seats left, clear lock expiry
      if (newSelected.length === 0) setLockExpiry(null);
    } else {
      // Select — lock this seat
      if (selectedSeats.length >= 10) return toast.error('Maximum 10 seats allowed per booking');

      const newSelected = [...selectedSeats, seat];

      try {
        const res = await lockSeats({ showId, seats: newSelected.map(s => ({ row: s.row, col: s.col })) });
        setSelectedSeats(newSelected);
        unlockOnUnmountRef.current = newSelected;
        // Validate the expiry date before setting
        const expiry = new Date(res.data.lockedUntil);
        if (!isNaN(expiry.getTime())) setLockExpiry(expiry);
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Could not hold this seat. Try another.';
        toast.error(msg);
        // Refresh show to get latest seat state
        const refreshed = await getShowById(showId as string).catch(() => null);
        if (refreshed) setShow(refreshed.data.show);
      }
    }
  };

  const handlePayNow = async () => {
    if (!user) {
      toast.error('Session expired. Please login again.');
      router.replace(`/auth/login?redirect=/booking/${showId}`);
      return;
    }

    setPaymentStep('processing');
    await new Promise(r => setTimeout(r, 2000));

    try {
      const res = await createBooking({
        showId,
        seats: selectedSeats.map(s => ({ row: s.row, col: s.col })),
        paymentMethod,
      });
      // Clear unlock-on-unmount since booking succeeded
      unlockOnUnmountRef.current = [];
      setLockExpiry(null);
      setPaymentStep('done');
      await new Promise(r => setTimeout(r, 1000));
      router.push(`/profile/bookings/${res.data.booking._id}`);
    } catch (err: any) {
      setPaymentStep('select');
      if (err?.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        router.replace(`/auth/login?redirect=/booking/${showId}`);
        return;
      }
      const msg = err?.response?.data?.message || 'Payment failed. Please try again.';
      toast.error(msg);
      // If conflict (seats taken), refresh seat map
      if (err?.response?.status === 409) {
        const refreshed = await getShowById(showId as string).catch(() => null);
        if (refreshed) { setShow(refreshed.data.show); setSelectedSeats([]); setLockExpiry(null); }
      }
    }
  };

  if (authLoading || (user && loading)) {
    return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;
  }
  if (!user) return null;
  if (!show) return <div className="flex-center" style={{ height: '100vh' }}>Show not found</div>;

  const totalAmount = selectedSeats.reduce((acc, s) => acc + show.pricing[s.category], 0);
  const convFee = Math.round(totalAmount * 0.02);
  const grandTotal = totalAmount + convFee;
  const now = new Date();

  return (
    <main className={styles.container}>
      <Navbar />

      <div className={styles.layout}>
        {/* Seat Map */}
        <div className={styles.mapSide}>
          <div className={styles.screen}>
            <div className={styles.screenCurve} />
            <p className={styles.screenText}>All eyes this way</p>
          </div>
          <div className={styles.seatsContainer}>
            {Array.from({ length: show.theater.rows }).map((_, r) => (
              <div key={r} className={styles.row}>
                <span className={styles.rowLabel}>{String.fromCharCode(65 + r)}</span>
                <div className={styles.rowSeats}>
                  {show.seats.filter((s: any) => s.row === r).map((seat: any) => {
                    const isSelected = selectedSeats.some(s => s.row === seat.row && s.col === seat.col);
                    const isBooked = !!seat.userId;
                    const isLockedByOther = !isBooked && seat.lockedBy &&
                      seat.lockedBy.toString() !== (user?.id || (user as any)?._id) &&
                      new Date(seat.lockedUntil) > now;
                    return (
                      <button
                        key={`${seat.row}-${seat.col}`}
                        className={`${styles.seat} ${styles[seat.category]} ${isBooked ? styles.booked : ''} ${isSelected ? styles.selected : ''} ${isLockedByOther ? styles.locked : ''}`}
                        onClick={() => toggleSeat(seat)}
                        disabled={isBooked || isLockedByOther}
                        title={
                          isBooked ? `Booked` :
                          isLockedByOther ? `Held by another user` :
                          isSelected ? `Selected — ${seat.category.toUpperCase()}` :
                          `${seat.category.toUpperCase()} — Row ${String.fromCharCode(65 + r)}, Seat ${seat.col + 1}`
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.legend}>
            <div className={styles.legendItem}><span className={`${styles.dot} ${styles.silver}`} /> Silver</div>
            <div className={styles.legendItem}><span className={`${styles.dot} ${styles.gold}`} /> Gold</div>
            <div className={styles.legendItem}><span className={`${styles.dot} ${styles.platinum}`} /> Platinum</div>
            <div className={styles.legendItem}><span className={`${styles.dot} ${styles.selected}`} /> Selected</div>
            <div className={styles.legendItem}><span className={`${styles.dot} ${styles.locked}`} /> Held</div>
            <div className={styles.legendItem}><span className={`${styles.dot} ${styles.booked}`} /> Booked</div>
          </div>
        </div>

        {/* Summary */}
        <div className={styles.summarySide}>
          <div className={styles.summaryCard}>
            <div className={styles.movieHeader}>
              <img src={show.movie.poster} alt={show.movie.title} className={styles.miniPoster} />
              <div>
                <h3 className={styles.movieTitle}>{show.movie.title}</h3>
                <p className={styles.showInfo}>{show.theater.name}</p>
                <p className={styles.showInfo}>
                  {new Date(show.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} | {show.time}
                </p>
              </div>
            </div>
            <div className={styles.divider} />
            <div className={styles.selectionInfo}>
              <h4 className={styles.sectionTitle}>Selected Seats ({selectedSeats.length})</h4>
              {selectedSeats.length > 0 ? (
                <div className={styles.selectedList}>
                  {selectedSeats.map(s => (
                    <div key={`${s.row}-${s.col}`} className={styles.seatTag}>
                      {String.fromCharCode(65 + s.row)}{s.col + 1}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.noSelection}>Pick some seats to continue</p>
              )}
            </div>
            <div className={styles.divider} />
            <div className={styles.priceBreakdown}>
              <div className={styles.priceRow}><span>Tickets Total</span><span>₹{totalAmount}</span></div>
              <div className={styles.priceRow}><span>Convenience Fee (2%)</span><span>₹{convFee}</span></div>
              <div className={`${styles.priceRow} ${styles.grandTotal}`}><span>Total Amount</span><span>₹{grandTotal}</span></div>
            </div>
            {lockCountdown && (
              <div className={styles.lockTimer}>
                ⏱ Seats held for <strong>{lockCountdown}</strong> — complete payment before time runs out
              </div>
            )}
            <button
              className="btn btn-primary btn-full btn-lg"
              disabled={selectedSeats.length === 0}
              onClick={() => { setShowPayment(true); setPaymentStep('select'); }}
            >
              Confirm & Pay ₹{grandTotal}
            </button>
            <p className={styles.disclaimer}>*By clicking confirm, you agree to our terms and conditions.</p>
          </div>
        </div>
      </div>

      {/* ── Payment Modal ─────────────────────────────────────── */}
      {showPayment && (
        <div className={styles.payOverlay} onClick={() => { if (paymentStep === 'select') setShowPayment(false); }}>
          <div className={styles.payModal} onClick={e => e.stopPropagation()}>

            {paymentStep === 'select' && (
              <>
                <div className={styles.payHeader}>
                  <h2 className={styles.payTitle}>Complete Payment</h2>
                  <button className={styles.payClose} onClick={() => setShowPayment(false)}>✕</button>
                </div>

                <div className={styles.payAmount}>
                  <span className={styles.payAmountLabel}>Amount to Pay</span>
                  <span className={styles.payAmountValue}>₹{grandTotal}</span>
                </div>

                <p className={styles.paySubtitle}>Choose payment method</p>

                <div className={styles.payMethods}>
                  {[
                    { id: 'card',             label: 'Credit / Debit Card', icon: '💳', desc: 'Visa, Mastercard, RuPay' },
                    { id: 'upi',              label: 'UPI',                 icon: '📱', desc: 'GPay, PhonePe, Paytm' },
                    { id: 'netbanking',       label: 'Net Banking',          icon: '🏦', desc: 'All major banks' },
                    { id: 'wallet',           label: 'Wallet',               icon: '👛', desc: 'Paytm, Amazon Pay' },
                    { id: 'cinebook_wallet',  label: 'CineBook Wallet',      icon: '🎬', desc: `Balance: ₹${walletBalance}` },
                  ].map(m => {
                    const isWallet = m.id === 'cinebook_wallet';
                    const insufficient = isWallet && walletBalance < grandTotal;
                    return (
                      <button
                        key={m.id}
                        className={`${styles.payMethod} ${paymentMethod === m.id ? styles.payMethodActive : ''} ${insufficient ? styles.payMethodDisabled : ''}`}
                        onClick={() => { if (!insufficient) setPaymentMethod(m.id); }}
                        disabled={insufficient}
                        title={insufficient ? 'Insufficient balance' : ''}
                      >
                        <span className={styles.payMethodIcon}>{m.icon}</span>
                        <div className={styles.payMethodInfo}>
                          <span className={styles.payMethodLabel}>{m.label}</span>
                          <span className={styles.payMethodDesc} style={insufficient ? { color: '#ef4444' } : {}}>
                            {insufficient ? `Insufficient — need ₹${grandTotal - walletBalance} more` : m.desc}
                          </span>
                        </div>
                        <span className={styles.payMethodRadio}>
                          {paymentMethod === m.id ? '🔴' : '⚪'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className={styles.payDemoNote}>
                  🔒 This is a demo payment — no real money will be charged
                </div>

                <button className="btn btn-primary btn-full btn-lg" onClick={handlePayNow}>
                  Pay ₹{grandTotal}
                </button>
              </>
            )}

            {paymentStep === 'processing' && (
              <div className={styles.payProcessing}>
                <div className={styles.paySpinner} />
                <h3 className={styles.payProcessingTitle}>Processing Payment...</h3>
                <p className={styles.payProcessingDesc}>Please wait, do not close this window</p>
                <div className={styles.payProcessingAmount}>₹{grandTotal}</div>
              </div>
            )}

            {paymentStep === 'done' && (
              <div className={styles.paySuccess}>
                <div className={styles.paySuccessIcon}>✅</div>
                <h3>Payment Successful!</h3>
                <p>Generating your ticket...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

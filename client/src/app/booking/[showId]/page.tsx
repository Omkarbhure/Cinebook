'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { getShowById, createBooking } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import styles from './booking.module.css';

export default function BookingPage() {
  const { showId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [show, setShow] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      toast.error('Please login to book tickets');
      router.push(`/auth/login?redirect=/booking/${showId}`);
      return;
    }

    const fetchShow = async () => {
      try {
        const res = await getShowById(showId as string);
        setShow(res.data.show);
      } catch (err) {
        toast.error('Failed to load show details');
      } finally {
        setLoading(false);
      }
    };
    fetchShow();
  }, [showId, user, router]);

  const toggleSeat = (seat: any) => {
    if (seat.userId) return; // Already booked

    const isSelected = selectedSeats.some(s => s.row === seat.row && s.col === seat.col);
    if (isSelected) {
      setSelectedSeats(selectedSeats.filter(s => !(s.row === seat.row && s.col === seat.col)));
    } else {
      if (selectedSeats.length >= 10) {
        return toast.error('Maximum 10 seats allowed per booking');
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const handleBooking = async () => {
    if (selectedSeats.length === 0) return toast.error('Please select at least one seat');
    
    setBookingLoading(true);
    try {
      const res = await createBooking({
        showId,
        seats: selectedSeats.map(s => ({ row: s.row, col: s.col })),
        paymentMethod: 'card' // Mock default
      });
      toast.success('Tickets booked successfully! 🎉');
      router.push(`/profile/bookings/${res.data.booking._id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <div className="flex-center" style={{height:'100vh'}}><div className="spinner" /></div>;
  if (!show) return <div className="flex-center" style={{height:'100vh'}}>Show not found</div>;

  const totalAmount = selectedSeats.reduce((acc, s) => acc + show.pricing[s.category], 0);

  return (
    <main className={styles.container}>
      <Navbar />
      
      <div className={styles.layout}>
        {/* Left Side: Seat Map */}
        <div className={styles.mapSide}>
          <div className={styles.screen}>
            <div className={styles.screenCurve} />
            <p className={styles.screenText}>All eyes this way</p>
          </div>

          <div className={styles.seatsContainer}>
            {/* Group seats by rows for rendering */}
            {Array.from({ length: show.theater.rows }).map((_, r) => (
              <div key={r} className={styles.row}>
                <span className={styles.rowLabel}>{String.fromCharCode(65 + r)}</span>
                <div className={styles.rowSeats}>
                  {show.seats.filter((s: any) => s.row === r).map((seat: any) => {
                    const isSelected = selectedSeats.some(s => s.row === seat.row && s.col === seat.col);
                    const isBooked = !!seat.userId;
                    return (
                      <button
                        key={`${seat.row}-${seat.col}`}
                        className={`${styles.seat} ${styles[seat.category]} ${isBooked ? styles.booked : ''} ${isSelected ? styles.selected : ''}`}
                        onClick={() => toggleSeat(seat)}
                        disabled={isBooked}
                        title={`${seat.category.toUpperCase()} - Row ${String.fromCharCode(65 + r)}, Seat ${seat.col + 1}`}
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
            <div className={styles.legendItem}><span className={`${styles.dot} ${styles.booked}`} /> Booked</div>
          </div>
        </div>

        {/* Right Side: Summary */}
        <div className={styles.summarySide}>
          <div className={styles.summaryCard}>
            <div className={styles.movieHeader}>
              <img src={show.movie.poster} alt={show.movie.title} className={styles.miniPoster} />
              <div>
                <h3 className={styles.movieTitle}>{show.movie.title}</h3>
                <p className={styles.showInfo}>{show.theater.name}</p>
                <p className={styles.showInfo}>
                  {new Date(show.date).toLocaleDateString('en-US', { weekday:'short', day:'numeric', month:'short' })} | {show.time}
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
              <div className={styles.priceRow}>
                <span>Tickets Total</span>
                <span>₹{totalAmount}</span>
              </div>
              <div className={styles.priceRow}>
                <span>Convenience Fee (2%)</span>
                <span>₹{Math.round(totalAmount * 0.02)}</span>
              </div>
              <div className={`${styles.priceRow} ${styles.grandTotal}`}>
                <span>Total Amount</span>
                <span>₹{Math.round(totalAmount * 1.02)}</span>
              </div>
            </div>

            <button 
              className="btn btn-primary btn-full btn-lg" 
              disabled={selectedSeats.length === 0 || bookingLoading}
              onClick={handleBooking}
            >
              {bookingLoading ? 'Processing...' : `Confirm & Pay ₹${Math.round(totalAmount * 1.02)}`}
            </button>
            <p className={styles.disclaimer}>*By clicking confirm, you agree to our terms and conditions.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

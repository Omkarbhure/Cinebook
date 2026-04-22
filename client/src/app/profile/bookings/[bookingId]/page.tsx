'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { getBookingById } from '@/lib/api';
import styles from './ticket.module.css';

export default function TicketPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await getBookingById(bookingId as string);
        setBooking(res.data.booking);
      } catch (err) {
        console.error('Failed to fetch booking details');
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [bookingId]);

  if (loading) return <div className="flex-center" style={{height:'100vh'}}><div className="spinner" /></div>;
  if (!booking) return <div className="flex-center" style={{height:'100vh'}}>Booking not found</div>;

  return (
    <main className={styles.container}>
      <Navbar />
      
      <div className="section">
        <div className="container flex-center">
          <div className={styles.ticket}>
            <div className={styles.ticketLeft}>
              <div className={styles.movieHeader}>
                <h1 className={styles.title}>{booking.movie.title}</h1>
                <p className={styles.meta}>{booking.movie.language.join(', ')} | {booking.movie.genre.join(', ')}</p>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>Date</label>
                  <span>{new Date(booking.show.date).toLocaleDateString('en-US', {day:'numeric', month:'short', year:'numeric'})}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Time</label>
                  <span>{booking.show.time}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Theater</label>
                  <span>{booking.show.theater.name}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Seats</label>
                  <span className={styles.seatHighlights}>
                    {booking.seats.map((s:any) => `${String.fromCharCode(65 + s.row)}${s.col+1}`).join(', ')}
                  </span>
                </div>
              </div>

              <div className={styles.ticketBottom}>
                <div className={styles.barcodeWrapper}>
                  {/* Mock barcode lines */}
                  <div className={styles.barcodeLines} />
                  <p className={styles.bookingId}>{booking.bookingId}</p>
                </div>
                <div className={styles.totalBlock}>
                  <label>Total Paid</label>
                  <span className={styles.amount}>₹{booking.totalAmount}</span>
                </div>
              </div>
            </div>

            <div className={styles.ticketRight}>
               <div className={styles.qrWrapper}>
                  {/* Mock QR Code */}
                  <div className={styles.qrCode}>
                    <div className={styles.qrInner}>
                       {[...Array(16)].map((_, i) => <div key={i} className={styles.qrSquare} style={{opacity: Math.random() > 0.5 ? 1 : 0}} />)}
                    </div>
                  </div>
                  <p className={styles.qrText}>Scan at Entry</p>
               </div>
               <div className={styles.statusBadge}>
                  {booking.status.toUpperCase()}
               </div>
               <button className={styles.downloadBtn} onClick={() => window.print()}>
                  Download PDF
               </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

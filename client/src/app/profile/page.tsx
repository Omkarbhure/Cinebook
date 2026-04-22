'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/context/AuthContext';
import { getMyBookings } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import styles from './profile.module.css';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await getMyBookings();
        setBookings(res.data.bookings);
      } catch (err) {
        console.error('Failed to fetch bookings');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchBookings();
  }, [user]);

  if (!user) return <div className="flex-center" style={{height:'100vh'}}><div className="spinner" /></div>;

  return (
    <main className={styles.container}>
      <Navbar />
      
      <div className="section">
        <div className="container">
          <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
              <div className={styles.userSection}>
                <div className={styles.avatar}>
                  {user.avatar ? <img src={user.avatar} alt={user.name} /> : user.name.charAt(0)}
                </div>
                <h2 className={styles.userName}>{user.name}</h2>
                <p className={styles.userMeta}>{user.email || user.phone}</p>
                <div className="badge badge-primary">{user.role}</div>
              </div>

              <div className={styles.menu}>
                <Link href="/profile" className={`${styles.menuItem} ${styles.active}`}>
                   👤 Profile Overview
                </Link>
                <Link href="/profile/bookings" className={styles.menuItem}>
                   🎟️ My Bookings
                </Link>
                <button onClick={logout} className={`${styles.menuItem} ${styles.logout}`}>
                   🚪 Logout
                </button>
              </div>
            </aside>

            {/* Content */}
            <div className={styles.content}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Recent Activity</h3>
                <div className={styles.stats}>
                  <div className={styles.statBox}>
                    <span className={styles.statNum}>{bookings.length}</span>
                    <span className={styles.statLabel}>Total Bookings</span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statNum}>{bookings.filter((b:any)=>b.status==='confirmed').length}</span>
                    <span className={styles.statLabel}>Active Tickets</span>
                  </div>
                </div>
              </div>

              <div className={styles.sectionHeader}>
                <h3 className={styles.cardTitle}>Recent Bookings</h3>
                <Link href="/profile/bookings" className={styles.viewAll}>View All Bookings</Link>
              </div>

              <div className={styles.bookingsGrid}>
                {loading ? (
                   Array(2).fill(0).map((_, i) => <div key={i} className="skeleton" style={{height:180}} />)
                ) : bookings.length > 0 ? (
                  bookings.slice(0, 3).map((booking: any) => (
                    <div key={booking._id} className={styles.bookingCard}>
                      <img src={booking.movie.poster} alt={booking.movie.title} className={styles.bookingPoster} />
                      <div className={styles.bookingInfo}>
                        <h4 className={styles.bookingMovie}>{booking.movie.title}</h4>
                        <p className={styles.bookingTheater}>{booking.show.theater.name}</p>
                        <p className={styles.bookingTime}>
                          {new Date(booking.show.date).toLocaleDateString()} | {booking.show.time}
                        </p>
                        <div className={styles.bookingFooter}>
                           <span className={styles.bookingID}>ID: {booking.bookingId}</span>
                           <Link href={`/profile/bookings/${booking._id}`} className="btn btn-primary btn-sm">View Ticket</Link>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.empty}>
                    <p>You haven't booked any movies yet.</p>
                    <Link href="/movies" className="btn btn-primary">Book Now</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

'use client';
import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/context/AuthContext';
import { getMyBookings, uploadAvatar, updatePassword, getWallet, topUpWallet } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import styles from './profile.module.css';

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Password manager
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  // Wallet
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTxns, setWalletTxns] = useState<any[]>([]);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpMethod, setTopUpMethod] = useState('card');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const PRESET_AMOUNTS = [100, 200, 500, 1000];

  const fetchBookings = async () => {
    setFetchError(false);
    try {
      const res = await getMyBookings();
      setBookings(res.data.bookings);
    } catch (err) {
      setFetchError(true);
      toast.error('Failed to load your bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setAvatarUrl(user.avatar || '');
      fetchBookings();
      getWallet().then(r => { setWalletBalance(r.data.balance); setWalletTxns(r.data.transactions); }).catch(() => {});
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await uploadAvatar(formData);
      setAvatarUrl(res.data.avatar);
      // Update context state properly — not by mutation
      updateUser({ avatar: res.data.avatar });
      toast.success('Profile picture updated! 🎉');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(topUpAmount);
    if (!amount || amount < 1) return toast.error('Enter a valid amount');
    setTopUpLoading(true);
    try {
      const res = await topUpWallet({ amount, paymentMethod: topUpMethod });
      setWalletBalance(res.data.balance);
      getWallet().then(r => setWalletTxns(r.data.transactions)).catch(() => {});
      toast.success(res.data.message);
      setTopUpAmount('');
      setShowTopUp(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Top-up failed');
    } finally { setTopUpLoading(false); }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setPwLoading(true);
    try {
      await updatePassword({ newPassword, confirmPassword });
      toast.success('Password updated successfully! 🔐');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update password');
    } finally { setPwLoading(false); }
  };

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
                {/* Clickable avatar with upload overlay */}
                <div className={styles.avatarWrapper} onClick={handleAvatarClick} title="Click to change photo">
                  <div className={styles.avatar}>
                    {avatarUrl
                      ? <img src={avatarUrl} alt={user.name} />
                      : user.name.charAt(0).toUpperCase()
                    }
                  </div>
                  <div className={styles.avatarOverlay}>
                    {uploading ? <span className={styles.avatarSpinner} /> : '📷'}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
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
                ) : fetchError ? (
                  <div className={styles.empty}>
                    <p>Failed to load bookings.</p>
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={fetchBookings}>Retry</button>
                  </div>
                ) : bookings.length > 0 ? (
                  bookings.slice(0, 3).map((booking: any) => (
                    <div key={booking._id} className={styles.bookingCard}>
                      <img
                        src={booking.movie?.poster}
                        alt={booking.movie?.title}
                        className={styles.bookingPoster}
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60x90?text=N/A'; }}
                      />
                      <div className={styles.bookingInfo}>
                        <h4 className={styles.bookingMovie}>{booking.movie?.title || 'Unknown Movie'}</h4>
                        <p className={styles.bookingTheater}>{booking.show?.theater?.name || 'Theater info unavailable'}</p>
                        <p className={styles.bookingTime}>
                          {booking.show?.date ? new Date(booking.show.date).toLocaleDateString() : 'N/A'} | {booking.show?.time || ''}
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

              {/* ── Wallet Section ───────────────────────────── */}
              <div className={styles.card} style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <h3 className={styles.cardTitle}>👛 CineBook Wallet</h3>
                    <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--primary)', marginTop: 4 }}>₹{walletBalance.toFixed(2)}</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>Available balance</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowTopUp(p => !p)}>
                    {showTopUp ? '✕ Cancel' : '+ Add Money'}
                  </button>
                </div>

                {/* Top-up form */}
                {showTopUp && (
                  <form onSubmit={handleTopUp} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                    <p style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Select or enter amount</p>
                    {/* Preset amounts */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      {PRESET_AMOUNTS.map(a => (
                        <button
                          key={a} type="button"
                          className={`btn btn-sm ${topUpAmount === String(a) ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setTopUpAmount(String(a))}
                        >₹{a}</button>
                      ))}
                    </div>
                    {/* Custom amount */}
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <input
                        type="number" className="form-input" placeholder="Custom amount (₹1 - ₹10,000)"
                        value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} min={1} max={10000}
                      />
                    </div>
                    {/* Payment method */}
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">Pay via</label>
                      <select className="form-input" value={topUpMethod} onChange={e => setTopUpMethod(e.target.value)}>
                        <option value="card">💳 Credit / Debit Card</option>
                        <option value="upi">📱 UPI</option>
                        <option value="netbanking">🏦 Net Banking</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={topUpLoading || !topUpAmount}>
                      {topUpLoading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, marginRight: 8 }} />Processing...</> : `Add ₹${topUpAmount || '0'} to Wallet`}
                    </button>
                  </form>
                )}

                {/* Transaction history */}
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--text-secondary)' }}>Transaction History</p>
                  {walletTxns.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No transactions yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {walletTxns.map((t: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{t.description}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <span style={{ fontWeight: 800, fontSize: 15, color: t.type === 'credit' ? '#10b981' : '#ef4444' }}>
                            {t.type === 'credit' ? '+' : '-'}₹{t.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Password Manager ─────────────────────────── */}
              <div className={styles.card} style={{ marginTop: 32 }}>
                <h3 className={styles.cardTitle}>🔐 Password Manager</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
                  {user.email
                    ? 'Update your account password below.'
                    : 'Set a password to enable email login for your account.'}
                </p>
                <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        className="form-input"
                        placeholder="Min. 6 characters"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(p => !p)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                      >
                        {showNewPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="form-error" style={{ marginTop: 4, fontSize: 12, color: 'var(--danger)' }}>Passwords don't match</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={pwLoading || newPassword.length < 6 || newPassword !== confirmPassword}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {pwLoading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, marginRight: 8 }} />Updating...</> : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

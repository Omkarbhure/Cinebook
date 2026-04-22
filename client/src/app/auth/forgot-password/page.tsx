'use client';
import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import styles from '../login/auth.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSent(true);
      toast.success('Reset link sent! Check your inbox 📧');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.bgAnimation}>
        <div className={styles.bgOrb1} /><div className={styles.bgOrb2} />
      </div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'center', width:'100%', minHeight:'100vh', padding:'24px', position:'relative', zIndex:1}}>
        <div className={styles.authCard} style={{maxWidth:420, width:'100%'}}>
          <Link href="/" style={{display:'block', textAlign:'center', marginBottom:24, fontFamily:'var(--font-display)', fontSize:24, letterSpacing:1}}>
            🎬 CineBook
          </Link>
          {sent ? (
            <div style={{textAlign:'center', padding:'20px 0'}}>
              <div style={{fontSize:64, marginBottom:16}}>📬</div>
              <h2 className={styles.authTitle}>Email Sent!</h2>
              <p style={{color:'var(--text-secondary)', marginBottom:24}}>
                We sent a password reset link to <strong style={{color:'var(--text-primary)'}}>{email}</strong>. Check your inbox!
              </p>
              <Link href="/auth/login" className="btn btn-primary btn-full">Back to Login</Link>
            </div>
          ) : (
            <>
              <div className={styles.authHeader}>
                <h2 className={styles.authTitle}>Forgot Password?</h2>
                <p className={styles.authSubtitle}>No worries! Enter your email and we'll send a reset link.</p>
              </div>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                  {loading ? <span className="spinner" style={{width:20,height:20,borderWidth:2}} /> : '📤 Send Reset Link'}
                </button>
              </form>
              <p className={styles.switchAuth}>
                Remember your password? <Link href="/auth/login" className={styles.switchLink}>Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

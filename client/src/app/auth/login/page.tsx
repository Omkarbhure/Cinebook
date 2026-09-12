'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import styles from './auth.module.css';
import OtpResendTimer from '@/components/auth/OtpResendTimer';

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div className="spinner" /></div>}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  // Email OTP step
  const [emailOtpStep, setEmailOtpStep] = useState(false);
  const [emailOtpUserId, setEmailOtpUserId] = useState('');
  const [emailOtpMasked, setEmailOtpMasked] = useState('');
  const [emailOtp, setEmailOtp] = useState('');

  const { login, verifyLoginOtp, resendLoginOtp, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  // If already logged in, redirect appropriately
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(user.role === 'admin' ? '/admin' : redirectTo);
    }
  }, [user, authLoading, redirectTo, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.requiresOtp) {
        setEmailOtpStep(true);
        setEmailOtpUserId(result.userId!);
        setEmailOtpMasked(result.maskedEmail!);
        toast.success('OTP sent to your email 📧');
      } else {
        toast.success(result.role === 'admin' ? 'Welcome, Admin! 🛡️' : 'Welcome back! 🎬');
        router.replace(result.role === 'admin' ? '/admin' : redirectTo);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { role } = await verifyLoginOtp(emailOtpUserId, emailOtp);
      toast.success('Logged in successfully! 🎉');
      router.replace(role === 'admin' ? '/admin' : redirectTo);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const handleResendLoginOtp = async () => {
    try {
      const res = await resendLoginOtp(emailOtpUserId, email);
      if (res.maskedEmail) setEmailOtpMasked(res.maskedEmail);
      setEmailOtp('');
      toast.success('New OTP sent to your email 📧');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to resend OTP. Please try again.');
      throw err;
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.bgAnimation}>
        <div className={styles.bgOrb1} /><div className={styles.bgOrb2} /><div className={styles.bgOrb3} />
      </div>

      <div className={styles.authContainer}>
        <div className={styles.leftPanel}>
          <Link href="/" className={styles.brandLogo}>🎬 CineBook</Link>
          <div className={styles.leftContent}>
            <h1 className={styles.leftTitle}>Your Cinema,<br />Your Way.</h1>
            <p className={styles.leftSubtitle}>Book tickets for the latest blockbusters, pick the perfect seats, and enjoy the magic of cinema.</p>
            <div className={styles.features}>
              {['🎭 1000+ Movies', '🪑 Smart Seat Selection', '⚡ Instant Confirmation', '🎟️ Digital Tickets'].map(f => (
                <div key={f} className={styles.featureItem}>{f}</div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.authCard}>
            <div className={styles.authHeader}>
              <h2 className={styles.authTitle}>Welcome Back</h2>
              <p className={styles.authSubtitle}>Sign in to continue to CineBook</p>
            </div>

            {emailOtpStep ? (
              <form onSubmit={handleVerifyEmailOtp} className={styles.form}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📧</div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    We sent a 6-digit OTP to <strong style={{ color: 'var(--text-primary)' }}>{emailOtpMasked}</strong>
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Enter OTP</label>
                  <input
                    type="text"
                    className={`form-input ${styles.otpInput}`}
                    placeholder="Enter 6-digit OTP"
                    value={emailOtp}
                    onChange={e => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    autoFocus
                    required
                  />
                  <p className="form-hint">OTP expires in 5 minutes</p>
                </div>

                <OtpResendTimer onResend={handleResendLoginOtp} initialSeconds={300} disabled={loading} />

                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || emailOtp.length !== 6}>
                  {loading ? <span className="spinner" /> : '✅ Verify & Login'}
                </button>
                <button type="button" className="btn btn-ghost btn-full" style={{ marginTop: 8 }}
                  onClick={() => { setEmailOtpStep(false); setEmailOtp(''); }}>
                  ← Back
                </button>
              </form>
            ) : (
              <form onSubmit={handleEmailLogin} className={styles.form}>
                <div className="form-group">
                  <label className="form-label">Email or Username</label>
                  <input type="text" className="form-input" placeholder="you@example.com or admin"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className={styles.passwordWrapper}>
                    <input type={showPass ? 'text' : 'password'} className="form-input" placeholder="Your password"
                      value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div className={styles.forgotRow}>
                  <Link href="/auth/forgot-password" className={styles.forgotLink}>Forgot password?</Link>
                </div>
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                  {loading ? <span className="spinner" /> : '🚀 Sign In'}
                </button>
              </form>
            )}

            <p className={styles.switchAuth}>
              Don't have an account? <Link href="/auth/register" className={styles.switchLink}>Sign up free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

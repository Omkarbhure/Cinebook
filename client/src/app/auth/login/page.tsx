'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import styles from './auth.module.css';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase';

type Tab = 'email' | 'phone';

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const { login, verifyFirebaseLogin, googleLogin, sendOtp, verifyOtp } = useAuth();
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back! 🎬');
      router.push('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) return toast.error('Enter a valid 10-digit phone number');
    setLoading(true);
    try {
      const formattedPhone = `+91${phone}`;
      await sendOtp(formattedPhone);
      setOtpSent(true);
      toast.success('OTP sent! demo use 123456 📱');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formattedPhone = `+91${phone}`;
      await verifyOtp(formattedPhone, otp);
      toast.success('Logged in successfully! 🎉');
      router.push('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();
      // We'll reuse the verifyFirebaseLogin logic which handles token verification
      await verifyFirebaseLogin(idToken, '');
      toast.success('Logged in with Google! 🚀');
      router.push('/');
    } catch (err: any) {
      console.error('Google Auth Error Details:', err);
      toast.error('Google login failed. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.authPage}>
      {/* Recaptcha Container for Firebase */}
      <div id="recaptcha-container"></div>

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

            <div className={styles.tabSwitcher}>
              <button className={`${styles.tab} ${tab === 'email' ? styles.tabActive : ''}`} onClick={() => setTab('email')}>📧 Email</button>
              <button className={`${styles.tab} ${tab === 'phone' ? styles.tabActive : ''}`} onClick={() => setTab('phone')}>📱 Phone OTP</button>
            </div>

            {tab === 'email' && (
              <form onSubmit={handleEmailLogin} className={styles.form}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" placeholder="you@example.com"
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

            {tab === 'phone' && (
              <div className={styles.form}>
                {!otpSent ? (
                  <form onSubmit={handleSendOtp}>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <div className={styles.phoneInputWrapper}>
                        <span className={styles.phonePrefix}>+91</span>
                        <input type="tel" className="form-input" placeholder="9876543210"
                          value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} required />
                      </div>
                      <p className="form-hint">Enter your 10-digit mobile number</p>
                    </div>
                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                      {loading ? <span className="spinner" /> : '📤 Send OTP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp}>
                    <div className="form-group">
                      <label className="form-label">OTP Code</label>
                      <input type="text" className={`form-input ${styles.otpInput}`} placeholder="Enter 6-digit OTP"
                        value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} required />
                      <p className="form-hint">OTP sent to +91 {phone} · <button type="button" onClick={() => setOtpSent(false)} className={styles.changeBtn}>Change</button></p>
                    </div>
                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                      {loading ? <span className="spinner" /> : '✅ Verify OTP'}
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="divider-text" style={{margin:'20px 0'}}>OR</div>

            <button className={`btn btn-secondary btn-full ${styles.googleBtn}`}
              onClick={handleGoogleLogin} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{marginRight: 10}}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <p className={styles.switchAuth}>
              Don't have an account? <Link href="/auth/register" className={styles.switchLink}>Sign up free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

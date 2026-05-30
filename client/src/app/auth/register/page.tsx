'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase';
import toast from 'react-hot-toast';
import styles from '../login/auth.module.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  // OTP step
  const [otpStep, setOtpStep] = useState(false);
  const [otpUserId, setOtpUserId] = useState('');
  const [otpMasked, setOtpMasked] = useState('');
  const [otp, setOtp] = useState('');

  const { register, verifyRegisterOtp, verifyFirebaseLogin } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (phone.length !== 10) return toast.error('Enter a valid 10-digit phone number');
    if (password !== confirm) return toast.error('Passwords do not match!');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const result = await register(name, email, password, phone);
      setOtpUserId(result.userId);
      setOtpMasked(result.maskedEmail);
      setOtpStep(true);
      toast.success('OTP sent to your email 📧');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await verifyRegisterOtp(otpUserId, otp);
      toast.success('Account verified! Welcome to CineBook 🎉');
      router.replace('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const handleGoogleSignup = async () => {
    if (loading) return;
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();
      await verifyFirebaseLogin(idToken, '');
      toast.success('Signed up with Google! 🚀');
      router.replace('/');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // user closed popup
      } else {
        toast.error('Google signup failed. Try again.');
      }
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.bgAnimation}>
        <div className={styles.bgOrb1} /><div className={styles.bgOrb2} /><div className={styles.bgOrb3} />
      </div>
      <div className={styles.authContainer}>
        {/* Left Panel */}
        <div className={styles.leftPanel}>
          <Link href="/" className={styles.brandLogo}>🎬 CineBook</Link>
          <div className={styles.leftContent}>
            <h1 className={styles.leftTitle}>Join the<br />Cinematic<br />Universe.</h1>
            <p className={styles.leftSubtitle}>Create your free account and start booking tickets for your favourite movies instantly.</p>
            <div className={styles.features}>
              {['🎁 Free to sign up', '🔒 Secure & private', '📲 Multi-device access', '🎉 Exclusive offers'].map(f => (
                <div key={f} className={styles.featureItem}>{f}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className={styles.rightPanel}>
          <div className={styles.authCard}>
            {otpStep ? (
              /* OTP Verification Step */
              <form onSubmit={handleVerifyOtp} className={styles.form}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 56, marginBottom: 12 }}>📧</div>
                  <h2 className={styles.authTitle}>Verify Your Email</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>
                    We sent a 6-digit OTP to<br />
                    <strong style={{ color: 'var(--text-primary)' }}>{otpMasked}</strong>
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Enter OTP</label>
                  <input
                    type="text"
                    className={`form-input ${styles.otpInput}`}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    autoFocus
                    required
                  />
                  <p className="form-hint">OTP expires in 5 minutes</p>
                </div>
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || otp.length !== 6}>
                  {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : '✅ Verify & Create Account'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-full"
                  style={{ marginTop: 8 }}
                  onClick={() => { setOtpStep(false); setOtp(''); }}
                >
                  ← Back
                </button>
              </form>
            ) : (
              <>
                <div className={styles.authHeader}>
                  <h2 className={styles.authTitle}>Create Account</h2>
                  <p className={styles.authSubtitle}>Sign up and start booking in seconds</p>
                </div>
                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-input" placeholder="John Doe"
                      value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" className="form-input" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <div className={styles.phoneInputWrapper}>
                      <span className={styles.phonePrefix}>+91</span>
                      <input 
                        type="tel" 
                        className="form-input" 
                        placeholder="9876543210"
                        value={phone} 
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                        required 
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className={styles.passwordWrapper}>
                      <input type={showPass ? 'text' : 'password'} className="form-input" placeholder="Min. 6 characters"
                        value={password} onChange={e => setPassword(e.target.value)} required />
                      <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                        {showPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <input type="password" className={`form-input ${confirm && confirm !== password ? 'error' : ''}`}
                      placeholder="Re-enter password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                    {confirm && confirm !== password && <p className="form-error">Passwords don't match</p>}
                  </div>
                  <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                    {loading ? <span className="spinner" style={{width:20,height:20,borderWidth:2}} /> : '🚀 Create Account'}
                  </button>
                </form>

                <div className="divider-text" style={{margin:'20px 0'}}>OR</div>

                <button
                  type="button"
                  className={`btn btn-secondary btn-full ${styles.googleBtn}`}
                  onClick={handleGoogleSignup}
                  disabled={loading}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" style={{marginRight: 10}}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign up with Google
                </button>

                <p className={styles.switchAuth}>
                  Already have an account? <Link href="/auth/login" className={styles.switchLink}>Sign in</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

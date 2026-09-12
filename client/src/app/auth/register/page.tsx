'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import styles from '../login/auth.module.css';
import OtpResendTimer from '@/components/auth/OtpResendTimer';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  // OTP step
  const [otpStep, setOtpStep] = useState(false);
  const [otpUserId, setOtpUserId] = useState('');
  const [otpMasked, setOtpMasked] = useState('');
  const [otp, setOtp] = useState('');

  const { register, verifyRegisterOtp, resendRegisterOtp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password !== confirm) return toast.error('Passwords do not match!');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const result = await register(name, email, password);
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

  const handleResendOtp = async () => {
    try {
      const res = await resendRegisterOtp(otpUserId, email);
      if (res.maskedEmail) setOtpMasked(res.maskedEmail);
      setOtp('');
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

                <OtpResendTimer onResend={handleResendOtp} initialSeconds={300} disabled={loading} />

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

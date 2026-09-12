'use client';
import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import styles from '../login/auth.module.css';
import moduleStyles from './forgotPassword.module.css';
import OtpResendTimer from '@/components/auth/OtpResendTimer';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'request' | 'otp' | 'done'>('request');
  const [userId, setUserId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/forgot-password`, { email });
      const data = response.data;

      if (data.requiresOtp && data.userId) {
        setUserId(data.userId);
        setMaskedEmail(data.maskedEmail || email);
        setStep('otp');
        setInfoMessage(data.message || 'OTP sent to your email');
        toast.success(data.message || 'OTP sent to your email 📧');
        return;
      }

      setStep('done');
      setInfoMessage(data.message || 'If an account exists for that email, a reset OTP has been sent.');
      toast.success(data.message || 'If an account exists for that email, a reset OTP has been sent.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const response = await axios.post(`${API}/auth/forgot-password`, { email });
      const data = response.data;
      if (data.maskedEmail) setMaskedEmail(data.maskedEmail);
      if (data.userId) setUserId(data.userId);
      setOtp('');
      toast.success('New password reset OTP sent to your email 📧');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to resend OTP');
      throw err;
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/reset-password`, {
        userId,
        otp,
        newPassword: password,
      });

      if (response.data.success) {
        setStep('done');
        setInfoMessage('Password reset successfully. You can now sign in with your new password.');
        toast.success('Password reset successfully ✅');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to reset your password');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setStep('request');
    setEmail('');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setUserId('');
    setMaskedEmail('');
    setInfoMessage('');
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.bgAnimation}>
        <div className={styles.bgOrb1} /><div className={styles.bgOrb2} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '100vh', padding: '24px', position: 'relative', zIndex: 1 }}>
        <div className={`${styles.authCard} ${moduleStyles.forgotCard}`}>
          <Link href="/" style={{ display: 'block', textAlign: 'center', marginBottom: 24, fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: 1 }}>
            🎬 CineBook
          </Link>

          {step === 'otp' ? (
            <div className={moduleStyles.forgotPanel}>
              <div className={moduleStyles.forgotHeader}>
                <h2 className={styles.authTitle}>Reset Password</h2>
                <p className={moduleStyles.forgotSubtitle}>Enter the OTP sent to {maskedEmail} and choose a new password.</p>
              </div>

              <form onSubmit={handleResetPassword} className={styles.form}>
                <div className="form-group">
                  <label className="form-label">Enter OTP</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="6-digit OTP"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <OtpResendTimer onResend={handleResendOtp} initialSeconds={300} disabled={loading} />

                {infoMessage && (
                  <p className={moduleStyles.forgotNotice}>{infoMessage}</p>
                )}

                <div className={moduleStyles.forgotActions}>
                  <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || otp.length !== 6}>
                    {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : '✅ Change Password'}
                  </button>

                  <button type="button" className="btn btn-ghost btn-full" onClick={resetState}>
                    ← Back
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className={moduleStyles.forgotPanel}>
              <div className={moduleStyles.forgotHeader}>
                <h2 className={styles.authTitle}>Forgot Password?</h2>
                <p className={moduleStyles.forgotSubtitle}>No worries! Enter your email and we'll send a reset OTP.</p>
              </div>

              {step === 'done' ? (
                <div className={moduleStyles.forgotSuccess}>
                  <div className={moduleStyles.forgotSuccessIcon}>📬</div>
                  <h2 className={moduleStyles.forgotSuccessTitle}>Request Sent</h2>
                  <p className={moduleStyles.forgotSuccessText}>{infoMessage}</p>
                  <Link href="/auth/login" className="btn btn-primary btn-full">Back to Login</Link>
                </div>
              ) : (
                <form onSubmit={handleRequestOtp} className={styles.form}>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                    {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : '📤 Send Reset OTP'}
                  </button>
                </form>
              )}

              <p className={styles.switchAuth}>
                Remember your password? <Link href="/auth/login" className={styles.switchLink}>Sign in</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

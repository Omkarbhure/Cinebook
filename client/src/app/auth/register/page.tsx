'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
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
  const [done, setDone] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) return toast.error('Enter a valid 10-digit phone number');
    if (password !== confirm) return toast.error('Passwords do not match!');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(name, email, password, phone);
      setDone(true);
      toast.success('Account created! Check your email to verify. 📧');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed');
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
            {done ? (
              <div style={{textAlign:'center', padding:'40px 0'}}>
                <div style={{fontSize:64, marginBottom:16}}>📧</div>
                <h2 className={styles.authTitle}>Check Your Email!</h2>
                <p style={{color:'var(--text-secondary)', marginBottom:24}}>
                  We sent a verification link to <strong style={{color:'var(--text-primary)'}}>{email}</strong>.
                  Please verify to activate your account.
                </p>
                <Link href="/auth/login" className="btn btn-primary btn-full">Go to Login</Link>
              </div>
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

'use client';
import { useState, useEffect } from 'react';
import styles from '@/app/auth/login/auth.module.css';

interface OtpResendTimerProps {
  onResend: () => Promise<void>;
  initialSeconds?: number;
  disabled?: boolean;
}

export default function OtpResendTimer({
  onResend,
  initialSeconds = 300, // 5 minutes
  disabled = false,
}: OtpResendTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResend = async () => {
    if (timeLeft > 0 || resending || disabled) return;
    setResending(true);
    try {
      await onResend();
      setTimeLeft(initialSeconds); // Reset back to 5 minutes after resending
    } catch {
      // Error handled in parent toast
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.otpResendWrapper}>
      {timeLeft > 0 ? (
        <div className={styles.resendTimerText}>
          <span>⏱️ Resend OTP in</span>
          <span className={styles.resendTimerBadge}>{formatTime(timeLeft)}</span>
        </div>
      ) : (
        <button
          type="button"
          className={styles.resendBtnActive}
          onClick={handleResend}
          disabled={resending || disabled}
        >
          {resending ? (
            <>
              <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              <span>Resending...</span>
            </>
          ) : (
            <>
              <span>🔄</span>
              <span>Resend OTP</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

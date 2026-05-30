'use client';
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import { setUserToken, setAdminToken } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── Token persistence (sessionStorage — cleared on tab close) ──────────────
// We use sessionStorage so tokens survive page refresh but not new tabs.
const TOKEN_KEY = 'cinebook_session_token';

const saveToken = (token: string | null) => {
  if (typeof window === 'undefined') return;
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
};

const loadToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
};

// Clear any legacy stored tokens on load
if (typeof window !== 'undefined') {
  localStorage.removeItem('cinebook_token');
  localStorage.removeItem('cinebook_admin_token');
}

interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'user' | 'admin';
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; payload: { user: User; token: string } }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload.user, token: action.payload.token, loading: false };
    case 'UPDATE_USER':
      return { ...state, user: state.user ? { ...state.user, ...action.payload } : null };
    case 'LOGOUT':
      return { user: null, token: null, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (emailOrUsername: string, password: string) => Promise<{ role?: string; requiresOtp?: boolean; maskedEmail?: string; userId?: string }>;
  verifyLoginOtp: (userId: string, otp: string) => Promise<{ role: string }>;
  register: (name: string, email: string, password: string, phone: string) => Promise<{ requiresOtp: boolean; maskedEmail: string; userId: string }>;
  verifyRegisterOtp: (userId: string, otp: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string, name?: string) => Promise<void>;
  verifyFirebaseLogin: (idToken: string, phone: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: null,
    loading: true, // start true — we attempt session restore before rendering protected pages
  });

  // ── Restore session on mount ──────────────────────────────
  useEffect(() => {
    const token = loadToken();
    if (!token) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }
    // Validate token with server and restore user
    axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const user = res.data.user;
        if (user.role === 'admin') setAdminToken(token);
        else setUserToken(token);
        dispatch({ type: 'SET_USER', payload: { user, token } });
      })
      .catch(() => {
        // Token invalid or expired — clear it
        saveToken(null);
        dispatch({ type: 'SET_LOADING', payload: false });
      });
  }, []);

  // Single login — works for both users and admins
  // Returns { role } for admin/phone-only, or { requiresOtp, maskedEmail, userId } for email users
  const login = async (emailOrUsername: string, password: string): Promise<{ role?: string; requiresOtp?: boolean; maskedEmail?: string; userId?: string }> => {
    const isEmail = emailOrUsername.includes('@');
    const payload = isEmail
      ? { email: emailOrUsername, password }
      : { username: emailOrUsername, password };

    const res = await axios.post(`${API}/auth/login`, payload);
    const data = res.data;

    // OTP required — don't set token yet
    if (data.requiresOtp) {
      return { requiresOtp: true, maskedEmail: data.maskedEmail, userId: data.userId };
    }

    // Direct login (admin or phone-only user)
    if (data.user.role === 'admin') {
      setAdminToken(data.token);
    } else {
      setUserToken(data.token);
    }
    saveToken(data.token);
    dispatch({ type: 'SET_USER', payload: { user: data.user, token: data.token } });
    return { role: data.user.role };
  };

  const verifyLoginOtp = async (userId: string, otp: string): Promise<{ role: string }> => {
    const res = await axios.post(`${API}/auth/verify-login-otp`, { userId, otp });
    const { user, token } = res.data;
    setUserToken(token);
    saveToken(token);
    dispatch({ type: 'SET_USER', payload: { user, token } });
    return { role: user.role };
  };

  const register = async (name: string, email: string, password: string, phone: string): Promise<{ requiresOtp: boolean; maskedEmail: string; userId: string }> => {
    const res = await axios.post(`${API}/auth/register`, { name, email, password, phone: `+91${phone}` });
    return { requiresOtp: res.data.requiresOtp, maskedEmail: res.data.maskedEmail, userId: res.data.userId };
  };

  const verifyRegisterOtp = async (userId: string, otp: string): Promise<void> => {
    const res = await axios.post(`${API}/auth/verify-register-otp`, { userId, otp });
    setUserToken(res.data.token);
    saveToken(res.data.token);
    dispatch({ type: 'SET_USER', payload: { user: res.data.user, token: res.data.token } });
  };

  const googleLogin = async (idToken: string) => {
    const res = await axios.post(`${API}/auth/google`, { idToken });
    setUserToken(res.data.token);
    saveToken(res.data.token);
    dispatch({ type: 'SET_USER', payload: { user: res.data.user, token: res.data.token } });
  };

  const sendOtp = async (phone: string) => {
    await axios.post(`${API}/auth/send-otp`, { phone });
  };

  const verifyOtp = async (phone: string, otp: string, name?: string) => {
    const res = await axios.post(`${API}/auth/verify-otp`, { phone, otp, name });
    setUserToken(res.data.token);
    saveToken(res.data.token);
    dispatch({ type: 'SET_USER', payload: { user: res.data.user, token: res.data.token } });
  };

  const verifyFirebaseLogin = async (idToken: string, phone: string) => {
    const res = await axios.post(`${API}/auth/verify-firebase`, { idToken, phone });
    setUserToken(res.data.token);
    saveToken(res.data.token);
    dispatch({ type: 'SET_USER', payload: { user: res.data.user, token: res.data.token } });
  };

  const logout = () => {
    setUserToken(null);
    setAdminToken(null);
    saveToken(null);
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (updates: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      verifyLoginOtp,
      register,
      verifyRegisterOtp,
      googleLogin,
      sendOtp,
      verifyOtp,
      verifyFirebaseLogin,
      logout,
      updateUser,
      isAdmin: state.user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

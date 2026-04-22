'use client';
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload.user, token: action.payload.token, loading: false };
    case 'LOGOUT':
      return { user: null, token: null, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string, name?: string) => Promise<void>;
  verifyFirebaseLogin: (idToken: string, phone: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, { user: null, token: null, loading: true });

  useEffect(() => {
    const token = localStorage.getItem('cinebook_token');
    if (token) {
      axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => dispatch({ type: 'SET_USER', payload: { user: res.data.user, token } }))
        .catch(() => { localStorage.removeItem('cinebook_token'); dispatch({ type: 'SET_LOADING', payload: false }); });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const saveAuth = (user: User, token: string) => {
    localStorage.setItem('cinebook_token', token);
    dispatch({ type: 'SET_USER', payload: { user, token } });
  };

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    saveAuth(res.data.user, res.data.token);
  };

  const register = async (name: string, email: string, password: string, phone: string) => {
    await axios.post(`${API}/auth/register`, { name, email, password, phone: `+91${phone}` });
  };

  const googleLogin = async (idToken: string) => {
    const res = await axios.post(`${API}/auth/google`, { idToken });
    saveAuth(res.data.user, res.data.token);
  };

  const sendOtp = async (phone: string) => {
    await axios.post(`${API}/auth/send-otp`, { phone });
  };

  const verifyOtp = async (phone: string, otp: string, name?: string) => {
    const res = await axios.post(`${API}/auth/verify-otp`, { phone, otp, name });
    saveAuth(res.data.user, res.data.token);
  };

  const verifyFirebaseLogin = async (idToken: string, phone: string) => {
    const res = await axios.post(`${API}/auth/verify-firebase`, { idToken, phone });
    saveAuth(res.data.user, res.data.token);
  };

  const logout = () => {
    localStorage.removeItem('cinebook_token');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, googleLogin, sendOtp, verifyOtp, verifyFirebaseLogin, logout, isAdmin: state.user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

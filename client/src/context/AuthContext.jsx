import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);
const IDLE_MS = 30 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('speakup_user') || 'null');
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(false);

  const persist = (data) => {
    if (data.accessToken) localStorage.setItem('speakup_access', data.accessToken);
    if (data.refreshToken) localStorage.setItem('speakup_refresh', data.refreshToken);
    if (data.user) {
      localStorage.setItem('speakup_user', JSON.stringify(data.user));
      setUser(data.user);
    }
  };

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', { refreshToken: localStorage.getItem('speakup_refresh') });
    } catch {
      /* ignore */
    }
    localStorage.removeItem('speakup_access');
    localStorage.removeItem('speakup_refresh');
    localStorage.removeItem('speakup_user');
    setUser(null);
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    if (data.requiresOtp) return data;
    persist(data);
    return data.user;
  };

  const verifyOtp = async (challengeId, otp) => {
    const { data } = await api.post('/auth/verify-otp', { challengeId, otp });
    persist(data);
    return data.user;
  };

  const resendOtp = async (challengeId) => {
    const { data } = await api.post('/auth/resend-otp', { challengeId });
    return data;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
    persist({ user: data.user });
    return data.user;
  };

  useEffect(() => {
    const token = localStorage.getItem('speakup_access');
    if (!token) {
      setReady(true);
      return;
    }
    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('speakup_user', JSON.stringify(data.user));
      })
      .catch(() => logout())
      .finally(() => setReady(true));
  }, [logout]);

  useEffect(() => {
    if (!user) return undefined;
    let timer = setTimeout(logout, IDLE_MS);
    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(logout, IDLE_MS);
    };
    ['click', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, bump));
    return () => {
      clearTimeout(timer);
      ['click', 'keydown', 'touchstart'].forEach((ev) => window.removeEventListener(ev, bump));
    };
  }, [user, logout]);

  const value = useMemo(
    () => ({ user, ready, login, verifyOtp, resendOtp, changePassword, logout, persist }),
    [user, ready, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, setCsrfToken } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const csrf = await apiRequest('/auth/csrf', {
        method: 'GET',
        suppressAuthExpiry: true,
      });
      setCsrfToken(csrf.data.csrfToken);
      const result = await apiRequest('/auth/me', { suppressAuthExpiry: true });
      setUser(result.data.user);
      setSessionExpired(false);
    } catch (error) {
      if (error.status === 401) {
        setUser(null);
      } else {
        setLoadError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setSessionExpired(true);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (email, password) => {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
      suppressAuthExpiry: true,
    });
    setCsrfToken(result.data.csrfToken);
    setUser(result.data.user);
    setSessionExpired(false);
    return result.data.user;
  };

  const logout = async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    setCsrfToken(null);
    setUser(null);
  };

  const changePassword = async (currentPassword, newPassword) => {
    const result = await apiRequest('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
    setCsrfToken(result.data.csrfToken);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      loadError,
      sessionExpired,
      login,
      logout,
      changePassword,
      reload: loadSession,
    }),
    [user, loading, loadError, sessionExpired, loadSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return value;
}

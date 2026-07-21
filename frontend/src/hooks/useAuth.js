import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pulseops_token');
    if (!token) { setLoading(false); return; }
    apiClient.get('/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => localStorage.removeItem('pulseops_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('pulseops_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('pulseops_token');
    setUser(null);
    window.location.href = '/login';
  };

  return { user, loading, login, logout };
}

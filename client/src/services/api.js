import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('speakup_access');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && localStorage.getItem('speakup_refresh')) {
      original._retry = true;
      refreshing =
        refreshing ||
        axios.post('/api/auth/refresh', { refreshToken: localStorage.getItem('speakup_refresh') }).then((res) => {
          localStorage.setItem('speakup_access', res.data.accessToken);
          if (res.data.user) localStorage.setItem('speakup_user', JSON.stringify(res.data.user));
          return res.data.accessToken;
        }).finally(() => {
          refreshing = null;
        });
      try {
        const token = await refreshing;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        localStorage.removeItem('speakup_access');
        localStorage.removeItem('speakup_refresh');
        localStorage.removeItem('speakup_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

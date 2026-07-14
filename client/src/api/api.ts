import axios from 'axios';

export const api = axios.create({
  // Production: set VITE_API_URL to the Render API origin (no trailing slash).
  // Local: client/.env → http://localhost:5000
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
}

import axios from "axios";

// The backend is always served from the same origin as the frontend
// (server.ts serves both together in dev/plain-Node prod, and on Vercel
// vercel.json rewrites /api/* to the serverless function). So the safe
// default is a relative "/api" path, which works out of the box in every
// deployment without needing VITE_API_URL configured. Only set
// VITE_API_URL if the API is genuinely hosted on a different origin.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

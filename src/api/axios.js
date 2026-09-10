import axios from "axios";

// In development, baseURL "/api" is forwarded to the backend by the Vite
// dev proxy (see vite.config.js). In production there's no such proxy —
// the frontend is a static build served separately from the API — so
// VITE_API_URL must be set to the deployed backend's full URL
// (e.g. https://api.sjhahandmade.com/api). See frontend/.env.example.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true, // sends the httpOnly JWT cookie with every request
  headers: { "Content-Type": "application/json" },
});

export default api;

import axios from "axios";

// ─── Token storage (mobile / Safari ITP fallback) ────────────────────────────
// Desktop browsers send the httpOnly cookie automatically (withCredentials).
// Mobile browsers (Safari ITP, some Android WebViews) block cross-origin
// cookies even when SameSite=None; Secure is set. For those, the backend also
// returns the JWT in the response body; we store it in localStorage and inject
// it as an Authorization header so the backend's Bearer fallback picks it up.

const TOKEN_KEY = "auth_token";

export const saveToken  = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = ()      => localStorage.removeItem(TOKEN_KEY);
export const getToken   = ()      => localStorage.getItem(TOKEN_KEY);

// ─── Axios instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true, // sends the httpOnly cookie on browsers that allow it
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — attach stored token as Bearer header when present.
// This is a no-op on desktop where the cookie is sent automatically; it's
// the active auth path on mobile where the cookie is blocked.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — capture the token from login/register/update-password
// responses and persist it so subsequent requests include the Bearer header.
api.interceptors.response.use(
  (response) => {
    const token = response.data?.token;
    if (token) {
      saveToken(token);
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export default api;

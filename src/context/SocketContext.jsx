import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);

// Mirrors the same production gap as api/axios.js: in dev, Vite's proxy
// forwards /socket.io to the backend on the same origin, so no URL is
// needed. In production the API is usually a separate origin, so derive
// the socket server's base URL from VITE_API_URL (stripping the trailing
// /api) rather than assuming same-origin.
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
  : undefined;

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      return;
    }

    // withCredentials sends the httpOnly JWT cookie so the server's
    // socketAuthMiddleware can identify the user.
    const newSocket = io(SOCKET_URL, { withCredentials: true, transports: ["websocket", "polling"] });
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => setConnected(true));
    newSocket.on("disconnect", () => setConnected(false));

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated]);

  const value = { socket, connected };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within a SocketProvider");
  return ctx;
};

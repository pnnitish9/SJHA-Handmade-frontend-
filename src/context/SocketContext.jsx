import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";
import { getToken } from "../api/axios.js";

const SocketContext = createContext(null);

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

    // Pass the stored token in handshake.auth so the socket server can
    // authenticate on mobile where the cookie is blocked by Safari ITP.
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: { token: getToken() },
    });
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

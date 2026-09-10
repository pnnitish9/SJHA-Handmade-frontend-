import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import {
  getMyNotificationsRequest,
  markNotificationReadRequest,
  markAllNotificationsReadRequest,
} from "../api/notifications.js";

const POLL_INTERVAL_MS = 30000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);

  const load = () => {
    getMyNotificationsRequest().then(({ data }) => {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    });
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen((o) => !o);
  };

  const handleItemClick = (notification) => {
    if (!notification.isRead) {
      markNotificationReadRequest(notification._id).then(() => {
        setNotifications((prev) => prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
      });
    }
    setOpen(false);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsReadRequest().then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <button onClick={handleOpen} aria-label="Notifications" className="relative text-ink hover:text-thread">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-thread text-[10px] text-cream">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl bg-cream shadow-xl ring-1 ring-clay/20">
          <div className="flex items-center justify-between border-b border-clay/15 px-4 py-3">
            <p className="text-sm font-medium text-ink">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-thread hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-clay">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n._id}
                  to={n.link || "#"}
                  onClick={() => handleItemClick(n)}
                  className={`block border-b border-clay/10 px-4 py-3 last:border-0 hover:bg-oat ${
                    n.isRead ? "" : "bg-oat/60"
                  }`}
                >
                  <p className="text-sm text-ink">{n.title}</p>
                  <p className="mt-0.5 text-xs text-clay">{n.message}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

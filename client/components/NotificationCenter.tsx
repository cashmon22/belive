import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/lib/notifications";
import type { AppNotification } from "@shared/notifications";

function formatNotificationTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday)
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diff < 7)
    return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationCenter({
  variant = "user",
}: {
  variant?: "user" | "admin";
}) {
  const { notifications, unreadCount, isLoading, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await markRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  const isDark = variant === "user";

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setOpen(!open)}
        className={`relative rounded-md p-2 transition ${
          isDark
            ? "text-white/70 hover:bg-white/10 hover:text-white"
            : "rounded-lg border border-slate-200 text-slate-400 hover:border-orange/40 hover:text-orange"
        }`}
      >
        <Bell size={variant === "admin" ? 17 : 18} />
        {unreadCount > 0 && (
          <span
            className={`absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-orange px-1 text-[9px] font-extrabold text-navy ${
              isDark ? "-right-0.5 -top-0.5" : "right-1 top-1"
            }`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-orange" />
              <h3 className="text-sm font-extrabold text-navy">Notifications</h3>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange px-1.5 text-[10px] font-extrabold text-navy">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-orange transition hover:text-orange-light"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-navy"
                aria-label="Close notifications"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={24} className="mx-auto text-slate-300" />
                <p className="mt-2 text-sm font-bold text-navy">
                  No notifications
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  You&apos;re all caught up.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => void handleNotificationClick(n)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#fbfcfd] ${
                        !n.isRead ? "bg-orange/[0.03]" : ""
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          n.isRead ? "bg-slate-200" : "bg-orange"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs ${
                            n.isRead
                              ? "font-semibold text-slate-600"
                              : "font-extrabold text-navy"
                          }`}
                        >
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {formatNotificationTime(n.createdAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

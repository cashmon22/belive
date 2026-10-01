import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/lib/notifications";
import { ErrorState } from "@/components/skeletons";
import type { AppNotification } from "@shared/notifications";
import { useAuth } from "@/lib/auth";
import { showInAppNotifications } from "@/lib/account-preferences";

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

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-slate-200" />
      <div className="min-w-0 flex-1 space-y-2">
        <span className="block h-3 w-3/4 animate-pulse rounded bg-slate-200" />
        <span className="block h-2.5 w-full animate-pulse rounded bg-slate-100" />
        <span className="block h-2.5 w-2/3 animate-pulse rounded bg-slate-100" />
        <span className="block h-2 w-12 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function NotificationCenter({
  variant = "user",
}: {
  variant?: "user" | "admin";
}) {
  const { notifications, unreadCount, isLoading, error, retry, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { session } = useAuth();
  const notificationsEnabled = showInAppNotifications(session?.user.user_metadata);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        bellRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
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
  if (isDark && !notificationsEnabled) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        ref={bellRef}
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
        className={`relative rounded-md p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-1 ${
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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            role="menu"
            aria-label="Notifications"
          >
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
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-orange transition hover:text-orange-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-1 rounded"
                  >
                    <CheckCheck size={13} /> Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-1"
                  aria-label="Close notifications"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div role="status" aria-live="polite">
                  <div className="divide-y divide-slate-100">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <NotificationSkeleton key={i} />
                    ))}
                  </div>
                </div>
              ) : error ? (
                <ErrorState
                  message="We couldn't load your notifications. Please try again."
                  onRetry={() => void retry()}
                  className="py-10"
                />
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
                <ul className="divide-y divide-slate-100" role="menu">
                  {notifications.map((n) => (
                    <li key={n.id} role="menuitem">
                      <button
                        type="button"
                        onClick={() => void handleNotificationClick(n)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#fbfcfd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange ${
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useT } from "../i18n";
import LanguageSwitcher from "../LanguageSwitcher";
import { fmtDateTime } from "./ui";
import { useDriverLocation } from "./DriverLocationContext";
import {
  fetchUnreadCount, fetchMyNotifications,
  markNotificationRead, markAllNotificationsRead,
} from "../api";

// Sticky top bar for the driver app: brand, language switcher, a polling
// notification bell with an unread badge + dropdown, and logout.
export default function DriverHeader() {
  const { t } = useT();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const { sharing, toggle, mode } = useDriverLocation();

  const loadCount = useCallback(() => {
    fetchUnreadCount().then((d) => setUnread(d.count || 0)).catch(() => {});
  }, []);

  // Poll unread count every 30s (in-app notifications; push comes in Phase 4).
  useEffect(() => {
    loadCount();
    const id = setInterval(loadCount, 30000);
    return () => clearInterval(id);
  }, [loadCount]);

  async function togglePanel() {
    const next = !open;
    setOpen(next);
    if (next) {
      try { setItems(await fetchMyNotifications()); } catch { /* ignore */ }
    }
  }

  async function openNotification(n) {
    try { if (!n.read) await markNotificationRead(n.id); } catch { /* ignore */ }
    setOpen(false);
    loadCount();
    if (n.jobId) navigate(`/driver/jobs/${n.jobId}`);
  }

  async function readAll() {
    try { await markAllNotificationsRead(); } catch { /* ignore */ }
    setItems((list) => list.map((i) => ({ ...i, read: true })));
    loadCount();
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={() => navigate("/driver")} className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <TruckIcon />
          </div>
          <span className="text-slate-50 font-semibold tracking-tight text-base">FleetOps</span>
          <span className="text-[11px] text-slate-500 hidden xs:inline">· {t("driver.brand")}</span>
        </button>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {/* Live location sharing toggle */}
          <button
            onClick={toggle}
            aria-label={t("driver.shareLocation")}
            aria-pressed={sharing}
            title={
              sharing
                ? mode === "sim"
                  ? t("driver.locationSim")
                  : t("driver.locationLive")
                : t("driver.shareLocation")
            }
            className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              sharing
                ? mode === "sim"
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-emerald-500/20 text-emerald-400"
                : "hover:bg-slate-800 text-slate-300"
            }`}
          >
            <PinIcon />
            {sharing && (
              <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-slate-950 ${
                mode === "sim" ? "bg-amber-400" : "bg-emerald-400"
              } animate-pulse`} />
            )}
          </button>

          {/* Notification bell */}
          <button
            onClick={togglePanel}
            aria-label={t("driver.notifications")}
            className="relative w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 transition-colors"
          >
            <BellIcon />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {t("nav.logout")}
          </button>
        </div>
      </div>

      {/* Notification dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-2 sm:right-4 mt-1 w-[min(92vw,22rem)] z-50 bg-slate-950 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
              <span className="text-sm font-semibold text-slate-100">{t("driver.notifications")}</span>
              {items.some((i) => !i.read) && (
                <button onClick={readAll} className="text-[11px] text-amber-400 hover:text-amber-300">
                  {t("driver.markAllRead")}
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-sm text-slate-400 px-3 py-4">{t("driver.noNotifications")}</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => openNotification(n)}
                    className={`w-full text-left px-3 py-2.5 border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 transition-colors ${
                      n.read ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                      <div className={n.read ? "pl-4" : ""}>
                        <div className="text-sm text-slate-200">{n.message}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{fmtDateTime(n.createdAt)}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
      {user?.username && (
        <span className="sr-only">{user.username}</span>
      )}
    </header>
  );
}

function TruckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

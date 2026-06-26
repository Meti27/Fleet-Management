import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { postLocation } from "../api";

const STORAGE_KEY = "fleet_share_location";
const ACTIVE_JOB_KEY = "fleet_active_job";
// Post at most this often, so a chatty GPS doesn't hammer the API.
const MIN_POST_INTERVAL_MS = 8000;
// Demo fallback origin when the device has no usable GPS: central Skopje, NM.
const SKOPJE = { lat: 41.9981, lng: 21.4254 };

const Ctx = createContext(null);

/**
 * Driver-side live location sharing (Phase 3), as a context so the toggle in the
 * header and the Start/Finish buttons in the pages drive one shared tracking
 * session that survives navigation between /driver routes.
 *
 * When sharing is on it watches the device GPS and POSTs throttled pings (tagged
 * with the active job id, when a job is running). If geolocation is unavailable or
 * denied — e.g. a desktop demo — it falls back to a slow simulated walk around
 * Skopje so the pitch always shows a moving truck.
 *
 * Pressing **Start** on a job auto-enables sharing and tags pings with that job;
 * **Finish** stops it. The header pin can also toggle sharing manually (untagged).
 */
export function DriverLocationProvider({ children }) {
  const [sharing, setSharing] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "1"
  );
  const [activeJobId, setActiveJobId] = useState(() => {
    const v = localStorage.getItem(ACTIVE_JOB_KEY);
    return v ? Number(v) : null;
  });
  const [mode, setMode] = useState(null);
  const [error, setError] = useState("");
  const [lastFix, setLastFix] = useState(null);

  const lastPostRef = useRef(0);
  // Read the current job inside the watch callback without restarting the watch.
  const activeJobRef = useRef(activeJobId);
  useEffect(() => { activeJobRef.current = activeJobId; }, [activeJobId]);

  const send = useCallback(async (ping) => {
    const now = Date.now();
    if (now - lastPostRef.current < MIN_POST_INTERVAL_MS) return;
    lastPostRef.current = now;
    try {
      await postLocation({ ...ping, jobId: activeJobRef.current });
      setLastFix({ ...ping, at: new Date() });
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, sharing ? "1" : "0");
    if (!sharing) {
      setMode(null);
      return;
    }

    let watchId = null;
    let simTimer = null;
    let cancelled = false;

    function startSim() {
      if (cancelled) return;
      setMode("sim");
      let lat = SKOPJE.lat;
      let lng = SKOPJE.lng;
      let heading = Math.random() * 360;
      const tick = () => {
        heading = (heading + (Math.random() - 0.5) * 40 + 360) % 360;
        const stepKm = 0.03 + Math.random() * 0.03;
        const rad = (heading * Math.PI) / 180;
        lat += (stepKm / 111) * Math.cos(rad);
        lng += (stepKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(rad);
        send({
          latitude: +lat.toFixed(6),
          longitude: +lng.toFixed(6),
          speedKph: Math.round(20 + Math.random() * 40),
          heading: Math.round(heading),
        });
      };
      tick();
      simTimer = setInterval(tick, MIN_POST_INTERVAL_MS);
    }

    if (!("geolocation" in navigator)) {
      startSim();
    } else {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return;
          setMode("gps");
          const c = pos.coords;
          send({
            latitude: +c.latitude.toFixed(6),
            longitude: +c.longitude.toFixed(6),
            speedKph: c.speed != null ? Math.round(c.speed * 3.6) : null,
            heading: c.heading != null ? Math.round(c.heading) : null,
          });
        },
        (err) => {
          if (cancelled) return;
          setError(err.message);
          startSim();
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    }

    return () => {
      cancelled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (simTimer) clearInterval(simTimer);
    };
  }, [sharing, send]);

  // Persist the active job so a mid-trip reload keeps tagging pings.
  useEffect(() => {
    if (activeJobId == null) localStorage.removeItem(ACTIVE_JOB_KEY);
    else localStorage.setItem(ACTIVE_JOB_KEY, String(activeJobId));
  }, [activeJobId]);

  const toggle = useCallback(() => setSharing((s) => !s), []);

  // Start tracking for a job (called after a successful Start).
  const startForJob = useCallback((jobId) => {
    lastPostRef.current = 0; // allow an immediate first ping
    setActiveJobId(jobId);
    setSharing(true);
  }, []);

  // Stop tracking a job (called after Finish). Only acts if it's the active one.
  const stopForJob = useCallback((jobId) => {
    setActiveJobId((cur) => {
      if (cur === jobId) {
        setSharing(false);
        return null;
      }
      return cur;
    });
  }, []);

  const value = { sharing, toggle, mode, error, lastFix, activeJobId, startForJob, stopForJob };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDriverLocation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDriverLocation must be used inside DriverLocationProvider");
  return ctx;
}

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Client } from "@stomp/stompjs";
import { useT } from "./i18n";
import { fetchLatestLocations, fetchTripEstimate, wsUrl, getToken_ } from "./api";
import { fmtDateTime } from "./driver/ui";

// Default view: North Macedonia.
const NM_CENTER = [41.6086, 21.7453];
const NM_ZOOM = 8;
const TOPIC = "/topic/locations";

// Self-contained truck marker (no image assets → avoids the leaflet+bundler icon issue).
function truckIcon(stale) {
  const color = stale ? "#64748b" : "#f59e0b"; // slate-500 when stale, amber-500 when fresh
  return L.divIcon({
    className: "",
    html: `<div style="width:34px;height:34px;border-radius:9999px;background:${color};
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,.45);border:2px solid #0f172a;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white"
        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

// A position is "stale" if we haven't heard from it in a while.
const STALE_MS = 2 * 60 * 1000;
function isStale(recordedAt) {
  if (!recordedAt) return true;
  return Date.now() - new Date(recordedAt).getTime() > STALE_MS;
}

// Re-fit the map to all markers, but only when the *set* of drivers changes — so
// the view doesn't yank around on every position update.
function FitToDrivers({ locations }) {
  const map = useMap();
  const idsKey = locations.map((l) => l.driverId).sort().join(",");
  const prevKey = useRef("");
  useEffect(() => {
    if (idsKey === prevKey.current || locations.length === 0) return;
    prevKey.current = idsKey;
    const bounds = L.latLngBounds(locations.map((l) => [l.latitude, l.longitude]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
  }, [idsKey, locations, map]);
  return null;
}

export default function LiveMapPage() {
  const { t } = useT();
  // Map of driverId -> latest DriverLocationDto.
  const [byDriver, setByDriver] = useState({});
  const [status, setStatus] = useState("connecting"); // connecting | live | offline
  const [error, setError] = useState("");

  const upsert = (dto) =>
    setByDriver((prev) => ({ ...prev, [dto.driverId]: dto }));

  // Initial snapshot over REST.
  useEffect(() => {
    fetchLatestLocations()
      .then((list) => {
        const next = {};
        list.forEach((d) => { next[d.driverId] = d; });
        setByDriver(next);
      })
      .catch((err) => setError(err.message));
  }, []);

  // Live updates over STOMP/WebSocket.
  useEffect(() => {
    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: { Authorization: `Bearer ${getToken_()}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setStatus("live");
        setError("");
        client.subscribe(TOPIC, (frame) => {
          try { upsert(JSON.parse(frame.body)); } catch { /* ignore malformed */ }
        });
      },
      onWebSocketClose: () => setStatus("offline"),
      onStompError: (f) => setError(f.headers?.message || "STOMP error"),
    });
    client.activate();
    return () => { client.deactivate(); };
  }, []);

  const locations = useMemo(() => Object.values(byDriver), [byDriver]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-50">{t("map.title")}</h1>
          <p className="text-xs text-slate-400">
            {t("map.tracking", { count: locations.length })}
          </p>
        </div>
        <ConnBadge status={status} t={t} />
      </div>

      {error && (
        <p className="px-4 py-1.5 text-xs text-red-400 bg-red-500/5 border-b border-red-500/20">
          {error}
        </p>
      )}

      <div className="flex-1 relative">
        {locations.length === 0 && (
          <div className="absolute inset-0 z-[400] flex items-center justify-center pointer-events-none">
            <span className="text-sm text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg">
              {t("map.noDrivers")}
            </span>
          </div>
        )}
        <MapContainer center={NM_CENTER} zoom={NM_ZOOM} className="w-full h-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToDrivers locations={locations} />
          {locations.map((d) => (
            <Marker
              key={d.driverId}
              position={[d.latitude, d.longitude]}
              icon={truckIcon(isStale(d.recordedAt))}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold text-slate-900">{d.driverName}</div>
                  {d.jobTitle && (
                    <div className="text-slate-600">{t("map.job")}: {d.jobTitle}</div>
                  )}
                  <div className="text-slate-600">
                    {t("map.speed")}: {d.speedKph != null ? `${Math.round(d.speedKph)} km/h` : "—"}
                  </div>
                  <div className="text-slate-500 text-xs mt-1">
                    {t("map.updated")}: {fmtDateTime(d.recordedAt)}
                  </div>
                  {d.jobId != null && <TripInfo jobId={d.jobId} t={t} />}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

// Trip distance + fuel/cost for the marker's job. Mounts when the popup opens.
function TripInfo({ jobId, t }) {
  const [trip, setTrip] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | error

  useEffect(() => {
    let active = true;
    fetchTripEstimate(jobId)
      .then((d) => { if (active) { setTrip(d); setState("ok"); } })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [jobId]);

  if (state === "loading") return <div className="text-slate-400 text-xs mt-2">{t("common.loading")}</div>;
  if (state === "error" || !trip) return null;

  const row = (label, value) => (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  );

  return (
    <div className="mt-2 pt-2 border-t border-slate-200 space-y-0.5 text-xs">
      {row(t("map.distance"), trip.distanceKm != null ? `${trip.distanceKm.toFixed(1)} km` : "—")}
      {row(t("map.avgSpeed"), trip.avgSpeedKph != null ? `${Math.round(trip.avgSpeedKph)} km/h` : "—")}
      {row(t("map.fuelUsed"),
        trip.estimatedLiters != null ? `~${trip.estimatedLiters.toFixed(1)} L` : t("map.noRate"))}
      {trip.estimatedCostEur != null && row(t("map.estCost"), `~€${trip.estimatedCostEur.toFixed(2)}`)}
    </div>
  );
}

function ConnBadge({ status, t }) {
  const map = {
    live: { c: "bg-emerald-500/15 text-emerald-400", dot: "bg-emerald-400", label: t("map.live") },
    connecting: { c: "bg-amber-500/15 text-amber-400", dot: "bg-amber-400", label: t("map.connecting") },
    offline: { c: "bg-slate-700/40 text-slate-400", dot: "bg-slate-500", label: t("map.offline") },
  };
  const s = map[status] || map.offline;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.c}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot} ${status === "live" ? "animate-pulse" : ""}`} />
      {s.label}
    </span>
  );
}

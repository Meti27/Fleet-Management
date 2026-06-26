const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || "/api";

function getToken() {
  return localStorage.getItem("token");
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleError(res, fallbackMessage) {
  const text = await res.text();

  if (!text) {
    throw new Error(fallbackMessage);
  }

  try {
    const data = JSON.parse(text);
    const msg = data.detail || data.message || data.error || fallbackMessage;
    throw new Error(msg);
  } catch {
    throw new Error(text || fallbackMessage);
  }
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) await handleError(res, "Login failed");
  return res.json();
}



export async function fetchJobs() {
  const res = await fetch(`${API_BASE}/jobs`, { headers: authHeaders() });
  if (!res.ok) await handleError(res, "Failed to fetch jobs");
  return res.json();
}

export async function fetchDrivers() {
  const res = await fetch(`${API_BASE}/drivers`, { headers: authHeaders() });
  if (!res.ok) await handleError(res, "Failed to fetch drivers");
  return res.json();
}

export async function fetchTrucks() {
  const res = await fetch(`${API_BASE}/trucks`, { headers: authHeaders() });
  if (!res.ok) await handleError(res, "Failed to fetch trucks");
  return res.json();
}

export async function createJob(jobData) {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(jobData),
  });

  if (!res.ok) await handleError(res, "Failed to create job");
  return res.json();
}

export async function createDriver(driverData) {
  const res = await fetch(`${API_BASE}/drivers`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(driverData),
  });

  if (!res.ok) await handleError(res, "Failed to create driver");
  return res.json();
}

export async function createTruck(truckData) {
  const res = await fetch(`${API_BASE}/trucks`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(truckData),
  });

  if (!res.ok) await handleError(res, "Failed to create truck");
  return res.json();
}

export async function updateJob(jobId, jobData) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(jobData),
  });

  if (!res.ok) await handleError(res, "Failed to update job");
  return res.json();
}

export async function deleteJob(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) await handleError(res, "Failed to delete job");
  return true;
}

export async function fetchJobHistory(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/history`, {
    headers: authHeaders(),
  });
  if (!res.ok) await handleError(res, "Failed to fetch job history");
  return res.json();
}

export async function updateJobStatus(jobId, status) {
  const res = await fetch(
    `${API_BASE}/jobs/${jobId}/status?status=${encodeURIComponent(status)}`,
    { method: "PATCH", headers: authHeaders() }
  );

  if (!res.ok) await handleError(res, "Failed to update status");
  return res.json();
}

export async function fetchDashboardSummary() {
  const res = await fetch(`${API_BASE}/dashboard/summary`, {
    headers: authHeaders(),
  });
  if (!res.ok) await handleError(res, "Failed to fetch dashboard summary");
  return res.json();
}

export async function updateDriver(driverId, driverData) {
  const res = await fetch(`${API_BASE}/drivers/${driverId}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(driverData),
  });

  if (!res.ok) await handleError(res, "Failed to update driver");
  return res.json();
}

export async function deleteDriver(driverId) {
  const res = await fetch(`${API_BASE}/drivers/${driverId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) await handleError(res, "Failed to delete driver");
  return true;
}

export async function updateTruck(truckId, truckData) {
  const res = await fetch(`${API_BASE}/trucks/${truckId}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(truckData),
  });

  if (!res.ok) await handleError(res, "Failed to update truck");
  return res.json();
}

export async function deleteTruck(truckId) {
  const res = await fetch(`${API_BASE}/trucks/${truckId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) await handleError(res, "Failed to delete truck");
  return true;
}

// ---------------------------------------------------------------------------
// Fleet maintenance (Phase 1): fuel, maintenance, odometer, documents,
// preventive schedules, reminders. All truck-scoped except fleet reminders.
// ---------------------------------------------------------------------------

async function apiGet(path, fallback) {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) await handleError(res, fallback);
  return res.json();
}

async function apiPost(path, body, fallback) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) await handleError(res, fallback);
  return res.json();
}

async function apiPut(path, body, fallback) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) await handleError(res, fallback);
  return res.json();
}

async function apiDelete(path, fallback) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) await handleError(res, fallback);
  return true;
}

export const fetchReminders = () =>
  apiGet(`/reminders`, "Failed to load reminders");

export const fetchTruck = (id) =>
  apiGet(`/trucks/${id}`, "Failed to load truck");
export const fetchTruckSummary = (id) =>
  apiGet(`/trucks/${id}/summary`, "Failed to load truck summary");
export const fetchTruckReminders = (id) =>
  apiGet(`/trucks/${id}/reminders`, "Failed to load reminders");

export const fetchFuelLogs = (id) =>
  apiGet(`/trucks/${id}/fuel-logs`, "Failed to load fuel logs");
export const addFuelLog = (id, data) =>
  apiPost(`/trucks/${id}/fuel-logs`, data, "Failed to add fuel log");
export const deleteFuelLog = (id, logId) =>
  apiDelete(`/trucks/${id}/fuel-logs/${logId}`, "Failed to delete fuel log");

export const fetchMaintenance = (id) =>
  apiGet(`/trucks/${id}/maintenance`, "Failed to load maintenance");
export const addMaintenance = (id, data) =>
  apiPost(`/trucks/${id}/maintenance`, data, "Failed to add maintenance record");
export const deleteMaintenance = (id, recId) =>
  apiDelete(`/trucks/${id}/maintenance/${recId}`, "Failed to delete record");

export const fetchOdometer = (id) =>
  apiGet(`/trucks/${id}/odometer`, "Failed to load odometer readings");
export const addOdometer = (id, data) =>
  apiPost(`/trucks/${id}/odometer`, data, "Failed to add odometer reading");

export const fetchDocuments = (id) =>
  apiGet(`/trucks/${id}/documents`, "Failed to load documents");
export const addDocument = (id, data) =>
  apiPost(`/trucks/${id}/documents`, data, "Failed to add document");
export const deleteDocument = (id, docId) =>
  apiDelete(`/trucks/${id}/documents/${docId}`, "Failed to delete document");

export const fetchSchedules = (id) =>
  apiGet(`/trucks/${id}/schedules`, "Failed to load schedules");
export const upsertSchedule = (id, data) =>
  apiPut(`/trucks/${id}/schedules`, data, "Failed to save schedule");
export const deleteSchedule = (id, schedId) =>
  apiDelete(`/trucks/${id}/schedules/${schedId}`, "Failed to delete schedule");

// ---------------------------------------------------------------------------
// Driver app (Phase 2): the logged-in driver's own jobs + notifications.
// ---------------------------------------------------------------------------

export const fetchMyJobs = () =>
  apiGet(`/driver/me/jobs`, "Failed to load your jobs");
export const startJob = (id) =>
  apiPost(`/driver/jobs/${id}/start`, {}, "Failed to start job");
export const finishJob = (id) =>
  apiPost(`/driver/jobs/${id}/finish`, {}, "Failed to finish job");

// Driver posts their current GPS position (Phase 3 — live tracking).
export const postLocation = (ping) =>
  apiPost(`/driver/location`, ping, "Failed to report location");

export const fetchMyNotifications = () =>
  apiGet(`/driver/me/notifications`, "Failed to load notifications");
export const fetchUnreadCount = () =>
  apiGet(`/driver/me/notifications/unread-count`, "Failed to load notifications");
export const markNotificationRead = (id) =>
  apiPost(`/driver/notifications/${id}/read`, {}, "Failed to update notification");
export const markAllNotificationsRead = () =>
  apiPost(`/driver/notifications/read-all`, {}, "Failed to update notifications");

// ---------------------------------------------------------------------------
// Live GPS tracking (Phase 3): admin live map. Initial snapshot over REST, then
// real-time updates over the STOMP/WebSocket topic /topic/locations.
// ---------------------------------------------------------------------------

export const fetchLatestLocations = () =>
  apiGet(`/locations/latest`, "Failed to load live locations");

// GPS distance + fuel/cost estimate for one job's trip.
export const fetchTripEstimate = (jobId) =>
  apiGet(`/locations/job/${jobId}/trip`, "Failed to load trip estimate");

export function getToken_() {
  return getToken();
}

/**
 * STOMP endpoint URL. Mirrors API_BASE: when VITE_API_BASE points straight at the
 * backend (prod-direct), derive ws(s)://<that host>/ws; otherwise connect to the
 * current origin and let the Vite dev proxy / nginx upgrade /ws.
 */
export function wsUrl() {
  const base = import.meta.env.VITE_API_BASE?.replace(/\/$/, "");
  if (base && /^https?:\/\//i.test(base)) {
    const u = new URL(base);
    const proto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${u.host}/ws`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

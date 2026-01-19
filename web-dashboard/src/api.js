const API_BASE = "/api";

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

// ✅ NEW: Login endpoint (adjust path if needed)
export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    await handleError(res, "Login failed");
  }

  // your backend returns {token, username, role}
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

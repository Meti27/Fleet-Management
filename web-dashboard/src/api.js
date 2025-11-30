const API_BASE = "http://localhost:8080/api";


async function handleError(res, fallbackMessage) {
  const text = await res.text();

  if (!text) {
    throw new Error(fallbackMessage);
  }

  try {
    const data = JSON.parse(text);
    const msg =
      data.detail ||
      data.message ||
      data.error ||
      fallbackMessage;
    throw new Error(msg);
  } catch {
    // not JSON, just return raw text
    throw new Error(text || fallbackMessage);
  }
}


export async function fetchJobs() {
  const res = await fetch(`${API_BASE}/jobs`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

export async function fetchDrivers() {
  const res = await fetch(`${API_BASE}/drivers`);
  if (!res.ok) throw new Error("Failed to fetch drivers");
  return res.json();
}

export async function fetchTrucks() {
  const res = await fetch(`${API_BASE}/trucks`);
  if (!res.ok) throw new Error("Failed to fetch trucks");
  return res.json();
}

export async function createJob(jobData) {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(jobData),
  });

  if (!res.ok) {
    await handleError(res, "Failed to create job");
  }

  return res.json();
}
export async function createDriver(driverData) {
  const res = await fetch(`${API_BASE}/drivers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(driverData),
  });

  if (!res.ok) throw new Error("Failed to create driver");
  return res.json();
}

export async function createTruck(truckData) {
  const res = await fetch(`${API_BASE}/trucks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(truckData),
  });

  if (!res.ok) throw new Error("Failed to create truck");
  return res.json();
}



export async function updateJob(jobId, jobData) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(jobData),
  });

  if (!res.ok) {
    await handleError(res, "Failed to update job");
  }

  return res.json();
}



export async function deleteJob(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    await handleError(res, "Failed to delete job");
  }

  return true;
}



export async function fetchJobHistory(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/history`);
  if (!res.ok) throw new Error("Failed to fetch job history");
  return res.json();
}


export async function updateJobStatus(jobId, status) {
  const res = await fetch(
    `${API_BASE}/jobs/${jobId}/status?status=${encodeURIComponent(status)}`,
    { method: "PATCH" }
  );

  if (!res.ok) {
    await handleError(res, "Failed to update status");
  }

  return res.json();
}

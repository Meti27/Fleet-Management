import { useEffect, useState } from "react";
import { fetchDashboardSummary, fetchJobs } from "./api";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [summaryData, jobsData] = await Promise.all([
          fetchDashboardSummary(),
          fetchJobs(),
        ]);
        setSummary(summaryData);
        setJobs(jobsData);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-slate-300">Loading dashboard...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-red-400">{error || "No data"}</p>
      </div>
    );
  }

  // ---- DATA DERIVATIONS ----

  const jobsStatusData = [
    { name: "Active", value: summary.activeJobs },
    { name: "Completed", value: summary.completedJobs },
    { name: "Cancelled", value: summary.cancelledJobs },
  ];

  const revenueData = [
    { name: "Total", value: summary.totalRevenue },
    { name: "Last 30 days", value: summary.revenueLast30Days },
  ];

  const busyDrivers =
    summary.totalDrivers > 0
      ? summary.totalDrivers - summary.availableDrivers
      : 0;
  const busyTrucks =
    summary.totalTrucks > 0
      ? summary.totalTrucks - summary.availableTrucks
      : 0;

  const driverUtil =
    summary.totalDrivers > 0
      ? Math.round((busyDrivers / summary.totalDrivers) * 100)
      : 0;

  const truckUtil =
    summary.totalTrucks > 0
      ? Math.round((busyTrucks / summary.totalTrucks) * 100)
      : 0;

  const todayActiveJobs = getTodayActiveJobs(jobs);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">
            Fleet Dashboard
          </h1>
          <p className="text-slate-400 text-sm md:text-base mt-1">
            Overview of your drivers, trucks, and jobs in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <SmallStat title="Total Jobs" value={summary.totalJobs} />
          <SmallStat title="Active Jobs" value={summary.activeJobs} />
        </div>
      </header>

      {/* Stat cards + Utilization */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <StatCard
          title="Drivers"
          main={summary.totalDrivers}
          pill={`Available: ${summary.availableDrivers}`}
        />
        <StatCard
          title="Trucks"
          main={summary.totalTrucks}
          pill={`Available: ${summary.availableTrucks}`}
        />
        <StatCard
          title="Completed Jobs"
          main={summary.completedJobs}
          accent="text-emerald-300"
        />
        <StatCard
          title="Cancelled Jobs"
          main={summary.cancelledJobs}
          accent="text-red-300"
        />
      </section>

      {/* Utilization chips */}
      <section className="flex flex-wrap gap-3">
        <UtilChip
          label="Truck Utilization"
          used={busyTrucks}
          total={summary.totalTrucks}
          percent={truckUtil}
        />
        <UtilChip
          label="Driver Utilization"
          used={busyDrivers}
          total={summary.totalDrivers}
          percent={driverUtil}
        />
      </section>

      {/* Charts grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs by status chart */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Jobs by Status
            </h2>
            <span className="text-[11px] text-slate-500">
              Active / Completed / Cancelled
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={jobsStatusData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue chart */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Revenue Overview
            </h2>
            <span className="text-[11px] text-slate-500">
              EUR · Completed jobs only
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  formatter={(value) => [`${value.toFixed(2)} €`, "Revenue"]}
                  contentStyle={{
                    backgroundColor: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-400">
            <span>Total: {summary.totalRevenue.toFixed(2)} €</span>
            <span>Last 30 days: {summary.revenueLast30Days.toFixed(2)} €</span>
          </div>
        </div>
      </section>

      {/* Active jobs today */}
      <section className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Active Jobs Today
          </h2>
          <span className="text-[11px] text-slate-500">
            Showing up to 5 active jobs
          </span>
        </div>

        {todayActiveJobs.length === 0 ? (
          <p className="text-sm text-slate-400">
            No active jobs for today.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="py-2 pr-3">Job</th>
                  <th className="py-2 px-3">Driver</th>
                  <th className="py-2 px-3">Truck</th>
                  <th className="py-2 px-3">Pickup</th>
                  <th className="py-2 px-3">Dropoff</th>
                  <th className="py-2 pl-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayActiveJobs.slice(0, 5).map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-slate-800 last:border-b-0"
                    onClick={() => navigate(`/jobs?jobId=${job.id}`)}
                  >
                    <td className="py-2 pr-3">
                      <div className="font-medium text-slate-100">
                        #{job.id} {job.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {job.pickupLocation} → {job.dropoffLocation}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-200">
                      {job.driver ? job.driver.name : "-"}
                    </td>
                    <td className="py-2 px-3 text-slate-200">
                      {job.truck ? job.truck.plateNumber : "-"}
                    </td>
                    <td className="py-2 px-3 text-slate-200">
                      {formatTime(job.pickupTime)}
                    </td>
                    <td className="py-2 px-3 text-slate-200">
                      {formatTime(job.dropoffTime)}
                    </td>
                    <td className="py-2 pl-3">
                      <StatusBadge status={job.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ---- helpers & subcomponents ----

function SmallStat({ title, value }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300">
      <div className="uppercase tracking-wide text-slate-500 text-[10px]">
        {title}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function StatCard({ title, main, pill, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
        {title}
      </div>
      <div className={`text-2xl font-semibold ${accent || "text-slate-50"}`}>
        {main}
      </div>
      {pill && (
        <div className="mt-2 inline-flex text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-300">
          {pill}
        </div>
      )}
    </div>
  );
}

function UtilChip({ label, used, total, percent }) {
  return (
    <div className="inline-flex items-center gap-3 px-3 py-2 rounded-full bg-slate-900 border border-slate-700 text-xs">
      <span className="text-slate-300">{label}</span>
      <span className="text-slate-400">
        {used}/{total} in use
      </span>
      <span className="text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-200">
        {percent}%
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  if (!status) {
    return (
      <span className="inline-flex text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-300">
        UNKNOWN
      </span>
    );
  }
  const s = status.toUpperCase();
  let cls = "bg-slate-800 text-slate-200";
  if (s === "DONE") cls = "bg-emerald-500/20 text-emerald-300";
  else if (s === "CANCELLED") cls = "bg-red-500/20 text-red-300";
  else if (s === "IN_PROGRESS" || s === "ASSIGNED" || s === "OPEN")
    cls = "bg-amber-500/20 text-amber-300";

  return (
    <span className={`inline-flex text-[11px] px-2 py-1 rounded-full ${cls}`}>
      {s}
    </span>
  );
}

function getTodayActiveJobs(jobs) {
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  return jobs.filter((j) => {
    if (!isActiveStatus(j.status)) return false;
    if (!j.pickupTime) return false;
    // j.pickupTime like "2025-11-30T10:00:00"
    return j.pickupTime.startsWith(todayStr);
  });
}

function isActiveStatus(status) {
  if (!status) return false;
  const s = status.toUpperCase();
  return s === "OPEN" || s === "ASSIGNED" || s === "IN_PROGRESS";
}

function formatTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value; // fallback raw
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

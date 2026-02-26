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
    { name: "Last 30d", value: summary.revenueLast30Days },
  ];

  const busyDrivers =
    summary.totalDrivers > 0 ? summary.totalDrivers - summary.availableDrivers : 0;
  const busyTrucks =
    summary.totalTrucks > 0 ? summary.totalTrucks - summary.availableTrucks : 0;

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
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-8 space-y-5 sm:space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-50 leading-tight">
            Fleet Dashboard
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Overview of your drivers, trucks, and jobs in one place.
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <SmallStat title="Total Jobs" value={summary.totalJobs} />
          <SmallStat title="Active Jobs" value={summary.activeJobs} />
        </div>
      </header>

      {/* Stat cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Drivers"
          main={summary.totalDrivers}
          pill={`Avail: ${summary.availableDrivers}`}
        />
        <StatCard
          title="Trucks"
          main={summary.totalTrucks}
          pill={`Avail: ${summary.availableTrucks}`}
        />
        <StatCard
          title="Completed"
          main={summary.completedJobs}
          accent="text-emerald-300"
        />
        <StatCard
          title="Cancelled"
          main={summary.cancelledJobs}
          accent="text-red-300"
        />
      </section>

      {/* Utilization chips */}
      <section className="flex flex-col xs:flex-row flex-wrap gap-2 sm:gap-3">
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
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Jobs by status */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 sm:p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-100">Jobs by Status</h2>
            <span className="text-[10px] sm:text-[11px] text-slate-500 hidden xs:block">
              Active / Completed / Cancelled
            </span>
          </div>
          <div className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={jobsStatusData}
                margin={{ top: 10, right: 8, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 sm:p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-100">Revenue Overview</h2>
            <span className="text-[10px] sm:text-[11px] text-slate-500 hidden xs:block">
              EUR · Completed jobs only
            </span>
          </div>
          <div className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueData}
                margin={{ top: 10, right: 8, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [`${value.toFixed(2)} €`, "Revenue"]}
                  contentStyle={{
                    backgroundColor: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Bar dataKey="value" fill="#34d399" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-1 text-xs text-slate-400">
            <span>Total: {summary.totalRevenue.toFixed(2)} €</span>
            <span>Last 30d: {summary.revenueLast30Days.toFixed(2)} €</span>
          </div>
        </div>
      </section>

      {/* Active jobs today */}
      <section className="bg-slate-900 border border-slate-700 rounded-xl p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-100">Active Jobs Today</h2>
          <span className="text-[10px] sm:text-[11px] text-slate-500">Up to 5 jobs</span>
        </div>

        {todayActiveJobs.length === 0 ? (
          <p className="text-sm text-slate-400">No active jobs for today.</p>
        ) : (
          <>
            {/* Desktop table — hidden on mobile */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-700">
                    <th className="py-2 pr-3 font-medium">Job</th>
                    <th className="py-2 px-3 font-medium">Driver</th>
                    <th className="py-2 px-3 font-medium">Truck</th>
                    <th className="py-2 px-3 font-medium">Pickup</th>
                    <th className="py-2 px-3 font-medium">Dropoff</th>
                    <th className="py-2 pl-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayActiveJobs.slice(0, 5).map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800/40 cursor-pointer transition-colors"
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

            {/* Mobile cards — shown only on small screens */}
            <div className="sm:hidden flex flex-col gap-2">
              {todayActiveJobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  onClick={() => navigate(`/jobs?jobId=${job.id}`)}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 cursor-pointer active:bg-slate-800 transition-colors"
                >
                  {/* Top row: title + status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-100">
                        #{job.id} {job.title}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {job.pickupLocation} → {job.dropoffLocation}
                      </div>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                  {/* Bottom row: meta info */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <div>
                      <span className="text-slate-500 uppercase tracking-wide">Driver</span>
                      <div className="text-slate-300">{job.driver ? job.driver.name : "—"}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wide">Truck</span>
                      <div className="text-slate-300">{job.truck ? job.truck.plateNumber : "—"}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wide">Pickup</span>
                      <div className="text-slate-300">{formatTime(job.pickupTime)}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wide">Dropoff</span>
                      <div className="text-slate-300">{formatTime(job.dropoffTime)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// ---- Sub-components ----

function SmallStat({ title, value }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 min-w-0">
      <div className="uppercase tracking-wide text-slate-500 text-[10px] whitespace-nowrap">
        {title}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function StatCard({ title, main, pill, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 sm:p-4 flex flex-col justify-between">
      <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-500 mb-1">
        {title}
      </div>
      <div className={`text-2xl sm:text-3xl font-semibold ${accent || "text-slate-50"}`}>
        {main}
      </div>
      {pill && (
        <div className="mt-2 inline-flex text-[10px] sm:text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-300 w-fit">
          {pill}
        </div>
      )}
    </div>
  );
}

function UtilChip({ label, used, total, percent }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-full bg-slate-900 border border-slate-700 text-xs w-full xs:w-auto">
      <span className="text-slate-300 font-medium">{label}</span>
      <span className="text-slate-400">{used}/{total}</span>
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 ml-auto xs:ml-0">
        {percent}%
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  if (!status) {
    return (
      <span className="inline-flex text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-300 whitespace-nowrap">
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
    <span className={`inline-flex text-[11px] px-2 py-1 rounded-full whitespace-nowrap ${cls}`}>
      {s}
    </span>
  );
}

function getTodayActiveJobs(jobs) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return jobs.filter((j) => {
    if (!isActiveStatus(j.status)) return false;
    if (!j.pickupTime) return false;
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
  if (isNaN(d.getTime())) return value;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
import { useEffect, useState } from "react";
import { fetchDashboardSummary, fetchJobs, fetchReminders } from "./api";
import { useNavigate } from "react-router-dom";
import { useT } from "./i18n";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const COLORS = {
  active: "#f59e0b",
  completed: "#34d399",
  cancelled: "#f87171",
  revenue: "#34d399",
};

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { t } = useT();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [summaryData, jobsData, remindersData] = await Promise.all([
          fetchDashboardSummary(),
          fetchJobs(),
          fetchReminders().catch(() => []),
        ]);
        setSummary(summaryData);
        setJobs(jobsData);
        setReminders(remindersData);
        setError("");
      } catch (err) {
        console.error(err);
        setError(t("dashboard.failedLoad"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-slate-300">{t("common.loading")}</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-red-400">{error || t("dashboard.noData")}</p>
      </div>
    );
  }

  // ---- DATA DERIVATIONS ----
  const statusData = [
    { name: t("dashboard.active"), value: summary.activeJobs, color: COLORS.active },
    { name: t("dashboard.completed"), value: summary.completedJobs, color: COLORS.completed },
    { name: t("dashboard.cancelled"), value: summary.cancelledJobs, color: COLORS.cancelled },
  ].filter((d) => d.value > 0);

  const revenueTrend = weeklyRevenue(jobs, 8);

  const busyDrivers = Math.max(0, summary.totalDrivers - summary.availableDrivers);
  const busyTrucks = Math.max(0, summary.totalTrucks - summary.availableTrucks);
  const driverUtil = summary.totalDrivers > 0 ? Math.round((busyDrivers / summary.totalDrivers) * 100) : 0;
  const truckUtil = summary.totalTrucks > 0 ? Math.round((busyTrucks / summary.totalTrucks) * 100) : 0;

  const todayActiveJobs = getTodayActiveJobs(jobs);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-8 space-y-5 sm:space-y-7">
      {/* Header */}
      <header>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-50 leading-tight">
          {t("dashboard.title")}
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">{t("dashboard.subtitle")}</p>
      </header>

      {/* KPI cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label={t("dashboard.revenueTotal")}
          value={`${fmtEur(summary.totalRevenue)} €`}
          sub={`${t("dashboard.last30d")}: ${fmtEur(summary.revenueLast30Days)} €`}
          accent="emerald"
        />
        <KpiCard
          label={t("dashboard.activeJobs")}
          value={summary.activeJobs}
          sub={`${t("dashboard.totalJobs")}: ${summary.totalJobs}`}
          accent="amber"
        />
        <KpiCard
          label={t("dashboard.drivers")}
          value={summary.totalDrivers}
          sub={`${t("dashboard.avail")}: ${summary.availableDrivers}`}
          accent="sky"
        />
        <KpiCard
          label={t("dashboard.trucks")}
          value={summary.totalTrucks}
          sub={`${t("dashboard.avail")}: ${summary.availableTrucks}`}
          accent="violet"
        />
      </section>

      {/* Charts: revenue trend + status donut */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Revenue trend */}
        <Card className="lg:col-span-2">
          <CardHead title={t("dashboard.revenueTrend")} hint={t("dashboard.revenueHint")} />
          <div className="h-56 sm:h-64 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.revenue} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={COLORS.revenue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  width={44}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                />
                <Tooltip
                  cursor={{ stroke: "#334155" }}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#cbd5e1" }}
                  formatter={(value) => [`${fmtEur(value)} €`, t("dashboard.revenue")]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={COLORS.revenue}
                  strokeWidth={2.5}
                  fill="url(#revFill)"
                  dot={{ r: 2.5, fill: COLORS.revenue, strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Jobs by status donut */}
        <Card>
          <CardHead title={t("dashboard.jobsByStatus")} />
          <div className="relative h-56 sm:h-64">
            {statusData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                {t("dashboard.noData")}
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="62%"
                      outerRadius="86%"
                      paddingAngle={3}
                      stroke="none"
                    >
                      {statusData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center total */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl sm:text-3xl font-semibold text-slate-50">
                    {summary.totalJobs}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">
                    {t("dashboard.totalJobs")}
                  </span>
                </div>
              </>
            )}
          </div>
          {/* Legend */}
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {statusData.map((d) => (
              <span key={d.name} className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                {d.name} <span className="text-slate-300 font-medium">{d.value}</span>
              </span>
            ))}
          </div>
        </Card>
      </section>

      {/* Fleet utilization */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <Card>
          <CardHead title={t("dashboard.fleetUtilization")} />
          <div className="space-y-4 pt-1">
            <UtilBar label={t("dashboard.truckUtil")} used={busyTrucks} total={summary.totalTrucks} percent={truckUtil} color={COLORS.active} />
            <UtilBar label={t("dashboard.driverUtil")} used={busyDrivers} total={summary.totalDrivers} percent={driverUtil} color="#38bdf8" />
          </div>
        </Card>

        {/* Fleet alerts */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-100">{t("dashboard.fleetAlerts")}</h2>
            {reminders.length > 0 && (
              <span className="text-[10px] sm:text-[11px] text-slate-500">
                {t("dashboard.overdueCount", { n: reminders.filter((r) => r.status === "OVERDUE").length })} ·{" "}
                {t("dashboard.dueSoonCount", { n: reminders.filter((r) => r.status === "DUE_SOON").length })}
              </span>
            )}
          </div>
          {reminders.length === 0 ? (
            <p className="text-sm text-slate-500">{t("dashboard.noAlerts")}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {reminders.slice(0, 5).map((r, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/trucks/${r.truckId}`)}
                  className="flex items-center gap-2 sm:gap-3 text-left px-2 py-1.5 rounded-lg hover:bg-slate-800/50 transition-colors"
                >
                  <span
                    className={`inline-flex text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                      r.status === "OVERDUE" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {r.status === "OVERDUE" ? t("status.OVERDUE") : t("status.DUE_SOON")}
                  </span>
                  <span className="text-xs text-slate-200 font-medium whitespace-nowrap">{r.plateNumber}</span>
                  <span className="text-xs text-slate-400 truncate">{r.message}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* Active jobs today */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-100">{t("dashboard.activeJobsToday")}</h2>
          <span className="text-[10px] sm:text-[11px] text-slate-500">{t("dashboard.upTo5")}</span>
        </div>

        {todayActiveJobs.length === 0 ? (
          <p className="text-sm text-slate-400">{t("dashboard.noActiveToday")}</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-700 text-xs uppercase tracking-wide">
                    <th className="py-2 pr-3 font-medium">{t("dashboard.job")}</th>
                    <th className="py-2 px-3 font-medium">{t("dashboard.driver")}</th>
                    <th className="py-2 px-3 font-medium">{t("dashboard.truck")}</th>
                    <th className="py-2 px-3 font-medium">{t("dashboard.pickup")}</th>
                    <th className="py-2 px-3 font-medium">{t("dashboard.dropoff")}</th>
                    <th className="py-2 pl-3 font-medium">{t("dashboard.status")}</th>
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
                        <div className="font-medium text-slate-100">#{job.id} {job.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {job.pickupLocation} → {job.dropoffLocation}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-200">{job.driver ? job.driver.name : "—"}</td>
                      <td className="py-2 px-3 text-slate-200">{job.truck ? job.truck.plateNumber : "—"}</td>
                      <td className="py-2 px-3 text-slate-200">{formatTime(job.pickupTime)}</td>
                      <td className="py-2 px-3 text-slate-200">{formatTime(job.dropoffTime)}</td>
                      <td className="py-2 pl-3"><StatusBadge status={job.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden flex flex-col gap-2">
              {todayActiveJobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  onClick={() => navigate(`/jobs?jobId=${job.id}`)}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 cursor-pointer active:bg-slate-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-100">#{job.id} {job.title}</span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {job.pickupLocation} → {job.dropoffLocation}
                      </div>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <Meta label={t("dashboard.driver")} value={job.driver ? job.driver.name : "—"} />
                    <Meta label={t("dashboard.truck")} value={job.truck ? job.truck.plateNumber : "—"} />
                    <Meta label={t("dashboard.pickup")} value={formatTime(job.pickupTime)} />
                    <Meta label={t("dashboard.dropoff")} value={formatTime(job.dropoffTime)} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ---- Sub-components ----

function Card({ children, className = "" }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

function CardHead({ title, hint }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      {hint && <span className="text-[10px] sm:text-[11px] text-slate-500 hidden xs:block">{hint}</span>}
    </div>
  );
}

const ACCENTS = {
  emerald: "text-emerald-400 bg-emerald-400",
  amber: "text-amber-400 bg-amber-400",
  sky: "text-sky-400 bg-sky-400",
  violet: "text-violet-400 bg-violet-400",
};

function KpiCard({ label, value, sub, accent = "emerald" }) {
  const [text, bg] = (ACCENTS[accent] || ACCENTS.emerald).split(" ");
  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 overflow-hidden">
      <span className={`absolute left-0 top-0 h-full w-1 ${bg} opacity-80`} />
      <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-xl sm:text-2xl font-semibold mt-1 ${text === "text-emerald-400" ? "text-slate-50" : "text-slate-50"}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function UtilBar({ label, used, total, percent, color }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="text-slate-400">
          {used}/{total} · <span className="text-slate-200 font-medium">{percent}%</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <span className="text-slate-500 uppercase tracking-wide">{label}</span>
      <div className="text-slate-300">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const { t } = useT();
  if (!status) {
    return (
      <span className="inline-flex text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-300 whitespace-nowrap">
        {t("status.UNKNOWN")}
      </span>
    );
  }
  const s = status.toUpperCase();
  let cls = "bg-slate-800 text-slate-200";
  if (s === "DONE") cls = "bg-emerald-500/20 text-emerald-300";
  else if (s === "CANCELLED") cls = "bg-red-500/20 text-red-300";
  else if (s === "IN_PROGRESS" || s === "ASSIGNED" || s === "OPEN") cls = "bg-amber-500/20 text-amber-300";

  return (
    <span className={`inline-flex text-[11px] px-2 py-1 rounded-full whitespace-nowrap ${cls}`}>
      {t(`status.${s}`)}
    </span>
  );
}

// ---- Helpers ----

const tooltipStyle = {
  backgroundColor: "#020617",
  border: "1px solid #1e293b",
  borderRadius: "0.5rem",
  fontSize: "0.75rem",
};

function fmtEur(n) {
  return Math.round(Number(n) || 0).toLocaleString();
}

// Monday-start of the week containing `d`.
function weekStart(d) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

// Revenue from DONE jobs bucketed into the last `weeks` calendar weeks.
function weeklyRevenue(jobs, weeks) {
  const MS_WEEK = 7 * 24 * 3600 * 1000;
  const thisWeek = weekStart(new Date());
  const starts = [];
  for (let i = weeks - 1; i >= 0; i--) starts.push(new Date(thisWeek.getTime() - i * MS_WEEK));

  const totals = new Map(starts.map((s) => [s.getTime(), 0]));
  jobs.forEach((j) => {
    if ((j.status || "").toUpperCase() !== "DONE") return;
    const when = j.dropoffTime || j.pickupTime;
    if (!when) return;
    const key = weekStart(new Date(when)).getTime();
    if (totals.has(key)) totals.set(key, totals.get(key) + (Number(j.priceEur) || 0));
  });

  return starts.map((s) => ({
    label: s.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    value: Math.round(totals.get(s.getTime())),
  }));
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
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

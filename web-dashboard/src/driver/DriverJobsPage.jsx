import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useT } from "../i18n";
import { fetchMyJobs, startJob, finishJob } from "../api";
import DriverHeader from "./DriverHeader";
import { useDriverLocation } from "./DriverLocationContext";
import { StatusBadge, fmtDateTime } from "./ui";

export default function DriverJobsPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const { startForJob, stopForJob } = useDriverLocation();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      setLoading(true);
      setJobs(await fetchMyJobs());
      setError("");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function act(action, jobId) {
    setBusyId(jobId);
    try {
      await action(jobId);
      // Starting a job begins location sharing tagged to it; finishing stops it.
      if (action === startJob) startForJob(jobId);
      if (action === finishJob) stopForJob(jobId);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <DriverHeader />
      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-5 space-y-4">
        <h1 className="text-xl font-semibold text-slate-50">{t("driver.myJobs")}</h1>

        {loading ? (
          <p className="text-sm text-slate-400">{t("common.loading")}</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-slate-400">{t("driver.noJobsAssigned")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <div key={job.id} className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <button onClick={() => navigate(`/driver/jobs/${job.id}`)} className="text-left">
                    <div className="text-base font-semibold text-slate-100">{job.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {job.pickupLocation} → {job.dropoffLocation}
                    </div>
                  </button>
                  <StatusBadge status={job.status} />
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
                  <Meta label={t("jobs.pickup")} value={fmtDateTime(job.pickupTime)} />
                  <Meta label={t("jobs.dropoff")} value={fmtDateTime(job.dropoffTime)} />
                  <Meta label={t("jobs.truck")} value={job.truck?.plateNumber || "—"} />
                  <Meta
                    label={t("jobs.price")}
                    value={job.priceEur != null ? `${Number(job.priceEur).toFixed(2)} €` : "—"}
                  />
                </div>

                <div className="flex gap-2">
                  {job.status === "ASSIGNED" && (
                    <ActionBtn busy={busyId === job.id} color="amber" onClick={() => act(startJob, job.id)}>
                      ▶ {t("driver.start")}
                    </ActionBtn>
                  )}
                  {job.status === "IN_PROGRESS" && (
                    <ActionBtn busy={busyId === job.id} color="emerald" onClick={() => act(finishJob, job.id)}>
                      ✓ {t("driver.finish")}
                    </ActionBtn>
                  )}
                  <button
                    onClick={() => navigate(`/driver/jobs/${job.id}`)}
                    className="px-3 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
                  >
                    {t("driver.details")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <div className="text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-slate-300">{value}</div>
    </div>
  );
}

function ActionBtn({ children, onClick, busy, color }) {
  const cls = color === "emerald"
    ? "bg-emerald-600 hover:bg-emerald-500"
    : "bg-amber-600 hover:bg-amber-500";
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex-1 px-3 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

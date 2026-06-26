import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useT } from "../i18n";
import { fetchMyJobs, fetchJobHistory, startJob, finishJob } from "../api";
import DriverHeader from "./DriverHeader";
import { useDriverLocation } from "./DriverLocationContext";
import { StatusBadge, fmtDateTime } from "./ui";

export default function DriverJobDetailPage() {
  const { id } = useParams();
  const { t } = useT();
  const navigate = useNavigate();
  const { startForJob, stopForJob } = useDriverLocation();

  const [job, setJob] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const jobs = await fetchMyJobs();
      const found = jobs.find((j) => String(j.id) === String(id)) || null;
      setJob(found);
      if (found) {
        try { setHistory(await fetchJobHistory(found.id)); } catch { /* ignore */ }
      }
      setError(found ? "" : t("jobs.none"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  async function act(action) {
    setBusy(true);
    try {
      await action(job.id);
      // Starting a job begins location sharing tagged to it; finishing stops it.
      if (action === startJob) startForJob(job.id);
      if (action === finishJob) stopForJob(job.id);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <DriverHeader />
      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-5 space-y-4">
        <button onClick={() => navigate("/driver")} className="text-xs text-slate-400 hover:text-slate-200">
          ← {t("driver.back")}
        </button>

        {loading ? (
          <p className="text-sm text-slate-400">{t("common.loading")}</p>
        ) : error || !job ? (
          <p className="text-sm text-red-400">{error || t("jobs.none")}</p>
        ) : (
          <>
            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-lg font-semibold text-slate-50">{job.title}</h1>
                <StatusBadge status={job.status} />
              </div>

              <div className="text-sm text-slate-300">
                <span className="text-slate-500 text-xs uppercase tracking-wide block mb-0.5">{t("driver.route")}</span>
                {job.pickupLocation} → {job.dropoffLocation}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Field label={t("jobs.pickup")} value={fmtDateTime(job.pickupTime)} />
                <Field label={t("jobs.dropoff")} value={fmtDateTime(job.dropoffTime)} />
                <Field label={t("jobs.truck")} value={job.truck?.plateNumber || "—"} />
                <Field
                  label={t("jobs.price")}
                  value={job.priceEur != null ? `${Number(job.priceEur).toFixed(2)} €` : "—"}
                />
              </div>

              {/* Big primary action */}
              {job.status === "ASSIGNED" && (
                <button
                  onClick={() => act(startJob)}
                  disabled={busy}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-base font-semibold transition-colors disabled:opacity-50"
                >
                  ▶ {t("driver.start")}
                </button>
              )}
              {job.status === "IN_PROGRESS" && (
                <button
                  onClick={() => act(finishJob)}
                  disabled={busy}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-base font-semibold transition-colors disabled:opacity-50"
                >
                  ✓ {t("driver.finish")}
                </button>
              )}
            </div>

            {/* Status timeline */}
            {history.length > 0 && (
              <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-slate-100 mb-3">{t("jobs.statusHistory")}</h2>
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs">
                          {h.fromStatus ? t(`status.${h.fromStatus}`) : t("common.none")}
                        </span>
                        <span className="text-slate-600 text-xs">→</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-100 text-xs font-medium">
                          {t(`status.${h.toStatus}`)}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">{fmtDateTime(h.changedAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <span className="text-slate-500 text-xs uppercase tracking-wide block">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}

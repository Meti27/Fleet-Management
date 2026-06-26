import { useEffect, useState } from "react";
import { fetchJobHistory } from "./api";
import { useT } from "./i18n";

export default function JobHistoryPanel({ job, onClose }) {
  const { t } = useT();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchJobHistory(job.id);
        setHistory(data);
        setError("");
      } catch (err) {
        console.error(err);
        setError(t("jobs.failedHistory"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [job.id]);

  return (
    <div className="mt-3 bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-100">
          {t("jobs.statusHistory")}{" "}
          <span className="text-slate-400 font-normal">— {t("jobs.jobLabel")} #{job.id}</span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-800"
        >
          ✕ {t("common.close")}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">{t("jobs.loadingHistory")}</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-slate-400">{t("jobs.noHistory")}</p>
      ) : (
        <ul className="space-y-2">
          {history.map((h) => (
            <li
              key={h.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border border-slate-700 rounded-lg px-3 py-2.5 bg-slate-950"
            >
              {/* Status transition */}
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs">
                  {h.fromStatus ? t(`status.${h.fromStatus}`) : t("common.none")}
                </span>
                <span className="text-slate-600 text-xs">→</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-100 text-xs font-medium">
                  {t(`status.${h.toStatus}`)}
                </span>
              </div>
              {/* Timestamp */}
              <div className="font-mono text-[11px] text-slate-500 sm:text-right">
                {h.changedAt}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
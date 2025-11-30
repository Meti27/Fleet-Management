import { useEffect, useState } from "react";
import { fetchJobHistory } from "./api";

export default function JobHistoryPanel({ job, onClose }) {
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
        setError("Failed to load history");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [job.id]);

  return (
    <div className="mt-4 bg-slate-900 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">
          Status History — Job #{job.id}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          Close
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-300">Loading history...</div>
      ) : error ? (
        <div className="text-sm text-red-400">{error}</div>
      ) : history.length === 0 ? (
        <div className="text-sm text-slate-400">
          No history yet.
        </div>
      ) : (
        <ul className="space-y-2 text-sm">
          {history.map((h) => (
            <li
              key={h.id}
              className="flex items-start justify-between border border-slate-700 rounded px-3 py-2 bg-slate-950"
            >
              <div>
                <div className="font-mono text-xs text-slate-400">
                  {h.changedAt}
                </div>
                <div>
                  <span className="text-slate-300">
                    {h.fromStatus || "NONE"}
                  </span>{" "}
                  <span className="text-slate-500">→</span>{" "}
                  <span className="text-slate-100">{h.toStatus}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

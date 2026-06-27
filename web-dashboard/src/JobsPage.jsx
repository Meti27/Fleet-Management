import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchJobs, updateJobStatus, deleteJob } from "./api";
import CreateJobForm from "./CreateJobForm";
import EditJobPanel from "./EditJobPanel";
import JobHistoryPanel from "./JobHistoryPanel";
import { useT } from "./i18n";

const STATUS_LABELS = ["OPEN", "ASSIGNED", "IN_PROGRESS", "DONE", "CANCELLED"];

export default function JobsPage() {
  const { t } = useT();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [editingJob, setEditingJob] = useState(null);
  const [historyJob, setHistoryJob] = useState(null);
  const editPanelRef = useRef(null);

  // When a job is opened for editing, scroll the panel into view so it doesn't
  // silently appear below the jobs list (otherwise the click looks like a no-op).
  useEffect(() => {
    if (editingJob && editPanelRef.current) {
      editPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editingJob]);

  async function loadJobs() {
    try {
      setLoading(true);
      const data = await fetchJobs();
      setJobs(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError(t("jobs.failedLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const jobIdParam = searchParams.get("jobId");
    if (!jobIdParam || !jobs.length) return;
    const id = parseInt(jobIdParam, 10);
    if (isNaN(id)) return;
    const target = jobs.find((j) => j.id === id);
    if (target) setEditingJob(target);
  }, [searchParams, jobs]);

  useEffect(() => { loadJobs(); }, []);

  async function handleStatusChange(jobId, newStatus) {
    try {
      await updateJobStatus(jobId, newStatus);
      await loadJobs();
    } catch (err) {
      console.error(err);
      alert(t("jobs.failedStatus"));
    }
  }

  async function handleDelete(jobId) {
    if (!window.confirm(t("jobs.deleteConfirm", { id: jobId }))) return;
    try {
      await deleteJob(jobId);
      await loadJobs();
      if (editingJob?.id === jobId) setEditingJob(null);
    } catch (err) {
      console.error(err);
      alert(t("jobs.failedDelete"));
    }
  }

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (statusFilter !== "ALL" && job.status !== statusFilter) return false;
      if (search.trim()) {
        const term = search.toLowerCase();
        const driverName = job.driver?.name?.toLowerCase() || "";
        const truckPlate = job.truck?.plateNumber?.toLowerCase() || "";
        const title = job.title?.toLowerCase() || "";
        if (!driverName.includes(term) && !truckPlate.includes(term) && !title.includes(term)) return false;
      }
      return true;
    });
  }, [jobs, statusFilter, search]);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-5 sm:space-y-6">
      {/* Create form */}
      <CreateJobForm onCreated={loadJobs} />

      {/* Filters */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-50">{t("jobs.heading")}</h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={filterCls}
          >
            <option value="ALL">{t("jobs.allStatuses")}</option>
            {STATUS_LABELS.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder={t("jobs.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${filterCls} sm:flex-1`}
          />
        </div>
      </section>

      {/* Jobs list */}
      {loading ? (
        <p className="text-slate-400 text-sm">{t("jobs.loading")}</p>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : filteredJobs.length === 0 ? (
        <p className="text-slate-400 text-sm">{t("jobs.none")}</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-700 bg-slate-950">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2.5 font-medium">{t("jobs.id")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("jobs.title")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("jobs.pickup")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("jobs.dropoff")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("jobs.driver")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("jobs.truck")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("jobs.status")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("jobs.priceCol")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    className={`border-t border-slate-800 transition-colors ${
                      editingJob?.id === job.id ? "bg-slate-800/50" : "hover:bg-slate-900/60"
                    }`}
                  >
                    <td className="px-3 py-2.5 text-slate-500 text-xs">#{job.id}</td>
                    <td className="px-3 py-2.5 text-slate-100 font-medium">{job.title}</td>
                    <td className="px-3 py-2.5 text-slate-300">{job.pickupLocation}</td>
                    <td className="px-3 py-2.5 text-slate-300">{job.dropoffLocation}</td>
                    <td className="px-3 py-2.5">
                      {job.driver ? job.driver.name : <span className="text-slate-500">{t("common.unassigned")}</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {job.truck ? (
                        <>
                          <span className="text-slate-200">{job.truck.plateNumber}</span>
                          {job.truck.model && (
                            <span className="text-xs text-slate-400 block">{job.truck.model}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-500">{t("common.unassigned")}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">
                      {job.priceEur != null ? `${Number(job.priceEur).toFixed(2)} €` : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <JobActionButtons job={job} onStatus={handleStatusChange} onEdit={setEditingJob} onDelete={handleDelete} onHistory={setHistoryJob} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className={`border rounded-xl p-3.5 transition-colors ${
                  editingJob?.id === job.id
                    ? "border-blue-500/40 bg-slate-800/60"
                    : "border-slate-700 bg-slate-900"
                }`}
              >
                {/* Top: title + status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-100 truncate">{job.title}</span>
                      <span className="text-xs text-slate-500">#{job.id}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {job.pickupLocation} → {job.dropoffLocation}
                    </div>
                  </div>
                  <StatusBadge status={job.status} />
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
                  <div>
                    <div className="text-slate-500 uppercase tracking-wide">{t("jobs.driver")}</div>
                    <div className="text-slate-300">{job.driver?.name || t("common.unassigned")}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 uppercase tracking-wide">{t("jobs.truck")}</div>
                    <div className="text-slate-300">{job.truck?.plateNumber || t("common.unassigned")}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 uppercase tracking-wide">{t("jobs.price")}</div>
                    <div className="text-slate-300">
                      {job.priceEur != null ? `${Number(job.priceEur).toFixed(2)} €` : "—"}
                    </div>
                  </div>
                  {job.truck?.model && (
                    <div>
                      <div className="text-slate-500 uppercase tracking-wide">{t("jobs.model")}</div>
                      <div className="text-slate-300">{job.truck.model}</div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800">
                  <JobActionButtons job={job} onStatus={handleStatusChange} onEdit={setEditingJob} onDelete={handleDelete} onHistory={setHistoryJob} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editingJob && (
        <div ref={editPanelRef} className="scroll-mt-20">
          <EditJobPanel
            job={editingJob}
            onSaved={() => { setEditingJob(null); loadJobs(); }}
            onCancel={() => setEditingJob(null)}
          />
        </div>
      )}
      {historyJob && (
        <JobHistoryPanel
          job={historyJob}
          onClose={() => setHistoryJob(null)}
        />
      )}
    </div>
  );
}

// ---- Sub-components ----

function StatusBadge({ status }) {
  const { t } = useT();
  const cls =
    status === "DONE" ? "bg-emerald-500/20 text-emerald-300" :
    status === "IN_PROGRESS" ? "bg-amber-500/20 text-amber-300" :
    status === "CANCELLED" ? "bg-red-500/20 text-red-300" :
    status === "ASSIGNED" ? "bg-blue-500/20 text-blue-300" :
    "bg-slate-800 text-slate-300";
  return (
    <span className={`inline-flex text-[11px] px-2 py-1 rounded-full whitespace-nowrap font-medium ${cls}`}>
      {t(`status.${status}`)}
    </span>
  );
}

function JobActionButtons({ job, onStatus, onEdit, onDelete, onHistory }) {
  const { t } = useT();
  return (
    <>
      {job.status !== "IN_PROGRESS" && job.status !== "DONE" && job.status !== "CANCELLED" && (
        <button
          onClick={() => onStatus(job.id, "IN_PROGRESS")}
          className="px-2.5 py-1 text-xs rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 font-medium transition-colors"
        >
          {t("jobs.start")}
        </button>
      )}
      {job.status !== "DONE" && job.status !== "CANCELLED" && (
        <button
          onClick={() => onStatus(job.id, "DONE")}
          className="px-2.5 py-1 text-xs rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 font-medium transition-colors"
        >
          {t("jobs.done")}
        </button>
      )}
      {job.status !== "CANCELLED" && job.status !== "DONE" && (
        <button
          onClick={() => onStatus(job.id, "CANCELLED")}
          className="px-2.5 py-1 text-xs rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 font-medium transition-colors"
        >
          {t("jobs.cancel")}
        </button>
      )}
      <button
        onClick={() => onEdit(job)}
        className="px-2.5 py-1 text-xs rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-colors"
      >
        {t("jobs.edit")}
      </button>
      <button
        onClick={() => onHistory(job)}
        className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
      >
        {t("jobs.history")}
      </button>
      <button
        onClick={() => onDelete(job.id)}
        className="px-2.5 py-1 text-xs rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 font-medium transition-colors"
      >
        {t("jobs.delete")}
      </button>
    </>
  );
}

// ---- constants ----

const filterCls =
  "px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors";
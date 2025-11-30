import { useEffect, useState, useMemo } from "react";
import {
  fetchJobs,
  updateJobStatus,
  deleteJob,
} from "./api";
import CreateJobForm from "./CreateJobForm";
import EditJobPanel from "./EditJobPanel";
import JobHistoryPanel from "./JobHistoryPanel";


const STATUS_LABELS = ["OPEN", "ASSIGNED", "IN_PROGRESS", "DONE", "CANCELLED"];

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [editingJob, setEditingJob] = useState(null);
  const [historyJob, setHistoryJob] = useState(null);
  async function loadJobs() {
    try {
      setLoading(true);
      const data = await fetchJobs();
      setJobs(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function handleStatusChange(jobId, newStatus) {
    try {
      await updateJobStatus(jobId, newStatus);
      await loadJobs();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  }

  async function handleDelete(jobId) {
    const confirmDelete = window.confirm(
      `Delete job #${jobId}? This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      await deleteJob(jobId);
      await loadJobs();
      if (editingJob && editingJob.id === jobId) {
        setEditingJob(null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete job");
    }
  }

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      let ok = true;

      if (statusFilter !== "ALL") {
        ok = ok && job.status === statusFilter;
      }

      if (search.trim()) {
        const term = search.toLowerCase();
        const driverName = job.driver?.name?.toLowerCase() || "";
        const truckPlate = job.truck?.plateNumber?.toLowerCase() || "";
        const title = job.title?.toLowerCase() || "";
        ok =
          ok &&
          (driverName.includes(term) ||
            truckPlate.includes(term) ||
            title.includes(term));
      }

      return ok;
    });
  }, [jobs, statusFilter, search]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Create job form */}
      <CreateJobForm onCreated={loadJobs} />

      {/* Filters */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-lg font-semibold">Jobs</h2>

        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 rounded bg-slate-900 border border-slate-700 text-sm"
          >
            <option value="ALL">All statuses</option>
            {STATUS_LABELS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search by driver, plate, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 rounded bg-slate-900 border border-slate-700 text-sm w-full md:w-64"
          />
        </div>
      </section>

      {/* Table */}
      {loading ? (
        <div>Loading jobs...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-slate-400">No jobs found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-300">
                  ID
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-300">
                  Title
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-300">
                  Pickup
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-300">
                  Dropoff
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-300">
                  Driver
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-300">
                  Truck
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-300">
                  Status
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-300">
                  Price €
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-t border-slate-800 hover:bg-slate-900/60"
                >
                  <td className="px-3 py-2">{job.id}</td>
                  <td className="px-3 py-2">{job.title}</td>
                  <td className="px-3 py-2">{job.pickupLocation}</td>
                  <td className="px-3 py-2">{job.dropoffLocation}</td>

                  <td className="px-3 py-2">
                    {job.driver ? (
                      job.driver.name
                    ) : (
                      <span className="text-slate-500">Unassigned</span>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    {job.truck ? (
                      <>
                        <span>{job.truck.plateNumber}</span>
                        {job.truck.model && (
                          <span className="text-xs text-slate-400 block">
                            {job.truck.model}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-500">Unassigned</span>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                        job.status === "DONE"
                          ? "bg-emerald-700/60 text-emerald-100"
                          : job.status === "IN_PROGRESS"
                          ? "bg-amber-700/60 text-amber-100"
                          : job.status === "CANCELLED"
                          ? "bg-red-700/60 text-red-100"
                          : "bg-slate-800 text-slate-100"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>

                  <td className="px-3 py-2">
                    {job.priceEur != null
                      ? Number(job.priceEur).toFixed(2)
                      : "-"}
                  </td>

                  <td className="px-3 py-2 space-x-1 whitespace-nowrap">
                    {/* Status buttons */}
                    {job.status !== "IN_PROGRESS" && job.status !== "DONE" && (
                      <button
                        onClick={() =>
                          handleStatusChange(job.id, "IN_PROGRESS")
                        }
                        className="px-2 py-1 text-xs rounded bg-amber-600 hover:bg-amber-700"
                      >
                        Start
                      </button>
                    )}
                    {job.status !== "DONE" && job.status !== "CANCELLED" && (
                      <button
                        onClick={() => handleStatusChange(job.id, "DONE")}
                        className="px-2 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-700"
                      >
                        Done
                      </button>
                    )}
                    {job.status !== "CANCELLED" && job.status !== "DONE" && (
                      <button
                        onClick={() =>
                          handleStatusChange(job.id, "CANCELLED")
                        }
                        className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700"
                      >
                        Cancel
                      </button>
                    )}

                    {/* Edit / Delete */}
                    <button
                      onClick={() => setEditingJob(job)}
                      className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700"
                    >
                      Del
                    </button>
                    <button
                        onClick={() => setHistoryJob(job)}
                        className="px-2 py-1 text-xs rounded bg-slate-600 hover:bg-slate-500"
                        >
                        History
                        </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingJob && (
        <EditJobPanel
          job={editingJob}
          onSaved={() => {
            setEditingJob(null);
            loadJobs();
          }}
          onCancel={() => setEditingJob(null)}
        />
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

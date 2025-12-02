import { useEffect, useState } from "react";
import {
  fetchDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
} from "./api";

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingDriver, setEditingDriver] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    licenseNumber: "",
  });

  useEffect(() => {
    loadDrivers();
  }, []);

  async function loadDrivers() {
    try {
      setLoading(true);
      const data = await fetchDrivers();
      setDrivers(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function startCreate() {
    setEditingDriver(null);
    setForm({ name: "", phone: "", licenseNumber: "" });
  }

  function startEdit(driver) {
    setEditingDriver(driver);
    setForm({
      name: driver.name || "",
      phone: driver.phone || "",
      licenseNumber: driver.licenseNumber || "",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingDriver) {
        await updateDriver(editingDriver.id, form);
      } else {
        await createDriver(form);
      }
      await loadDrivers();
      startCreate();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save driver");
    }
  }

  async function handleDelete(driverId) {
    const confirmDelete = window.confirm(
      `Delete driver #${driverId}? This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      await deleteDriver(driverId);
      await loadDrivers();
      if (editingDriver?.id === driverId) {
        startCreate();
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete driver");
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Drivers</h1>
        {/* <button
          onClick={startCreate}
          className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700"
        >
          + New driver
        </button> */}
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">
            {editingDriver ? `Edit driver #${editingDriver.id}` : "Add driver"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              License No.
            </label>
            <input
              name="licenseNumber"
              value={form.licenseNumber}
              onChange={handleChange}
              className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button
            type="submit"
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-sm"
          >
            {editingDriver ? "Save changes" : "Create driver"}
          </button>
          {editingDriver && (
            <button
              type="button"
              onClick={startCreate}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        {loading ? (
          <p className="text-sm text-slate-400">Loading drivers...</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : drivers.length === 0 ? (
          <p className="text-sm text-slate-400">No drivers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Phone</th>
                  <th className="py-2 px-3">License</th>
                  <th className="py-2 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-slate-800 last:border-b-0"
                  >
                    <td className="py-2 pr-3 text-slate-400">{d.id}</td>
                    <td className="py-2 px-3">{d.name}</td>
                    <td className="py-2 px-3">{d.phone || "-"}</td>
                    <td className="py-2 px-3">
                      {d.licenseNumber || "-"}
                    </td>
                    <td className="py-2 pl-3 text-right">
                      <button
                        onClick={() => startEdit(d)}
                        className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700"
                      >
                        Del
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

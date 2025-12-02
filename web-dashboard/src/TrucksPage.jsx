import { useEffect, useState } from "react";
import {
  fetchTrucks,
  createTruck,
  updateTruck,
  deleteTruck,
} from "./api";

export default function TrucksPage() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingTruck, setEditingTruck] = useState(null);
  const [form, setForm] = useState({
    plateNumber: "",
    model: "",
    capacityTons: "",
  });

  useEffect(() => {
    loadTrucks();
  }, []);

  async function loadTrucks() {
    try {
      setLoading(true);
      const data = await fetchTrucks();
      setTrucks(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load trucks");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function startCreate() {
    setEditingTruck(null);
    setForm({ plateNumber: "", model: "", capacityTons: "" });
  }

  function startEdit(truck) {
    setEditingTruck(truck);
    setForm({
      plateNumber: truck.plateNumber || "",
      model: truck.model || "",
      capacityTons: truck.capacityTons != null ? String(truck.capacityTons) : "",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        plateNumber: form.plateNumber,
        model: form.model,
        capacityTons: form.capacityTons
          ? parseFloat(form.capacityTons)
          : null,
      };

      if (editingTruck) {
        await updateTruck(editingTruck.id, payload);
      } else {
        await createTruck(payload);
      }

      await loadTrucks();
      startCreate();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save truck");
    }
  }

  async function handleDelete(truckId) {
    const confirmDelete = window.confirm(
      `Delete truck #${truckId}? This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      await deleteTruck(truckId);
      await loadTrucks();
      if (editingTruck?.id === truckId) {
        startCreate();
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete truck");
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Trucks</h1>
        {/* <button
          onClick={startCreate}
          className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700"
        >
          
        </button> */}
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">
            {editingTruck ? `Edit truck #${editingTruck.id}` : "Add truck"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Plate number
            </label>
            <input
              name="plateNumber"
              value={form.plateNumber}
              onChange={handleChange}
              className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Model</label>
            <input
              name="model"
              value={form.model}
              onChange={handleChange}
              className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Capacity (tons)
            </label>
            <input
              name="capacityTons"
              value={form.capacityTons}
              onChange={handleChange}
              className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-sm"
              type="number"
              step="0.1"
              min="0"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button
            type="submit"
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-sm"
          >
            {editingTruck ? "Save changes" : "Create truck"}
          </button>
          {editingTruck && (
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
          <p className="text-sm text-slate-400">Loading trucks...</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : trucks.length === 0 ? (
          <p className="text-sm text-slate-400">No trucks yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 px-3">Plate</th>
                  <th className="py-2 px-3">Model</th>
                  <th className="py-2 px-3">Capacity (t)</th>
                  <th className="py-2 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trucks.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-800 last:border-b-0"
                  >
                    <td className="py-2 pr-3 text-slate-400">{t.id}</td>
                    <td className="py-2 px-3">{t.plateNumber}</td>
                    <td className="py-2 px-3">{t.model || "-"}</td>
                    <td className="py-2 px-3">
                      {t.capacityTons != null ? t.capacityTons : "-"}
                    </td>
                    <td className="py-2 pl-3 text-right">
                      <button
                        onClick={() => startEdit(t)}
                        className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
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

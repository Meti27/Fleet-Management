import { useEffect, useState } from "react";
import { fetchTrucks, createTruck, updateTruck, deleteTruck } from "./api";

export default function TrucksPage() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingTruck, setEditingTruck] = useState(null);
  const [form, setForm] = useState({ plateNumber: "", model: "", capacityTons: "" });

  useEffect(() => { loadTrucks(); }, []);

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
    setTimeout(() => {
      document.getElementById("truck-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        plateNumber: form.plateNumber,
        model: form.model,
        capacityTons: form.capacityTons ? parseFloat(form.capacityTons) : null,
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
    if (!window.confirm(`Delete truck #${truckId}? This cannot be undone.`)) return;
    try {
      await deleteTruck(truckId);
      await loadTrucks();
      if (editingTruck?.id === truckId) startCreate();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete truck");
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-5 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-slate-50">Trucks</h1>

      {/* Form */}
      <form
        id="truck-form"
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-100">
            {editingTruck ? `Edit Truck #${editingTruck.id}` : "Add Truck"}
          </span>
          {editingTruck && (
            <button
              type="button"
              onClick={startCreate}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Plate Number">
            <input
              name="plateNumber"
              value={form.plateNumber}
              onChange={handleChange}
              className={inputCls}
              placeholder="e.g. MK-1234-AB"
              required
            />
          </Field>
          <Field label="Model">
            <input
              name="model"
              value={form.model}
              onChange={handleChange}
              className={inputCls}
              placeholder="e.g. MAN TGX 18.500"
            />
          </Field>
          <Field label="Capacity (tons)">
            <input
              name="capacityTons"
              value={form.capacityTons}
              onChange={handleChange}
              className={inputCls}
              placeholder="e.g. 18.5"
              type="number"
              step="0.1"
              min="0"
            />
          </Field>
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          {editingTruck ? "Save Changes" : "Create Truck"}
        </button>
      </form>

      {/* List */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-5">
        {loading ? (
          <p className="text-sm text-slate-400">Loading trucks...</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : trucks.length === 0 ? (
          <p className="text-sm text-slate-400">No trucks yet.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-700 text-xs uppercase tracking-wide">
                    <th className="py-2 pr-3 font-medium">ID</th>
                    <th className="py-2 px-3 font-medium">Plate</th>
                    <th className="py-2 px-3 font-medium">Model</th>
                    <th className="py-2 px-3 font-medium">Capacity (t)</th>
                    <th className="py-2 pl-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trucks.map((t) => (
                    <tr
                      key={t.id}
                      className={`border-b border-slate-800 last:border-b-0 transition-colors ${
                        editingTruck?.id === t.id ? "bg-slate-800/40" : "hover:bg-slate-800/20"
                      }`}
                    >
                      <td className="py-2.5 pr-3 text-slate-500 text-xs">#{t.id}</td>
                      <td className="py-2.5 px-3 text-slate-100 font-medium">{t.plateNumber}</td>
                      <td className="py-2.5 px-3 text-slate-300">{t.model || "—"}</td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {t.capacityTons != null ? `${t.capacityTons} t` : "—"}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <button
                          onClick={() => startEdit(t)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 mr-2 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden flex flex-col gap-2">
              {trucks.map((t) => (
                <div
                  key={t.id}
                  className={`border rounded-xl p-3 transition-colors ${
                    editingTruck?.id === t.id
                      ? "border-blue-500/40 bg-slate-800/60"
                      : "border-slate-700 bg-slate-800/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-sm font-semibold text-slate-100">{t.plateNumber}</span>
                      <span className="ml-2 text-xs text-slate-500">#{t.id}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-3">
                    <div>
                      <div className="text-slate-500 uppercase tracking-wide">Model</div>
                      <div className="text-slate-300">{t.model || "—"}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 uppercase tracking-wide">Capacity</div>
                      <div className="text-slate-300">
                        {t.capacityTons != null ? `${t.capacityTons} t` : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(t)}
                      className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="flex-1 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- helpers ----

const inputCls =
  "w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors";

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
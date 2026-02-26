import { useState } from "react";
import { createTruck } from "./api";

export default function TruckForm({ onCreated }) {
  const [form, setForm] = useState({
    plateNumber: "",
    model: "",
    capacityTons: "",
    status: "AVAILABLE",
  });

  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        plateNumber: form.plateNumber,
        model: form.model || null,
        capacityTons: form.capacityTons ? parseFloat(form.capacityTons) : null,
        status: form.status || "AVAILABLE",
      };
      await createTruck(payload);
      onCreated && onCreated();
      setForm({ plateNumber: "", model: "", capacityTons: "", status: "AVAILABLE" });
    } catch (err) {
      console.error(err);
      alert("Error creating truck");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-700 space-y-4"
    >
      <h2 className="text-base sm:text-lg font-semibold text-slate-50">Add Truck</h2>

      {/* Plate + Model */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Plate Number">
          <input
            className={inputCls}
            placeholder="e.g. MK-1234-AB"
            name="plateNumber"
            value={form.plateNumber}
            onChange={handleChange}
            required
          />
        </Field>
        <Field label="Model — optional">
          <input
            className={inputCls}
            placeholder="e.g. MAN TGX 18.500"
            name="model"
            value={form.model}
            onChange={handleChange}
          />
        </Field>
      </div>

      {/* Capacity + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Capacity (tons) — optional">
          <input
            className={inputCls}
            placeholder="e.g. 18.5"
            name="capacityTons"
            value={form.capacityTons}
            onChange={handleChange}
          />
        </Field>
        <Field label="Status">
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className={inputCls}
          >
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="IN_JOB">IN_JOB</option>
            <option value="OFF">OFF</option>
          </select>
        </Field>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 active:bg-amber-700 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Saving..." : "Save Truck"}
      </button>
    </form>
  );
}

// ---- helpers ----

const inputCls =
  "w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors";

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
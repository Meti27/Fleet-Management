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
        capacityTons: form.capacityTons
          ? parseFloat(form.capacityTons)
          : null,
        status: form.status || "AVAILABLE",
      };

      await createTruck(payload);
      onCreated && onCreated();

      setForm({
        plateNumber: "",
        model: "",
        capacityTons: "",
        status: "AVAILABLE",
      });
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
      className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3"
    >
      <h2 className="text-lg font-semibold">Add Truck</h2>

      <input
        className="w-full p-2 rounded bg-slate-800 border border-slate-700"
        placeholder="Plate Number"
        name="plateNumber"
        value={form.plateNumber}
        onChange={handleChange}
        required
      />

      <input
        className="w-full p-2 rounded bg-slate-800 border border-slate-700"
        placeholder="Model (e.g. MAN TGX 18.500)"
        name="model"
        value={form.model}
        onChange={handleChange}
      />

      <input
        className="w-full p-2 rounded bg-slate-800 border border-slate-700"
        placeholder="Capacity (tons)"
        name="capacityTons"
        value={form.capacityTons}
        onChange={handleChange}
      />

      <select
        name="status"
        value={form.status}
        onChange={handleChange}
        className="w-full p-2 rounded bg-slate-800 border border-slate-700"
      >
        <option value="AVAILABLE">AVAILABLE</option>
        <option value="IN_JOB">IN_JOB</option>
        <option value="OFF">OFF</option>
      </select>

      <button
        type="submit"
        disabled={loading}
        className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded text-white text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Truck"}
      </button>
    </form>
  );
}

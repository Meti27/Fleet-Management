import { useState } from "react";
import { createDriver } from "./api";

export default function DriverForm({ onCreated }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    status: "ACTIVE",
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
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        status: form.status || "ACTIVE",
      };

      await createDriver(payload);
      if (onCreated) onCreated();

      setForm({
        name: "",
        phone: "",
        email: "",
        status: "ACTIVE",
      });
    } catch (err) {
      console.error(err);
      alert("Error creating driver");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3"
    >
      <h2 className="text-lg font-semibold">Add Driver</h2>

      <input
        className="w-full p-2 rounded bg-slate-800 border border-slate-700"
        placeholder="Name"
        name="name"
        value={form.name}
        onChange={handleChange}
        required
      />

      <input
        className="w-full p-2 rounded bg-slate-800 border border-slate-700"
        placeholder="Phone"
        name="phone"
        value={form.phone}
        onChange={handleChange}
      />

      <input
        className="w-full p-2 rounded bg-slate-800 border border-slate-700"
        placeholder="Email"
        type="email"
        name="email"
        value={form.email}
        onChange={handleChange}
      />

      <select
        name="status"
        value={form.status}
        onChange={handleChange}
        className="w-full p-2 rounded bg-slate-800 border border-slate-700"
      >
        <option value="ACTIVE">ACTIVE</option>
        <option value="INACTIVE">INACTIVE</option>
      </select>

      <button
        type="submit"
        disabled={loading}
        className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded text-white text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Driver"}
      </button>
    </form>
  );
}

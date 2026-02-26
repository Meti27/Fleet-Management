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
      setForm({ name: "", phone: "", email: "", status: "ACTIVE" });
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
      className="bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-700 space-y-4"
    >
      <h2 className="text-base sm:text-lg font-semibold text-slate-50">Add Driver</h2>

      <Field label="Full Name">
        <input
          className={inputCls}
          placeholder="e.g. John Smith"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />
      </Field>

      {/* Phone + Email side by side on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Phone — optional">
          <input
            className={inputCls}
            placeholder="+1 555 000 0000"
            name="phone"
            value={form.phone}
            onChange={handleChange}
          />
        </Field>
        <Field label="Email — optional">
          <input
            className={inputCls}
            placeholder="driver@example.com"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
          />
        </Field>
      </div>

      <Field label="Status">
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className={inputCls}
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </Field>

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Saving..." : "Save Driver"}
      </button>
    </form>
  );
}

// ---- helpers ----

const inputCls =
  "w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors";

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}
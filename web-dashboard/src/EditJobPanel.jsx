import { useEffect, useState } from "react";
import { fetchDrivers, fetchTrucks, updateJob } from "./api";

export default function EditJobPanel({ job, onSaved, onCancel }) {
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);

  const [form, setForm] = useState({
    title: job.title || "",
    pickupLocation: job.pickupLocation || "",
    dropoffLocation: job.dropoffLocation || "",
    pickupTime: job.pickupTime ? job.pickupTime.slice(0, 16) : "",
    dropoffTime: job.dropoffTime ? job.dropoffTime.slice(0, 16) : "",
    priceEur: job.priceEur != null ? job.priceEur : "",
    status: job.status || "OPEN",
    driverId: job.driver ? job.driver.id : "",
    truckId: job.truck ? job.truck.id : "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setDrivers(await fetchDrivers());
        setTrucks(await fetchTrucks());
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        pickupLocation: form.pickupLocation,
        dropoffLocation: form.dropoffLocation,
        pickupTime: form.pickupTime || null,
        dropoffTime: form.dropoffTime || null,
        priceEur: form.priceEur ? parseFloat(form.priceEur) : null,
        status: form.status || job.status,
        driverId: form.driverId ? parseInt(form.driverId) : null,
        truckId: form.truckId ? parseInt(form.truckId) : null,
      };
      await updateJob(job.id, payload);
      onSaved && onSaved();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Error updating job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-100">
          Edit Job <span className="text-slate-400">#{job.id}</span>
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-800"
        >
          ✕ Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        {/* Title */}
        <Field label="Title">
          <input
            className={inputCls}
            placeholder="Job title"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
          />
        </Field>

        {/* Locations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Pickup Location">
            <input
              className={inputCls}
              placeholder="City or address"
              name="pickupLocation"
              value={form.pickupLocation}
              onChange={handleChange}
              required
            />
          </Field>
          <Field label="Dropoff Location">
            <input
              className={inputCls}
              placeholder="City or address"
              name="dropoffLocation"
              value={form.dropoffLocation}
              onChange={handleChange}
              required
            />
          </Field>
        </div>

        {/* Times */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Pickup Time">
            <input
              type="datetime-local"
              className={inputCls}
              name="pickupTime"
              value={form.pickupTime}
              onChange={handleChange}
            />
          </Field>
          <Field label="Dropoff Time">
            <input
              type="datetime-local"
              className={inputCls}
              name="dropoffTime"
              value={form.dropoffTime}
              onChange={handleChange}
            />
          </Field>
        </div>

        {/* Price + Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Price (EUR)">
            <input
              className={inputCls}
              placeholder="0.00"
              name="priceEur"
              value={form.priceEur}
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
              <option value="OPEN">OPEN</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="DONE">DONE</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </Field>
        </div>

        {/* Driver + Truck */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Driver">
            <select
              name="driverId"
              value={form.driverId}
              onChange={handleChange}
              className={inputCls}
            >
              <option value="">— No driver —</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Truck">
            <select
              name="truckId"
              value={form.truckId}
              onChange={handleChange}
              className={inputCls}
            >
              <option value="">— No truck —</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.plateNumber} — {t.model}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
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
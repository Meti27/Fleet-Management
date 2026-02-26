import { useEffect, useState } from "react";
import { fetchDrivers, fetchTrucks, createJob } from "./api";

export default function CreateJobForm({ onCreated }) {
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);

  const [form, setForm] = useState({
    title: "",
    pickupLocation: "",
    dropoffLocation: "",
    pickupTime: "",
    dropoffTime: "",
    priceEur: "",
    driverId: "",
    truckId: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setDrivers(await fetchDrivers());
      setTrucks(await fetchTrucks());
    }
    load();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.pickupTime || !form.dropoffTime) {
      alert("Please set pickup and dropoff time.");
      return;
    }
    if (!form.driverId || !form.truckId) {
      alert("Please select driver and truck.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: form.title,
        pickupLocation: form.pickupLocation,
        dropoffLocation: form.dropoffLocation,
        pickupTime: form.pickupTime,
        dropoffTime: form.dropoffTime,
        priceEur: form.priceEur ? parseFloat(form.priceEur) : null,
        driverId: parseInt(form.driverId),
        truckId: parseInt(form.truckId),
      };

      await createJob(payload);
      onCreated && onCreated();

      setForm({
        title: "",
        pickupLocation: "",
        dropoffLocation: "",
        pickupTime: "",
        dropoffTime: "",
        priceEur: "",
        driverId: "",
        truckId: "",
      });
    } catch (err) {
      console.error(err);
      alert("Error creating job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-700 space-y-4"
    >
      <h2 className="text-base sm:text-lg font-semibold text-slate-50">Create Job</h2>

      {/* Title */}
      <Field label="Title">
        <input
          className={inputCls}
          placeholder="e.g. Delivery to Berlin"
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
            required
          />
        </Field>
        <Field label="Dropoff Time">
          <input
            type="datetime-local"
            className={inputCls}
            name="dropoffTime"
            value={form.dropoffTime}
            onChange={handleChange}
            required
          />
        </Field>
      </div>

      {/* Price */}
      <Field label="Price (EUR) — optional">
        <input
          className={inputCls}
          placeholder="0.00"
          name="priceEur"
          value={form.priceEur}
          onChange={handleChange}
        />
      </Field>

      {/* Driver + Truck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Driver">
          <select
            name="driverId"
            value={form.driverId}
            onChange={handleChange}
            className={inputCls}
            required
          >
            <option value="">— Select driver —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Truck">
          <select
            name="truckId"
            value={form.truckId}
            onChange={handleChange}
            className={inputCls}
            required
          >
            <option value="">— Select truck —</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.plateNumber} — {t.model}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating..." : "Create Job"}
      </button>
    </form>
  );
}

// ---- helpers ----

const inputCls =
  "w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors";

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
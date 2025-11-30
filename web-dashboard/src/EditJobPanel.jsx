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
      let message = "Error updating job";
      if (err instanceof Error && err.message) {
        message = err.message;
      }
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 bg-slate-900 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">
          Edit Job #{job.id}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <input
          className="w-full p-2 rounded bg-slate-800 border border-slate-700"
          placeholder="Title"
          name="title"
          value={form.title}
          onChange={handleChange}
          required
        />

        <div className="flex flex-col md:flex-row gap-3">
          <input
            className="flex-1 p-2 rounded bg-slate-800 border border-slate-700"
            placeholder="Pickup Location"
            name="pickupLocation"
            value={form.pickupLocation}
            onChange={handleChange}
            required
          />
          <input
            className="flex-1 p-2 rounded bg-slate-800 border border-slate-700"
            placeholder="Dropoff Location"
            name="dropoffLocation"
            value={form.dropoffLocation}
            onChange={handleChange}
            required
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="datetime-local"
            className="flex-1 p-2 rounded bg-slate-800 border border-slate-700"
            name="pickupTime"
            value={form.pickupTime}
            onChange={handleChange}
          />
          <input
            type="datetime-local"
            className="flex-1 p-2 rounded bg-slate-800 border border-slate-700"
            name="dropoffTime"
            value={form.dropoffTime}
            onChange={handleChange}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            className="flex-1 p-2 rounded bg-slate-800 border border-slate-700"
            placeholder="Price (EUR)"
            name="priceEur"
            value={form.priceEur}
            onChange={handleChange}
          />

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="flex-1 p-2 rounded bg-slate-800 border border-slate-700"
          >
            <option value="OPEN">OPEN</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="DONE">DONE</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <select
            name="driverId"
            value={form.driverId}
            onChange={handleChange}
            className="flex-1 p-2 rounded bg-slate-800 border border-slate-700"
          >
            <option value="">-- No driver --</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            name="truckId"
            value={form.truckId}
            onChange={handleChange}
            className="flex-1 p-2 rounded bg-slate-800 border border-slate-700"
          >
            <option value="">-- No truck --</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.plateNumber} — {t.model}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 rounded bg-slate-800 text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-medium disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

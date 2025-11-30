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

    // Optional: enforce that times & driver/truck are filled
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
        // datetime-local gives "2025-11-24T10:00" → directly usable as ISO string
        pickupTime: form.pickupTime,
        dropoffTime: form.dropoffTime,
        priceEur: form.priceEur ? parseFloat(form.priceEur) : null,
        driverId: parseInt(form.driverId),
        truckId: parseInt(form.truckId),
      };

      console.log("Create job payload:", payload);

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
      className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-4"
    >
      <h2 className="text-lg font-semibold">Create Job</h2>

      <input
        className="w-full p-2 rounded bg-slate-800 border border-slate-700"
        placeholder="Title"
        name="title"
        value={form.title}
        onChange={handleChange}
        required
      />

      <div className="flex flex-col md:flex-row gap-4">
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

      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="datetime-local"
          className="flex-1 p-2 rounded bg-slate-800 border border-slate-700"
          name="pickupTime"
          value={form.pickupTime}
          onChange={handleChange}
          required
        />
        <input
          type="datetime-local"
          className="flex-1 p-2 rounded bg-slate-800 border border-slate-700"
          name="dropoffTime"
          value={form.dropoffTime}
          onChange={handleChange}
          required
        />
      </div>

      <input
        className="w-full p-2 rounded bg-slate-800 border border-slate-700"
        placeholder="Price (EUR)"
        name="priceEur"
        value={form.priceEur}
        onChange={handleChange}
      />

      <select
        name="driverId"
        value={form.driverId}
        onChange={handleChange}
        className="w-full p-2 rounded bg-slate-800 border border-slate-700"
        required
      >
        <option value="">-- Select driver --</option>
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
        className="w-full p-2 rounded bg-slate-800 border border-slate-700"
        required
      >
        <option value="">-- Select truck --</option>
        {trucks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.plateNumber} — {t.model}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Job"}
      </button>
    </form>
  );
}

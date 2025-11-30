import { useEffect, useState } from "react";
import { fetchTrucks } from "./api";
import TruckForm from "./TruckForm";

export default function TrucksPage() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  useEffect(() => {
    loadTrucks();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <TruckForm onCreated={loadTrucks} />

      <section>
        <h2 className="text-lg font-semibold mb-3">Truck List</h2>

        {loading ? (
          <div>Loading trucks...</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : trucks.length === 0 ? (
          <div className="text-slate-400">No trucks yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    ID
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Plate
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Model
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Capacity (t)
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody>
                {trucks.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-slate-800 hover:bg-slate-900/60"
                  >
                    <td className="px-3 py-2">{t.id}</td>
                    <td className="px-3 py-2">{t.plateNumber}</td>
                    <td className="px-3 py-2">{t.model || "-"}</td>
                    <td className="px-3 py-2">
                      {t.capacityTons != null ? t.capacityTons : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs">
                        {t.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {t.createdAt || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

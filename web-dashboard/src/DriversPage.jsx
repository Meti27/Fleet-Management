import { useEffect, useState } from "react";
import { fetchDrivers } from "./api";
import DriverForm from "./DriverForm";

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDrivers() {
    try {
      setLoading(true);
      const data = await fetchDrivers();
      setDrivers(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDrivers();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
     

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <DriverForm onCreated={loadDrivers} />

        <section>
          <h2 className="text-lg font-semibold mb-3">Driver List</h2>

          {loading ? (
            <div>Loading drivers...</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : drivers.length === 0 ? (
            <div className="text-slate-400">No drivers yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">
                      ID
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">
                      Phone
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">
                      Email
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
                  {drivers.map((d) => (
                    <tr
                      key={d.id}
                      className="border-t border-slate-800 hover:bg-slate-900/60"
                    >
                      <td className="px-3 py-2">{d.id}</td>
                      <td className="px-3 py-2">{d.name}</td>
                      <td className="px-3 py-2">{d.phone || "-"}</td>
                      <td className="px-3 py-2">{d.email || "-"}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs">
                          {d.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-400">
                        {d.createdAt || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

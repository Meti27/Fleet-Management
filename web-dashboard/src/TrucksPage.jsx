import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchTrucks, createTruck, updateTruck, deleteTruck } from "./api";
import { useT } from "./i18n";

export default function TrucksPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingTruck, setEditingTruck] = useState(null);
  const [form, setForm] = useState({ plateNumber: "", model: "", capacityTons: "", fuelConsumptionL100km: "" });

  useEffect(() => { loadTrucks(); }, []);

  async function loadTrucks() {
    try {
      setLoading(true);
      const data = await fetchTrucks();
      setTrucks(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError(t("trucks.failedLoad"));
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function startCreate() {
    setEditingTruck(null);
    setForm({ plateNumber: "", model: "", capacityTons: "", fuelConsumptionL100km: "" });
  }

  function startEdit(truck) {
    setEditingTruck(truck);
    setForm({
      plateNumber: truck.plateNumber || "",
      model: truck.model || "",
      capacityTons: truck.capacityTons != null ? String(truck.capacityTons) : "",
      fuelConsumptionL100km:
        truck.fuelConsumptionL100km != null ? String(truck.fuelConsumptionL100km) : "",
    });
    setTimeout(() => {
      document.getElementById("truck-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        plateNumber: form.plateNumber,
        model: form.model,
        capacityTons: form.capacityTons ? parseFloat(form.capacityTons) : null,
        fuelConsumptionL100km: form.fuelConsumptionL100km
          ? parseFloat(form.fuelConsumptionL100km)
          : null,
      };
      if (editingTruck) {
        await updateTruck(editingTruck.id, payload);
      } else {
        await createTruck(payload);
      }
      await loadTrucks();
      startCreate();
    } catch (err) {
      console.error(err);
      alert(err.message || t("trucks.failedSave"));
    }
  }

  async function handleDelete(truckId) {
    if (!window.confirm(t("trucks.deleteConfirm", { id: truckId }))) return;
    try {
      await deleteTruck(truckId);
      await loadTrucks();
      if (editingTruck?.id === truckId) startCreate();
    } catch (err) {
      console.error(err);
      alert(err.message || t("trucks.failedDelete"));
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-5 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-slate-50">{t("trucks.heading")}</h1>

      {/* Form */}
      <form
        id="truck-form"
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-100">
            {editingTruck ? t("trucks.editTruck", { id: editingTruck.id }) : t("trucks.addTruck")}
          </span>
          {editingTruck && (
            <button
              type="button"
              onClick={startCreate}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              {t("common.cancelEdit")}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label={t("trucks.plateNumber")}>
            <input
              name="plateNumber"
              value={form.plateNumber}
              onChange={handleChange}
              className={inputCls}
              placeholder={t("trucks.platePlaceholder")}
              required
            />
          </Field>
          <Field label={t("trucks.model")}>
            <input
              name="model"
              value={form.model}
              onChange={handleChange}
              className={inputCls}
              placeholder={t("trucks.modelPlaceholder")}
            />
          </Field>
          <Field label={t("trucks.capacityTons")}>
            <input
              name="capacityTons"
              value={form.capacityTons}
              onChange={handleChange}
              className={inputCls}
              placeholder={t("trucks.capacityPlaceholder")}
              type="number"
              step="0.1"
              min="0"
            />
          </Field>
          <Field label={t("trucks.fuelConsumption")}>
            <input
              name="fuelConsumptionL100km"
              value={form.fuelConsumptionL100km}
              onChange={handleChange}
              className={inputCls}
              placeholder={t("trucks.fuelConsumptionPlaceholder")}
              type="number"
              step="0.1"
              min="0"
            />
          </Field>
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          {editingTruck ? t("common.saveChanges") : t("trucks.createTruck")}
        </button>
      </form>

      {/* List */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-5">
        {loading ? (
          <p className="text-sm text-slate-400">{t("trucks.loading")}</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : trucks.length === 0 ? (
          <p className="text-sm text-slate-400">{t("trucks.none")}</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-700 text-xs uppercase tracking-wide">
                    <th className="py-2 pr-3 font-medium">{t("trucks.id")}</th>
                    <th className="py-2 px-3 font-medium">{t("trucks.plate")}</th>
                    <th className="py-2 px-3 font-medium">{t("trucks.model")}</th>
                    <th className="py-2 px-3 font-medium">{t("trucks.capacityCol")}</th>
                    <th className="py-2 px-3 font-medium">{t("trucks.fuelCol")}</th>
                    <th className="py-2 pl-3 font-medium text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {trucks.map((truck) => (
                    <tr
                      key={truck.id}
                      className={`border-b border-slate-800 last:border-b-0 transition-colors ${
                        editingTruck?.id === truck.id ? "bg-slate-800/40" : "hover:bg-slate-800/20"
                      }`}
                    >
                      <td className="py-2.5 pr-3 text-slate-500 text-xs">#{truck.id}</td>
                      <td className="py-2.5 px-3 text-slate-100 font-medium">{truck.plateNumber}</td>
                      <td className="py-2.5 px-3 text-slate-300">{truck.model || "—"}</td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {truck.capacityTons != null ? `${truck.capacityTons} t` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {truck.fuelConsumptionL100km != null
                          ? `${truck.fuelConsumptionL100km} L/100km`
                          : "—"}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <button
                          onClick={() => navigate(`/trucks/${truck.id}`)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 mr-2 transition-colors"
                        >
                          {t("trucks.manage")}
                        </button>
                        <button
                          onClick={() => startEdit(truck)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 mr-2 transition-colors"
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          onClick={() => handleDelete(truck.id)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 transition-colors"
                        >
                          {t("common.delete")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden flex flex-col gap-2">
              {trucks.map((truck) => (
                <div
                  key={truck.id}
                  className={`border rounded-xl p-3 transition-colors ${
                    editingTruck?.id === truck.id
                      ? "border-blue-500/40 bg-slate-800/60"
                      : "border-slate-700 bg-slate-800/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-sm font-semibold text-slate-100">{truck.plateNumber}</span>
                      <span className="ml-2 text-xs text-slate-500">#{truck.id}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-3">
                    <div>
                      <div className="text-slate-500 uppercase tracking-wide">{t("trucks.model")}</div>
                      <div className="text-slate-300">{truck.model || "—"}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 uppercase tracking-wide">{t("trucks.capacity")}</div>
                      <div className="text-slate-300">
                        {truck.capacityTons != null ? `${truck.capacityTons} t` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 uppercase tracking-wide">{t("trucks.fuelCol")}</div>
                      <div className="text-slate-300">
                        {truck.fuelConsumptionL100km != null
                          ? `${truck.fuelConsumptionL100km} L/100km`
                          : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/trucks/${truck.id}`)}
                      className="flex-1 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
                    >
                      {t("trucks.manage")}
                    </button>
                    <button
                      onClick={() => startEdit(truck)}
                      className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={() => handleDelete(truck.id)}
                      className="flex-1 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium transition-colors"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
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
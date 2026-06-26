import { useEffect, useState } from "react";
import {
  fetchDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
} from "./api";
import { useT } from "./i18n";

export default function DriversPage() {
  const { t } = useT();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingDriver, setEditingDriver] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", licenseNumber: "" });

  useEffect(() => { loadDrivers(); }, []);

  async function loadDrivers() {
    try {
      setLoading(true);
      const data = await fetchDrivers();
      setDrivers(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError(t("drivers.failedLoad"));
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function startCreate() {
    setEditingDriver(null);
    setForm({ name: "", phone: "", licenseNumber: "" });
  }

  function startEdit(driver) {
    setEditingDriver(driver);
    setForm({
      name: driver.name || "",
      phone: driver.phone || "",
      licenseNumber: driver.licenseNumber || "",
    });
    // Scroll form into view on mobile
    setTimeout(() => {
      document.getElementById("driver-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingDriver) {
        await updateDriver(editingDriver.id, form);
      } else {
        await createDriver(form);
      }
      await loadDrivers();
      startCreate();
    } catch (err) {
      console.error(err);
      alert(err.message || t("drivers.failedSave"));
    }
  }

  async function handleDelete(driverId) {
    if (!window.confirm(t("drivers.deleteConfirm", { id: driverId }))) return;
    try {
      await deleteDriver(driverId);
      await loadDrivers();
      if (editingDriver?.id === driverId) startCreate();
    } catch (err) {
      console.error(err);
      alert(err.message || t("drivers.failedDelete"));
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-5 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-slate-50">{t("drivers.heading")}</h1>

      {/* Form */}
      <form
        id="driver-form"
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-100">
            {editingDriver ? t("drivers.editDriver", { id: editingDriver.id }) : t("drivers.addDriver")}
          </span>
          {editingDriver && (
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
          <Field label={t("drivers.name")}>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className={inputCls}
              placeholder={t("drivers.namePlaceholder")}
              required
            />
          </Field>
          <Field label={t("drivers.phone")}>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className={inputCls}
              placeholder="+389 70 000 000"
            />
          </Field>
          <Field label={t("drivers.licenseNo")}>
            <input
              name="licenseNumber"
              value={form.licenseNumber}
              onChange={handleChange}
              className={inputCls}
              placeholder={t("drivers.licensePlaceholder")}
            />
          </Field>
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          {editingDriver ? t("common.saveChanges") : t("drivers.createDriver")}
        </button>
      </form>

      {/* List */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-5">
        {loading ? (
          <p className="text-sm text-slate-400">{t("drivers.loading")}</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : drivers.length === 0 ? (
          <p className="text-sm text-slate-400">{t("drivers.none")}</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-700 text-xs uppercase tracking-wide">
                    <th className="py-2 pr-3 font-medium">{t("trucks.id")}</th>
                    <th className="py-2 px-3 font-medium">{t("drivers.name")}</th>
                    <th className="py-2 px-3 font-medium">{t("drivers.phone")}</th>
                    <th className="py-2 px-3 font-medium">{t("drivers.license")}</th>
                    <th className="py-2 pl-3 font-medium text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((d) => (
                    <tr
                      key={d.id}
                      className={`border-b border-slate-800 last:border-b-0 transition-colors ${
                        editingDriver?.id === d.id ? "bg-slate-800/40" : "hover:bg-slate-800/20"
                      }`}
                    >
                      <td className="py-2.5 pr-3 text-slate-500 text-xs">#{d.id}</td>
                      <td className="py-2.5 px-3 text-slate-100 font-medium">{d.name}</td>
                      <td className="py-2.5 px-3 text-slate-300">{d.phone || "—"}</td>
                      <td className="py-2.5 px-3 text-slate-300">{d.licenseNumber || "—"}</td>
                      <td className="py-2.5 pl-3 text-right">
                        <button
                          onClick={() => startEdit(d)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 mr-2 transition-colors"
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
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
              {drivers.map((d) => (
                <div
                  key={d.id}
                  className={`border rounded-xl p-3 transition-colors ${
                    editingDriver?.id === d.id
                      ? "border-blue-500/40 bg-slate-800/60"
                      : "border-slate-700 bg-slate-800/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-sm font-semibold text-slate-100">{d.name}</span>
                      <span className="ml-2 text-xs text-slate-500">#{d.id}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-3">
                    <div>
                      <div className="text-slate-500 uppercase tracking-wide">{t("drivers.phone")}</div>
                      <div className="text-slate-300">{d.phone || "—"}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 uppercase tracking-wide">{t("drivers.license")}</div>
                      <div className="text-slate-300">{d.licenseNumber || "—"}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(d)}
                      className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
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
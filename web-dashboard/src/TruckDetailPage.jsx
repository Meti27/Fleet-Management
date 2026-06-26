import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useT } from "./i18n";
import {
  fetchTruck, fetchTruckSummary, fetchTruckReminders,
  fetchFuelLogs, addFuelLog, deleteFuelLog,
  fetchMaintenance, addMaintenance, deleteMaintenance,
  fetchOdometer, addOdometer,
  fetchDocuments, addDocument, deleteDocument,
  fetchSchedules, upsertSchedule, deleteSchedule,
} from "./api";

const MAINT_TYPES = ["OIL_CHANGE", "TIRE_REPLACEMENT", "TIRE_REPAIR", "BRAKES", "INSPECTION", "REPAIR", "OTHER"];
const DOC_TYPES = ["REGISTRATION", "INSURANCE", "INSPECTION", "OTHER"];
const TABS = ["Fuel", "Maintenance", "Odometer", "Documents", "Schedules"];

export default function TruckDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useT();
  const [truck, setTruck] = useState(null);
  const [summary, setSummary] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [tab, setTab] = useState("Fuel");
  const [error, setError] = useState("");

  async function reload() {
    try {
      const [tr, s, r] = await Promise.all([
        fetchTruck(id), fetchTruckSummary(id), fetchTruckReminders(id),
      ]);
      setTruck(tr); setSummary(s); setReminders(r); setError("");
    } catch (err) {
      console.error(err);
      setError(t("truckDetail.failedLoad"));
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [id]);

  if (error) {
    return <div className="max-w-5xl mx-auto px-4 py-6"><p className="text-red-400">{error}</p></div>;
  }
  if (!truck || !summary) {
    return <div className="max-w-5xl mx-auto px-4 py-6"><p className="text-slate-400">{t("common.loading")}</p></div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/trucks")} className="text-xs text-slate-400 hover:text-slate-200">← {t("truckDetail.back")}</button>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-50">{truck.plateNumber}</h1>
        <span className="text-sm text-slate-500">{truck.model || ""}</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric label={t("truckDetail.currentKm")} value={fmtKm(summary.currentOdometerKm)} />
        <Metric label={t("truckDetail.fuelSpend")} value={fmtEur(summary.totalFuelCost)} />
        <Metric label={t("truckDetail.maintSpend")} value={fmtEur(summary.totalMaintenanceCost)} />
        <Metric label={t("truckDetail.avgConsumption")} value={summary.avgFuelEfficiencyL100km != null ? summary.avgFuelEfficiencyL100km.toFixed(1) : "—"} />
        <Metric label={t("truckDetail.openAlerts")} value={summary.openReminders} accent={summary.openReminders > 0 ? "text-amber-300" : "text-slate-50"} />
      </div>

      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 sm:p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-100">{t("truckDetail.reminders")}</h2>
          {reminders.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <StatusPill status={r.status} />
              <span className="text-slate-300">{r.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-700">
        {TABS.map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === key ? "border-amber-500 text-slate-50" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t(`truckDetail.tab${key}`)}
          </button>
        ))}
      </div>

      {tab === "Fuel" && <FuelTab truckId={id} onChange={reload} />}
      {tab === "Maintenance" && <MaintenanceTab truckId={id} onChange={reload} />}
      {tab === "Odometer" && <OdometerTab truckId={id} onChange={reload} />}
      {tab === "Documents" && <DocumentsTab truckId={id} onChange={reload} />}
      {tab === "Schedules" && <SchedulesTab truckId={id} onChange={reload} />}
    </div>
  );
}

/* ----------------------------- Fuel ----------------------------- */
function FuelTab({ truckId, onChange }) {
  const { t } = useT();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ filledAt: "", liters: "", costEur: "", odometerKm: "", station: "" });
  function load() { return fetchFuelLogs(truckId).then(setRows).catch(console.error); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [truckId]);

  async function submit(e) {
    e.preventDefault();
    try {
      await addFuelLog(truckId, {
        filledAt: form.filledAt || null,
        liters: numOrNull(form.liters),
        costEur: numOrNull(form.costEur),
        odometerKm: intOrNull(form.odometerKm),
        station: form.station || null,
      });
      setForm({ filledAt: "", liters: "", costEur: "", odometerKm: "", station: "" });
      await load(); onChange();
    } catch (err) { alert(err.message); }
  }
  async function remove(rid) {
    if (!window.confirm(t("truckDetail.deleteFuel"))) return;
    try { await deleteFuelLog(truckId, rid); await load(); onChange(); } catch (err) { alert(err.message); }
  }

  return (
    <Section>
      <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
        <Field label={t("common.date")}><input type="datetime-local" className={inputCls} value={form.filledAt} onChange={(e) => setForm({ ...form, filledAt: e.target.value })} /></Field>
        <Field label={t("truckDetail.liters")}><input type="number" step="0.01" min="0" required className={inputCls} value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} /></Field>
        <Field label={t("truckDetail.costEur")}><input type="number" step="0.01" min="0" className={inputCls} value={form.costEur} onChange={(e) => setForm({ ...form, costEur: e.target.value })} /></Field>
        <Field label={t("truckDetail.odometerKm")}><input type="number" min="0" className={inputCls} value={form.odometerKm} onChange={(e) => setForm({ ...form, odometerKm: e.target.value })} /></Field>
        <Field label={t("common.station")}><input className={inputCls} value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} /></Field>
        <button className={btnCls}>{t("common.add")}</button>
      </form>
      <Table head={[t("common.date"), t("truckDetail.liters"), t("truckDetail.cost"), t("truckDetail.odometer"), t("common.station"), ""]}>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-slate-800 last:border-0">
            <Td>{fmtDate(r.filledAt)}</Td><Td>{r.liters} L</Td><Td>{fmtEur(r.costEur)}</Td>
            <Td>{fmtKm(r.odometerKm)}</Td><Td>{r.station || "—"}</Td>
            <Td right><DelBtn onClick={() => remove(r.id)} /></Td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

/* -------------------------- Maintenance ------------------------- */
function MaintenanceTab({ truckId, onChange }) {
  const { t } = useT();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ type: "OIL_CHANGE", performedAt: "", odometerKm: "", costEur: "", vendor: "", notes: "" });
  function load() { return fetchMaintenance(truckId).then(setRows).catch(console.error); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [truckId]);

  async function submit(e) {
    e.preventDefault();
    try {
      await addMaintenance(truckId, {
        type: form.type, performedAt: form.performedAt || null,
        odometerKm: intOrNull(form.odometerKm), costEur: numOrNull(form.costEur),
        vendor: form.vendor || null, notes: form.notes || null,
      });
      setForm({ type: "OIL_CHANGE", performedAt: "", odometerKm: "", costEur: "", vendor: "", notes: "" });
      await load(); onChange();
    } catch (err) { alert(err.message); }
  }
  async function remove(rid) {
    if (!window.confirm(t("truckDetail.deleteRecord"))) return;
    try { await deleteMaintenance(truckId, rid); await load(); onChange(); } catch (err) { alert(err.message); }
  }

  return (
    <Section>
      <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
        <Field label={t("common.type")}><select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{MAINT_TYPES.map((v) => <option key={v} value={v}>{t(`maintType.${v}`)}</option>)}</select></Field>
        <Field label={t("common.date")}><input type="datetime-local" className={inputCls} value={form.performedAt} onChange={(e) => setForm({ ...form, performedAt: e.target.value })} /></Field>
        <Field label={t("truckDetail.odometerKm")}><input type="number" min="0" className={inputCls} value={form.odometerKm} onChange={(e) => setForm({ ...form, odometerKm: e.target.value })} /></Field>
        <Field label={t("truckDetail.costEur")}><input type="number" step="0.01" min="0" className={inputCls} value={form.costEur} onChange={(e) => setForm({ ...form, costEur: e.target.value })} /></Field>
        <Field label={t("common.vendor")}><input className={inputCls} value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></Field>
        <button className={btnCls}>{t("common.add")}</button>
      </form>
      <Table head={[t("common.date"), t("common.type"), t("truckDetail.odometer"), t("truckDetail.cost"), t("common.vendor"), t("common.notes"), ""]}>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-slate-800 last:border-0">
            <Td>{fmtDate(r.performedAt)}</Td><Td>{t(`maintType.${r.type}`)}</Td><Td>{fmtKm(r.odometerKm)}</Td>
            <Td>{fmtEur(r.costEur)}</Td><Td>{r.vendor || "—"}</Td><Td>{r.notes || "—"}</Td>
            <Td right><DelBtn onClick={() => remove(r.id)} /></Td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

/* ---------------------------- Odometer -------------------------- */
function OdometerTab({ truckId, onChange }) {
  const { t } = useT();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ readingKm: "", recordedAt: "", note: "" });
  function load() { return fetchOdometer(truckId).then(setRows).catch(console.error); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [truckId]);

  async function submit(e) {
    e.preventDefault();
    try {
      await addOdometer(truckId, { readingKm: intOrNull(form.readingKm), recordedAt: form.recordedAt || null, note: form.note || null });
      setForm({ readingKm: "", recordedAt: "", note: "" });
      await load(); onChange();
    } catch (err) { alert(err.message); }
  }

  return (
    <Section>
      <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
        <Field label={t("truckDetail.readingKm")}><input type="number" min="0" required className={inputCls} value={form.readingKm} onChange={(e) => setForm({ ...form, readingKm: e.target.value })} /></Field>
        <Field label={t("common.date")}><input type="datetime-local" className={inputCls} value={form.recordedAt} onChange={(e) => setForm({ ...form, recordedAt: e.target.value })} /></Field>
        <Field label={t("common.note")}><input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        <button className={btnCls}>{t("common.add")}</button>
      </form>
      <Table head={[t("common.date"), t("truckDetail.reading"), t("common.source"), t("common.note")]}>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-slate-800 last:border-0">
            <Td>{fmtDate(r.recordedAt)}</Td><Td>{fmtKm(r.readingKm)}</Td><Td>{t(`source.${r.source}`)}</Td><Td>{r.note || "—"}</Td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

/* --------------------------- Documents -------------------------- */
function DocumentsTab({ truckId, onChange }) {
  const { t } = useT();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ type: "INSURANCE", documentNumber: "", issuedOn: "", expiresOn: "", note: "" });
  function load() { return fetchDocuments(truckId).then(setRows).catch(console.error); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [truckId]);

  async function submit(e) {
    e.preventDefault();
    try {
      await addDocument(truckId, {
        type: form.type, documentNumber: form.documentNumber || null,
        issuedOn: form.issuedOn || null, expiresOn: form.expiresOn || null, note: form.note || null,
      });
      setForm({ type: "INSURANCE", documentNumber: "", issuedOn: "", expiresOn: "", note: "" });
      await load(); onChange();
    } catch (err) { alert(err.message); }
  }
  async function remove(rid) {
    if (!window.confirm(t("truckDetail.deleteDocument"))) return;
    try { await deleteDocument(truckId, rid); await load(); onChange(); } catch (err) { alert(err.message); }
  }

  return (
    <Section>
      <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
        <Field label={t("common.type")}><select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{DOC_TYPES.map((v) => <option key={v} value={v}>{t(`docType.${v}`)}</option>)}</select></Field>
        <Field label={t("common.number")}><input className={inputCls} value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} /></Field>
        <Field label={t("truckDetail.issued")}><input type="date" className={inputCls} value={form.issuedOn} onChange={(e) => setForm({ ...form, issuedOn: e.target.value })} /></Field>
        <Field label={t("truckDetail.expires")}><input type="date" required className={inputCls} value={form.expiresOn} onChange={(e) => setForm({ ...form, expiresOn: e.target.value })} /></Field>
        <Field label={t("common.note")}><input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        <button className={btnCls}>{t("common.add")}</button>
      </form>
      <Table head={[t("common.type"), t("common.number"), t("truckDetail.issued"), t("truckDetail.expires"), t("common.note"), ""]}>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-slate-800 last:border-0">
            <Td>{t(`docType.${r.type}`)}</Td><Td>{r.documentNumber || "—"}</Td><Td>{r.issuedOn || "—"}</Td>
            <Td><span className={expiryCls(r.expiresOn)}>{r.expiresOn}</span></Td><Td>{r.note || "—"}</Td>
            <Td right><DelBtn onClick={() => remove(r.id)} /></Td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

/* --------------------------- Schedules -------------------------- */
function SchedulesTab({ truckId, onChange }) {
  const { t } = useT();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ type: "OIL_CHANGE", intervalKm: "", intervalMonths: "", note: "" });
  function load() { return fetchSchedules(truckId).then(setRows).catch(console.error); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [truckId]);

  async function submit(e) {
    e.preventDefault();
    try {
      await upsertSchedule(truckId, {
        type: form.type, intervalKm: intOrNull(form.intervalKm),
        intervalMonths: intOrNull(form.intervalMonths), note: form.note || null,
      });
      setForm({ type: "OIL_CHANGE", intervalKm: "", intervalMonths: "", note: "" });
      await load(); onChange();
    } catch (err) { alert(err.message); }
  }
  async function remove(rid) {
    if (!window.confirm(t("truckDetail.deleteSchedule"))) return;
    try { await deleteSchedule(truckId, rid); await load(); onChange(); } catch (err) { alert(err.message); }
  }

  return (
    <Section>
      <p className="text-xs text-slate-500">{t("truckDetail.schedulesHint")}</p>
      <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
        <Field label={t("common.type")}><select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{MAINT_TYPES.map((v) => <option key={v} value={v}>{t(`maintType.${v}`)}</option>)}</select></Field>
        <Field label={t("truckDetail.everyKm")}><input type="number" min="0" className={inputCls} value={form.intervalKm} onChange={(e) => setForm({ ...form, intervalKm: e.target.value })} /></Field>
        <Field label={t("truckDetail.everyMonths")}><input type="number" min="0" className={inputCls} value={form.intervalMonths} onChange={(e) => setForm({ ...form, intervalMonths: e.target.value })} /></Field>
        <Field label={t("common.note")}><input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        <button className={btnCls}>{t("common.save")}</button>
      </form>
      <Table head={[t("common.type"), t("truckDetail.everyKm"), t("truckDetail.everyMonths"), t("common.note"), ""]}>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-slate-800 last:border-0">
            <Td>{t(`maintType.${r.type}`)}</Td><Td>{r.intervalKm ? fmtKm(r.intervalKm) : "—"}</Td>
            <Td>{r.intervalMonths ? `${r.intervalMonths} ${t("truckDetail.months")}` : "—"}</Td><Td>{r.note || "—"}</Td>
            <Td right><DelBtn onClick={() => remove(r.id)} /></Td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

/* --------------------------- shared UI -------------------------- */
const inputCls = "w-full px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500";
const btnCls = "px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium h-[38px]";

function Section({ children }) {
  return <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-4">{children}</div>;
}
function Field({ label, children }) {
  return <div className="flex flex-col gap-1"><label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</label>{children}</div>;
}
function Table({ head, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead><tr className="text-left text-slate-400 border-b border-slate-700 text-xs uppercase tracking-wide">
          {head.map((h, i) => <th key={i} className="py-2 px-2 font-medium">{h}</th>)}
        </tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Td({ children, right }) {
  return <td className={`py-2 px-2 text-slate-200 ${right ? "text-right" : ""}`}>{children}</td>;
}
function DelBtn({ onClick }) {
  const { t } = useT();
  return <button onClick={onClick} className="text-xs px-2 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400">{t("common.delete")}</button>;
}
function Metric({ label, value, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">{label}</div>
      <div className={`text-lg font-semibold ${accent || "text-slate-50"}`}>{value}</div>
    </div>
  );
}
function StatusPill({ status }) {
  const { t } = useT();
  const cls = status === "OVERDUE" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300";
  return <span className={`inline-flex text-[11px] px-2 py-0.5 rounded-full ${cls}`}>{t(`status.${status}`)}</span>;
}

/* ----------------------------- utils ---------------------------- */
const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
const intOrNull = (v) => (v === "" || v == null ? null : parseInt(v, 10));
const fmtKm = (v) => (v != null ? `${v.toLocaleString()} km` : "—");
const fmtEur = (v) => (v != null ? `${Number(v).toFixed(2)} €` : "—");
function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? v : d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}
function expiryCls(dateStr) {
  if (!dateStr) return "text-slate-200";
  const days = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (days < 0) return "text-red-300 font-medium";
  if (days <= 30) return "text-amber-300 font-medium";
  return "text-slate-200";
}

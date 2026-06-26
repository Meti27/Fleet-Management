import { useT } from "../i18n";

// Shared status badge for the driver app (mirrors the dashboard styling).
export function StatusBadge({ status }) {
  const { t } = useT();
  const cls =
    status === "DONE" ? "bg-emerald-500/20 text-emerald-300" :
    status === "IN_PROGRESS" ? "bg-amber-500/20 text-amber-300" :
    status === "CANCELLED" ? "bg-red-500/20 text-red-300" :
    status === "ASSIGNED" ? "bg-blue-500/20 text-blue-300" :
    "bg-slate-800 text-slate-300";
  return (
    <span className={`inline-flex text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium ${cls}`}>
      {t(`status.${status}`)}
    </span>
  );
}

export function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? v
    : d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

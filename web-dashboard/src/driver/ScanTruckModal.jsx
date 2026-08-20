import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "../i18n";

/**
 * Camera QR scanner used to prove the driver is physically at the truck before a
 * job can be started. Their login already says *who* they are; this says *where*.
 *
 * The scanner library is pulled in with a dynamic `import()` so it never lands in
 * the main bundle (already over 500 kB) — it downloads only when a driver actually
 * opens this modal. qr-scanner uses the native BarcodeDetector where the browser
 * has one (Android Chrome) and falls back to its own worker elsewhere (iOS Safari).
 *
 * Manual entry is always reachable: a denied camera permission would otherwise
 * dead-end the driver with no way to start their shift.
 */
export default function ScanTruckModal({ expectedPlate, onScanned, onCancel, busy }) {
  const { t } = useT();
  const videoRef = useRef(null);
  const doneRef = useRef(false);
  // Held in a ref so re-renders of the parent don't tear down and restart the camera.
  const onScannedRef = useRef(onScanned);
  useEffect(() => { onScannedRef.current = onScanned; }, [onScanned]);

  const [manual, setManual] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [code, setCode] = useState("");

  const accept = useCallback((raw) => {
    const token = extractToken(raw);
    if (!token || doneRef.current) return;
    doneRef.current = true;
    onScannedRef.current(token);
  }, []);

  useEffect(() => {
    if (manual) return undefined;

    let cancelled = false;
    let scanner = null;

    (async () => {
      try {
        const { default: QrScanner } = await import("qr-scanner");
        if (cancelled || !videoRef.current) return;

        scanner = new QrScanner(
          videoRef.current,
          (result) => accept(result?.data ?? result),
          { highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 5 }
        );
        await scanner.start();
      } catch (err) {
        if (cancelled) return;
        // Permission denied, no camera, or insecure origin (camera needs HTTPS).
        setCameraError(err?.message || t("driver.cameraUnavailable"));
        setManual(true);
      }
    })();

    return () => {
      cancelled = true;
      if (scanner) {
        scanner.stop();
        scanner.destroy();
      }
    };
  }, [manual, accept, t]);

  function submitManual(e) {
    e.preventDefault();
    accept(code);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-3">
      <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-50">{t("driver.scanTruck")}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {expectedPlate
              ? t("driver.scanHint", { plate: expectedPlate })
              : t("driver.scanHintNoPlate")}
          </p>
        </div>

        {!manual ? (
          <div className="relative bg-black aspect-square">
            {/* qr-scanner attaches its stream + scan-region highlight to this element */}
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          </div>
        ) : (
          <form onSubmit={submitManual} className="p-4 space-y-3">
            {cameraError && (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                {t("driver.cameraUnavailable")}
              </p>
            )}
            <label className="block">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                {t("driver.truckCode")}
              </span>
              <input
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("driver.truckCodePlaceholder")}
                className="mt-1 w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {t("driver.confirmCode")}
            </button>
          </form>
        )}

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => { setManual((m) => !m); setCameraError(""); }}
            className="text-xs text-amber-400 hover:text-amber-300"
          >
            {manual ? t("driver.useCameraInstead") : t("driver.enterCodeInstead")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The sticker encodes `https://<host>/t/<token>` so a generic phone camera app does
 * something sensible too — take the last path segment. A bare token passes through
 * unchanged. Whitespace is stripped so a manually typed, space-grouped code works.
 */
function extractToken(raw) {
  if (!raw) return "";
  const v = String(raw).trim().replace(/\s+/g, "");
  const slash = v.lastIndexOf("/");
  return (slash >= 0 ? v.slice(slash + 1) : v).trim();
}

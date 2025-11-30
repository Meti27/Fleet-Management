import { useState } from "react";
import JobsPage from "./JobsPage";
import DriversPage from "./DriversPage";
import TrucksPage from "./TrucksPage";

function App() {
  const [activePage, setActivePage] = useState("jobs");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <span className="font-semibold">Fleet Management Admin</span>
          <div className="flex gap-2">
            <button
              onClick={() => setActivePage("jobs")}
              className={`px-3 py-1 rounded text-sm ${
                activePage === "jobs"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-200"
              }`}
            >
              Jobs
            </button>
            <button
              onClick={() => setActivePage("drivers")}
              className={`px-3 py-1 rounded text-sm ${
                activePage === "drivers"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-200"
              }`}
            >
              Drivers
            </button>
            <button
              onClick={() => setActivePage("trucks")}
              className={`px-3 py-1 rounded text-sm ${
                activePage === "trucks"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-200"
              }`}
            >
              Trucks
            </button>
          </div>
        </div>
      </nav>

      {activePage === "jobs" && <JobsPage />}
      {activePage === "drivers" && <DriversPage />}
      {activePage === "trucks" && <TrucksPage />}
    </div>
  );
}

export default App;

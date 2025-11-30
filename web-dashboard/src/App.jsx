import { Link, Routes, Route, useLocation } from "react-router-dom";
import JobsPage from "./JobsPage";
import DriversPage from "./DriversPage";
import TrucksPage from "./TrucksPage";
import DashboardPage from "./DashboardPage";

function App() {
  const location = useLocation();
  const current = location.pathname; // "/jobs", "/drivers", "/dashboard", etc.

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <span className="font-semibold">Fleet Management Admin</span>
          <div className="flex gap-2">
            <NavButton to="/jobs" active={current.startsWith("/jobs")}>
              Jobs
            </NavButton>
            <NavButton to="/drivers" active={current.startsWith("/drivers")}>
              Drivers
            </NavButton>
            <NavButton to="/trucks" active={current.startsWith("/trucks")}>
              Trucks
            </NavButton>
            <NavButton to="/dashboard" active={current.startsWith("/dashboard")}>
              Dashboard
            </NavButton>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<DashboardPage />} />

        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/trucks" element={<TrucksPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </div>
  );
}

function NavButton({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1 rounded text-sm ${
        active
          ? "bg-blue-600 text-white"
          : "bg-slate-800 text-slate-200 hover:bg-slate-700"
      }`}
    >
      {children}
    </Link>
  );
}

export default App;

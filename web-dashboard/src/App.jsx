import { Link, Routes, Route, useLocation, Navigate } from "react-router-dom";
import JobsPage from "./JobsPage";
import DriversPage from "./DriversPage";
import TrucksPage from "./TrucksPage";
import DashboardPage from "./DashboardPage";
import LoginPage from "./LoginPage";
import { useAuth } from "./AuthContext";

function App() {
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  const current = location.pathname;

  const isLoginPage = current === "/login";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Hide navbar on login page */}
      {!isLoginPage && (
        <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
            <span className="font-semibold">Fleet Management Admin</span>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <NavButton
                  to="/dashboard"
                  active={current.startsWith("/dashboard") || current === "/"}
                >
                  Dashboard
                </NavButton>
                <NavButton to="/jobs" active={current.startsWith("/jobs")}>
                  Jobs
                </NavButton>
                <NavButton to="/drivers" active={current.startsWith("/drivers")}>
                  Drivers
                </NavButton>
                <NavButton to="/trucks" active={current.startsWith("/trucks")}>
                  Trucks
                </NavButton>
              </div>
              {isAuthenticated && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {user?.username}
                  </span>
                  <button
                    onClick={logout}
                    className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      )}

      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/jobs"
          element={
            <RequireAuth>
              <JobsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/drivers"
          element={
            <RequireAuth>
              <DriversPage />
            </RequireAuth>
          }
        />
        <Route
          path="/trucks"
          element={
            <RequireAuth>
              <TrucksPage />
            </RequireAuth>
          }
        />

        {/* Fallback: unknown route -> dashboard or login */}
        <Route path="*" element={<Navigate to="/" replace />} />
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

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default App;

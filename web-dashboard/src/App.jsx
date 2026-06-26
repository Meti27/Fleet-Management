import { Routes, Route, useLocation, Navigate, Outlet } from "react-router-dom";
import JobsPage from "./JobsPage";
import DriversPage from "./DriversPage";
import TrucksPage from "./TrucksPage";
import TruckDetailPage from "./TruckDetailPage";
import DashboardPage from "./DashboardPage";
import LiveMapPage from "./LiveMapPage";
import LoginPage from "./LoginPage";
import Navbar from "./Navbar";
import DriverJobsPage from "./driver/DriverJobsPage";
import DriverJobDetailPage from "./driver/DriverJobDetailPage";
import { DriverLocationProvider } from "./driver/DriverLocationContext";
import { useAuth } from "./AuthContext";

function App() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isLoginPage = location.pathname === "/login";
  // Driver area renders its own header (DriverHeader), so hide the admin Navbar there.
  // Match the /driver route exactly (and its sub-routes) — NOT the admin /drivers page,
  // which also starts with "/driver".
  const isDriverArea =
    location.pathname === "/driver" || location.pathname.startsWith("/driver/");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Hide navbar on login + driver pages */}
      {!isLoginPage && !isDriverArea && isAuthenticated && <Navbar />}

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
        <Route
          path="/trucks/:id"
          element={
            <RequireAuth>
              <TruckDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/map"
          element={
            <RequireAuth>
              <LiveMapPage />
            </RequireAuth>
          }
        />

        {/* Driver app (DRIVER role only). A layout route hosts the location-sharing
            provider so one tracking session spans both driver pages. */}
        <Route element={<DriverArea />}>
          <Route path="/driver" element={<DriverJobsPage />} />
          <Route path="/driver/jobs/:id" element={<DriverJobDetailPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

// Admin/dispatcher/viewer area. Drivers are bounced to their own app.
function RequireAuth({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (user?.role === "DRIVER") {
    return <Navigate to="/driver" replace />;
  }

  return children;
}

function RequireDriver({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (user?.role !== "DRIVER") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Layout for the driver app: enforces the DRIVER role and hosts the shared
// location-sharing provider so a started trip keeps tracking across both pages.
function DriverArea() {
  return (
    <RequireDriver>
      <DriverLocationProvider>
        <Outlet />
      </DriverLocationProvider>
    </RequireDriver>
  );
}

export default App;
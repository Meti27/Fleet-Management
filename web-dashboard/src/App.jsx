import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import JobsPage from "./JobsPage";
import DriversPage from "./DriversPage";
import TrucksPage from "./TrucksPage";
import DashboardPage from "./DashboardPage";
import LoginPage from "./LoginPage";
import Navbar from "./Navbar";
import { useAuth } from "./AuthContext";

function App() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isLoginPage = location.pathname === "/login";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Hide navbar on login page */}
      {!isLoginPage && isAuthenticated && <Navbar />}

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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
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
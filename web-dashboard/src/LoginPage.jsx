import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useT } from "./i18n";
import LanguageSwitcher from "./LanguageSwitcher";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || "/dashboard";

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

async function handleSubmit(e) {
  e.preventDefault();
  setError("");

  try {
    const result = await login(form.username.trim(), form.password);

    if (result?.success) {
      // Drivers go to their own app; everyone else to the dashboard (or saved route).
      const target = result.role === "DRIVER" ? "/driver" : from;
      navigate(target, { replace: true });
    } else {
      setError(result?.message || t("login.failed"));
    }
  } catch (err) {
    setError(err?.message || t("login.failed"));
  }
}


  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 px-4">
      <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">{t("login.title")}</h1>
          <LanguageSwitcher />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs mb-1 text-slate-300">
              {t("login.username")}
            </label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-sm"
              placeholder="admin"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-slate-300">
              {t("login.password")}
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-sm"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded p-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-sm font-medium rounded py-2"
          >
            {t("login.signIn")}
          </button>
        </form>
      </div>
    </div>
  );
}

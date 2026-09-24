import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { formatApiError } from "../api/adminApi";

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        formatApiError(
          err,
          "Invalid email or password. Please verify your administrator credentials.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-neutral-950 px-4 py-12 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient glowing spheres */}
      <div className="pointer-events-none absolute -top-32 left-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 right-1/3 h-96 w-96 rounded-full bg-purple-600/10 blur-[120px]" />

      <div className="relative w-full max-w-md">
        {/* Security Header Banner */}
        <div className="mb-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/20 mb-4 ring-1 ring-white/20">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Admin Console
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            Authorized administrator credentials required
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/70 p-6 sm:p-8 backdrop-blur-xl shadow-2xl ring-1 ring-white/5">
          {error && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@example.com"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950/60 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950/60 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-neutral-800/80 pt-4 text-center">
            <p className="text-[11px] text-neutral-500">
              Only users with <span className="text-cyan-400 font-medium">admin</span> role can sign in. Regular user logins will be rejected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

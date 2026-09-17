import { useState } from "react";
import axios from "axios";

const Auth = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isLogin = mode === "login";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const endpoint = isLogin ? "login" : "register";
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(
        `http://localhost:5000/api/v1/auth/${endpoint}`,
        payload,
      );

      onAuthSuccess(response.data.data.token);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
  };

  return (
    <main className="min-h-screen overflow-hidden bg-neutral-950 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
        <div className="relative grid w-full gap-8 lg:min-h-[640px] lg:grid-cols-2 lg:gap-0">
          <div
            className={`flex items-center transition-all duration-700 ease-in-out lg:absolute lg:inset-y-0 lg:w-1/2 ${
              isLogin
                ? "lg:left-0 lg:translate-x-0"
                : "lg:left-0 lg:translate-x-full"
            }`}
          >
            <div className={`max-w-2xl ${isLogin ? "lg:pr-12" : "lg:pl-12"}`}>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">
                MERN Docker
              </p>
              <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
                {isLogin
                  ? "Welcome back to your protected workspace."
                  : "Create your account and start checking your API."}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-neutral-300">
                {isLogin
                  ? "Sign in to check service health, API versions, and your app dashboard."
                  : "Register once, save your session, and move straight into the dashboard."}
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {["Protected routes", "JWT auth", "API health"].map((item) => (
                  <div
                    key={item}
                    className="border border-white/10 bg-white/[0.04] px-4 py-3"
                  >
                    <span className="text-sm text-neutral-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`transition-all duration-700 ease-in-out lg:absolute lg:inset-y-0 lg:w-1/2 ${
              isLogin
                ? "lg:left-0 lg:translate-x-full"
                : "lg:left-0 lg:translate-x-0"
            }`}
          >
            <div
              className={`flex h-full items-center ${
                isLogin ? "lg:pl-12" : "lg:pr-12"
              }`}
            >
              <div className="w-full p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">
                    {isLogin ? "Welcome back" : "Create your account"}
                  </h2>
                  <p className="mt-2 text-sm text-neutral-400">
                    {isLogin
                      ? "Use your email and password to continue."
                      : "Register once, then jump straight into the app."}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <label className="block">
                      <span className="text-sm font-medium text-neutral-300">
                        Username
                      </span>
                      <input
                        type="text"
                        name="userName"
                        value={formData.userName}
                        onChange={handleChange}
                        required
                        className="mt-2 w-full border border-white/10 bg-neutral-900 px-4 py-3 text-white outline-none transition placeholder:text-neutral-600 focus:border-cyan-300"
                        placeholder="dulaj"
                      />
                    </label>
                  )}

                  <label className="block">
                    <span className="text-sm font-medium text-neutral-300">
                      Email
                    </span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="mt-2 w-full border border-white/10 bg-neutral-900 px-4 py-3 text-white outline-none transition placeholder:text-neutral-600 focus:border-cyan-300"
                      placeholder="you@example.com"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-neutral-300">
                      Password
                    </span>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      className="mt-2 w-full border border-white/10 bg-neutral-900 px-4 py-3 text-white outline-none transition placeholder:text-neutral-600 focus:border-cyan-300"
                      placeholder="Enter your password"
                    />
                  </label>

                  {error && (
                    <div className="border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-cyan-400 px-4 py-3 font-bold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading
                      ? "Please wait..."
                      : isLogin
                        ? "Login"
                        : "Create account"}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-neutral-400">
                  {isLogin
                    ? "Don't have an account?"
                    : "Already have an account?"}
                  <button
                    type="button"
                    onClick={() => switchMode(isLogin ? "register" : "login")}
                    className="ml-2 font-semibold text-cyan-300 transition hover:text-cyan-200"
                  >
                    {isLogin ? "Register" : "Login"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Auth;

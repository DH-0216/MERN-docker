import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const Home = ({ token, onLogout }) => {
  const [profile, setProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [copied, setCopied] = useState(false);

  const [healthStatus, setHealthStatus] = useState("");
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [version, setVersion] = useState("v1");

  const activeToken = token || localStorage.getItem("authToken");

  const fetchProfile = useCallback(async () => {
    setIsProfileLoading(true);
    setProfileError("");
    try {
      if (!activeToken) {
        setProfileError("No authentication token found.");
        setIsProfileLoading(false);
        return;
      }
      const response = await axios.get("/api/v1/auth/profile", {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (response.data?.success && response.data?.data) {
        setProfile(response.data.data);
      } else {
        setProfile(response.data);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      if (err.response?.status === 401) {
        onLogout();
        return;
      }
      setProfileError(
        err.response?.data?.message || "Failed to load user profile.",
      );
    } finally {
      setIsProfileLoading(false);
    }
  }, [activeToken, onLogout]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        if (!activeToken) {
          if (!ignore) {
            setProfileError("No authentication token found.");
            setIsProfileLoading(false);
          }
          return;
        }
        const response = await axios.get("/api/v1/auth/profile", {
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        });
        if (!ignore) {
          if (response.data?.success && response.data?.data) {
            setProfile(response.data.data);
          } else {
            setProfile(response.data);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error fetching user profile:", err);
          if (err.response?.status === 401) {
            onLogout();
            return;
          }
          setProfileError(
            err.response?.data?.message || "Failed to load user profile.",
          );
        }
      } finally {
        if (!ignore) {
          setIsProfileLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [activeToken, onLogout]);

  const copyIdToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatUptime = (seconds) => {
    if (typeof seconds !== "number") return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours} hr${hours !== 1 ? "s" : ""} ${minutes} min${minutes !== 1 ? "s" : ""} ${secs} sec${secs !== 1 ? "s" : ""}`;
    }

    if (minutes > 0) {
      return `${minutes} min${minutes !== 1 ? "s" : ""} ${secs} sec${secs !== 1 ? "s" : ""}`;
    }

    return `${secs} second${secs !== 1 ? "s" : ""}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const getHealth = async () => {
    try {
      setIsLoadingHealth(true);
      const response = await axios.get(`/api/${version}/health`);

      const result = response.data;

      if (result.status === "success") {
        setHealthStatus(result.message);
        setHealthData(result.data || null);
      } else {
        setHealthStatus("API is not working fine.");
        setHealthData(null);
      }

      setTimeout(() => {
        setHealthStatus("");
        setHealthData(null);
      }, 10000);
    } catch (error) {
      setHealthStatus("Error fetching health status.");
      setHealthData(null);
      console.error("Error fetching health status:", error);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-neutral-950 text-white selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting */}
      <motion.div
        animate={{
          x: [0, 30, 0],
          y: [0, -30, 0],
          opacity: [0.12, 0.2, 0.12],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-40 left-1/4 h-[550px] w-[550px] rounded-full bg-cyan-500/20 blur-[140px]"
      />
      <motion.div
        animate={{
          x: [0, -40, 0],
          y: [0, 40, 0],
          opacity: [0.08, 0.16, 0.08],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -bottom-40 right-1/4 h-[550px] w-[550px] rounded-full bg-blue-600/20 blur-[140px]"
      />

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-950/70 backdrop-blur-xl">
        <div className="flex w-full items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-12 py-3.5">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400"></span>
              </span>
              MERN Docker
            </div>
            <span className="hidden text-xs text-neutral-500 sm:inline-block">
              Workspace v1.0
            </span>
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1.5 pr-3 shadow-inner">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 font-bold text-xs text-neutral-950 shadow-sm">
                  {profile.userName?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="text-xs font-semibold text-neutral-200">
                  {profile.userName}
                </span>
              </div>
            )}

            <motion.button
              onClick={onLogout}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900 px-4 py-2 text-xs font-semibold text-neutral-200 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Logout
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Dashboard & Workspace
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Monitor API microservices health, container status, and inspect your
            authenticated profile details.
          </p>
        </div>

        {/* Two-Column Grid: Profile Section + Health Monitor */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* USER PROFILE DETAILS SECTION */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col justify-between rounded-2xl border border-white/10 bg-neutral-900/40 p-6 backdrop-blur-xl sm:p-8"
          >
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">User Profile Details</h2>
                    <p className="text-xs text-neutral-400">
                      Decoded from authenticated JWT session
                    </p>
                  </div>
                </div>

                <motion.button
                  onClick={fetchProfile}
                  whileHover={{ scale: 1.05, rotate: 180 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  disabled={isProfileLoading}
                  title="Refresh Profile"
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-neutral-400 transition-colors hover:text-cyan-300 cursor-pointer disabled:opacity-50"
                >
                  <svg
                    className={`h-4 w-4 ${isProfileLoading ? "animate-spin" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </motion.button>
              </div>

              {/* Profile Loading State */}
              {isProfileLoading && (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <svg
                    className="h-8 w-8 animate-spin text-cyan-400"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <span className="text-xs text-neutral-400">
                    Retrieving profile data...
                  </span>
                </div>
              )}

              {/* Profile Error State */}
              {!isProfileLoading && profileError && (
                <div className="my-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 shrink-0 text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{profileError}</span>
                  </div>
                  <button
                    onClick={fetchProfile}
                    className="mt-3 text-xs font-semibold text-red-300 underline hover:text-red-200 cursor-pointer"
                  >
                    Retry loading
                  </button>
                </div>
              )}

              {/* Profile Loaded State */}
              {!isProfileLoading && profile && (
                <div className="mt-6 space-y-6">
                  {/* Avatar & Main Info Header */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-2xl font-black text-neutral-950 shadow-lg shadow-cyan-400/20">
                      {profile.userName?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold text-white">
                          {profile.userName}
                        </h3>
                        <span className="rounded-full bg-cyan-400/15 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-400/30">
                          Active
                        </span>
                      </div>
                      <p className="text-sm text-neutral-400">
                        {profile.email}
                      </p>
                    </div>
                  </div>

                  {/* Detail Cards List */}
                  <div className="grid gap-3 pt-2">
                    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                      <span className="text-xs font-medium text-neutral-400">
                        Username
                      </span>
                      <span className="font-mono text-sm font-semibold text-cyan-300">
                        @{profile.userName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                      <span className="text-xs font-medium text-neutral-400">
                        Email Address
                      </span>
                      <span className="text-sm font-medium text-neutral-200">
                        {profile.email}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                      <span className="text-xs font-medium text-neutral-400">
                        User ID
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-neutral-300">
                          {profile._id || "N/A"}
                        </span>
                        {profile._id && (
                          <motion.button
                            onClick={() => copyIdToClipboard(profile._id)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="rounded p-1 text-neutral-400 hover:text-cyan-300 cursor-pointer"
                            title="Copy ID"
                          >
                            {copied ? (
                              <svg
                                className="h-3.5 w-3.5 text-green-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            )}
                          </motion.button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                      <span className="text-xs font-medium text-neutral-400">
                        Joined On
                      </span>
                      <span className="text-xs text-neutral-300">
                        {formatDate(profile.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                      <span className="text-xs font-medium text-neutral-400">
                        Session Auth
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-green-400 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
                        JWT Verified
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-white/10 pt-4 text-xs text-neutral-500">
              Profile endpoint:{" "}
              <code className="rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-neutral-400">
                GET /api/v1/auth/profile
              </code>
            </div>
          </motion.section>

          {/* API HEALTH CHECK & SYSTEM MONITOR SECTION */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col justify-between rounded-2xl border border-white/10 bg-neutral-900/40 p-6 backdrop-blur-xl sm:p-8"
          >
            <div>
              <div className="flex items-center gap-3 border-b border-white/10 pb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold">API Health Monitor</h2>
                  <p className="text-xs text-neutral-400">
                    Live ping & diagnostic metrics for backend services
                  </p>
                </div>
              </div>

              {/* Version Selector */}
              <div className="mt-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Select API Version
                </label>
                <div className="mt-2 flex gap-3">
                  {["v1", "v2"].map((ver) => (
                    <motion.button
                      key={ver}
                      type="button"
                      onClick={() => setVersion(ver)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex-1 rounded-xl border py-2.5 text-xs font-bold uppercase transition-colors cursor-pointer ${
                        version === ver
                          ? "border-cyan-400 bg-cyan-400/15 text-cyan-300 shadow-sm shadow-cyan-400/10"
                          : "border-white/10 bg-neutral-900/60 text-neutral-400 hover:text-white"
                      }`}
                    >
                      API {ver} {ver === "v2" ? "(+ Uptime & Time)" : "(Basic)"}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Ping Button */}
              <div className="mt-6">
                <motion.button
                  onClick={getHealth}
                  disabled={isLoadingHealth}
                  whileHover={isLoadingHealth ? {} : { scale: 1.015 }}
                  whileTap={isLoadingHealth ? {} : { scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="w-full rounded-xl bg-cyan-400 px-4 py-3.5 font-bold text-neutral-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-lg shadow-cyan-400/15"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={isLoadingHealth ? "loading" : `health-${version}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-center gap-2"
                    >
                      {isLoadingHealth ? (
                        <>
                          <svg
                            className="h-4 w-4 animate-spin text-neutral-950"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8H4z"
                            />
                          </svg>
                          <span>Checking System Status...</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          <span>
                            Check Health from {version.toUpperCase()} API
                          </span>
                        </>
                      )}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </div>

              {/* Status Output Cards */}
              <div className="mt-6">
                <AnimatePresence mode="wait">
                  {healthStatus && (
                    <motion.div
                      key="status-active"
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                        </span>
                        <span className="text-sm font-bold">
                          {healthStatus}
                        </span>
                      </div>

                      {healthData && (
                        <div className="mt-3 space-y-1.5 border-t border-emerald-400/20 pt-3 font-mono text-xs text-emerald-300">
                          <div>
                            <strong className="text-neutral-300">
                              Server Uptime:
                            </strong>{" "}
                            {formatUptime(healthData.uptime)}
                          </div>
                          <div>
                            <strong className="text-neutral-300">
                              Timestamp:
                            </strong>{" "}
                            {healthData.timestamp}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {!healthStatus && !isLoadingHealth && (
                    <motion.div
                      key="status-idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-neutral-400"
                    >
                      Click the button above to execute a live health check
                      against the backend container.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-4 text-xs text-neutral-500">
              Active endpoint:{" "}
              <code className="rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-neutral-400">
                GET /api/{version}/health
              </code>
            </div>
          </motion.section>
        </div>

        {/* System Architecture Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-8 grid gap-4 sm:grid-cols-4"
        >
          {[
            { label: "Frontend", val: "React 19 + Vite" },
            { label: "Backend API", val: "Node.js + Express" },
            { label: "Database", val: "MongoDB + Mongoose" },
            { label: "Deployment", val: "Docker Compose" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
            >
              <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                {item.label}
              </span>
              <span className="mt-1 block text-sm font-bold text-neutral-200">
                {item.val}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </main>
  );
};

export default Home;

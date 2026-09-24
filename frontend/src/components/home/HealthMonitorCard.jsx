import { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const HealthMonitorCard = () => {
  const [version, setVersion] = useState("v1");
  const [healthStatus, setHealthStatus] = useState("");
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [healthData, setHealthData] = useState(null);

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
                  <span className="text-sm font-bold">{healthStatus}</span>
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
                      <strong className="text-neutral-300">Timestamp:</strong>{" "}
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
                Click the button above to execute a live health check against
                the backend container.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
};

export default HealthMonitorCard;

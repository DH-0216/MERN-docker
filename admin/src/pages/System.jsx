import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Zap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HardDrive,
  Layers,
} from "lucide-react";
import { adminService } from "../api/adminApi";

export const System = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Latency test results
  const [endpoints, setEndpoints] = useState([
    {
      name: "API v1 Health Endpoint",
      path: "/api/v1/health",
      status: null,
      latency: null,
      loading: false,
    },
    {
      name: "API v2 Detailed Health",
      path: "/api/v2/health",
      status: null,
      latency: null,
      loading: false,
    },
    {
      name: "Admin Metrics Service",
      path: "/api/v1/admin/stats",
      status: null,
      latency: null,
      loading: false,
    },
  ]);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getStats();
      setStats(res.data?.data);
    } catch (err) {
      console.error("Failed to fetch system stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runLatencyTest = useCallback(async () => {
    const updated = [...endpoints];

    for (let i = 0; i < updated.length; i++) {
      updated[i].loading = true;
      setEndpoints([...updated]);

      const start = performance.now();
      try {
        if (updated[i].path === "/api/v1/health") {
          await adminService.checkV1Health();
        } else if (updated[i].path === "/api/v2/health") {
          await adminService.checkV2Health();
        } else {
          await adminService.getStats();
        }
        const latency = Math.round(performance.now() - start);
        updated[i].status = "online";
        updated[i].latency = latency;
      } catch {
        updated[i].status = "offline";
        updated[i].latency = null;
      } finally {
        updated[i].loading = false;
        setEndpoints([...updated]);
      }
    }
  }, [endpoints]);

  useEffect(() => {
    fetchStats();
    runLatencyTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStats]);

  const system = stats?.system;
  const memory = system?.memory;

  const heapPercentage =
    memory?.heapTotalMB && memory?.heapUsedMB
      ? Math.min(
          100,
          Math.round((memory.heapUsedMB / memory.heapTotalMB) * 100),
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            System Diagnostics & Cluster Health
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time memory allocation, endpoint benchmarks, and microservice status
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchStats();
            runLatencyTest();
          }}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Run Benchmarks</span>
        </button>
      </div>

      {/* Grid: Diagnostics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Endpoint Benchmark Panel */}
        <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4 border-b border-neutral-800/80 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              API Latency & Endpoint Health
            </h2>
            <span className="text-[11px] text-neutral-400">Response Speed</span>
          </div>

          <div className="space-y-3">
            {endpoints.map((ep) => (
              <div
                key={ep.path}
                className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5"
              >
                <div>
                  <p className="text-xs font-semibold text-white">{ep.name}</p>
                  <p className="font-mono text-[10px] text-neutral-400 mt-0.5">
                    {ep.path}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {ep.loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                  ) : ep.status === "online" ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-emerald-400">
                        {ep.latency} ms
                      </span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                  ) : ep.status === "offline" ? (
                    <div className="flex items-center gap-1.5 text-xs text-red-400">
                      <span>Offline</span>
                      <XCircle className="h-4 w-4" />
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-500">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Memory Allocation Gauge */}
        <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4 border-b border-neutral-800/80 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-purple-400" />
              V8 Memory & Heap Allocation
            </h2>
            <span className="text-[11px] font-mono text-purple-400">
              {heapPercentage}% used
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-neutral-400">V8 Heap Consumption</span>
                <span className="text-white font-mono">
                  {memory?.heapUsedMB || 0} MB / {memory?.heapTotalMB || 0} MB
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${heapPercentage}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
                <p className="text-[11px] text-neutral-400">Resident Set Size (RSS)</p>
                <p className="text-lg font-bold text-white font-mono mt-1">
                  {memory?.rssMB || 0} MB
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Total process memory
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
                <p className="text-[11px] text-neutral-400">Heap Total</p>
                <p className="text-lg font-bold text-white font-mono mt-1">
                  {memory?.heapTotalMB || 0} MB
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Allocated V8 memory
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture & Docker Cluster Overview */}
      <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4 border-b border-neutral-800/80 pb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            Fullstack Architecture & Container Mapping
          </h2>
          <span className="text-[11px] text-neutral-400">Docker Services</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">admin</span>
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
                Port 5174
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Vite React Admin Dashboard with Tailwind v4 & RBAC control
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">client</span>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                Port 5173
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              User Frontend Portal for regular customer interactions
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">server</span>
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
                Port 5000
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Node Express API with JWT auth, rate limiting, and RBAC
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">mongo</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                Port 27017
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              MongoDB 7.0 database engine with persistent volume data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default System;

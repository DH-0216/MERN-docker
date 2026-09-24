import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Shield,
  UserCheck,
  Clock,
  Database,
  ArrowRight,
  RefreshCw,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import StatsCard from "../components/common/StatsCard";
import CreateUserModal from "../components/users/CreateUserModal";
import { adminService, formatApiError } from "../api/adminApi";

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers({ page: 1, limit: 5, sortBy: "createdAt", sortOrder: "desc" }),
      ]);
      setStats(statsRes.data?.data);
      setRecentUsers(usersRes.data?.data?.users || []);
    } catch (err) {
      setError(
        formatApiError(
          err,
          "Failed to load dashboard metrics. Ensure server is online.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatUptime = (seconds) => {
    if (!seconds && seconds !== 0) return "N/A";
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${Math.floor(seconds % 60)}s`;
  };

  const metrics = stats?.metrics;
  const system = stats?.system;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Administrative Overview
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time insights across MongoDB, authentication, and Docker container cluster
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/80 px-3.5 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-opacity"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={metrics ? metrics.totalUsers : "..."}
          subtitle={`+${metrics?.newUsers7d || 0} registered this week`}
          icon={Users}
          colorScheme="cyan"
        />
        <StatsCard
          title="Administrators"
          value={metrics ? metrics.adminCount : "..."}
          subtitle="Privileged admin accounts"
          icon={Shield}
          colorScheme="purple"
        />
        <StatsCard
          title="Regular Users"
          value={metrics ? metrics.regularUsersCount : "..."}
          subtitle="Standard member accounts"
          icon={UserCheck}
          colorScheme="emerald"
        />
        <StatsCard
          title="Server Uptime"
          value={system ? formatUptime(system.uptime) : "..."}
          subtitle={`Memory RSS: ${system?.memory?.rssMB || "..."} MB`}
          icon={Clock}
          colorScheme="amber"
        />
      </div>

      {/* Grid: System Status & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* System Health Card */}
        <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4 border-b border-neutral-800/80 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-400" />
              Infrastructure Status
            </h2>
            <Link
              to="/system"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              Details
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-neutral-400">Database Engine</span>
              <span className="font-medium text-white flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    system?.mongoStatus === "connected"
                      ? "bg-emerald-400 shadow-sm shadow-emerald-400"
                      : "bg-red-400"
                  }`}
                />
                MongoDB 7.0 ({system?.mongoStatus || "Checking"})
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-neutral-800/60">
              <span className="text-neutral-400">Node.js Runtime</span>
              <span className="font-medium text-white font-mono">
                {system?.nodeVersion || "..."} ({system?.platform || "..."})
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-neutral-800/60">
              <span className="text-neutral-400">Memory (Heap Used)</span>
              <span className="font-medium text-white font-mono">
                {system?.memory?.heapUsedMB || 0} MB / {system?.memory?.heapTotalMB || 0} MB
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-neutral-800/60">
              <span className="text-neutral-400">New Users (24h)</span>
              <span className="font-semibold text-cyan-400 font-mono">
                +{metrics?.newUsers24h || 0} accounts
              </span>
            </div>
          </div>
        </div>

        {/* Recent Registrations Table (Spans 2 columns) */}
        <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-6 backdrop-blur-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-4 border-b border-neutral-800/80 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Recent User Registrations
              </h2>
              <p className="text-[11px] text-neutral-400">
                Latest accounts created in the system
              </p>
            </div>
            <Link
              to="/users"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              View All ({metrics?.totalUsers || 0})
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              No users registered yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800/60 text-neutral-400">
                    <th className="pb-2.5 font-medium">User</th>
                    <th className="pb-2.5 font-medium">Email</th>
                    <th className="pb-2.5 font-medium">Role</th>
                    <th className="pb-2.5 font-medium">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/40">
                  {recentUsers.map((u) => (
                    <tr key={u._id} className="group hover:bg-neutral-800/30">
                      <td className="py-2.5 font-medium text-white flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-800 text-[10px] font-bold text-neutral-300 uppercase">
                          {u.userName.slice(0, 2)}
                        </div>
                        {u.userName}
                      </td>
                      <td className="py-2.5 text-neutral-300">{u.email}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            u.role === "admin"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          }`}
                        >
                          {u.role === "admin" && <Shield className="h-2.5 w-2.5" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 text-neutral-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
};

export default Dashboard;

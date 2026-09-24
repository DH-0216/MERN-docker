import { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const RbacTestPanel = ({ token }) => {
  const [adminStatus, setAdminStatus] = useState(null);
  const [isAdminTesting, setIsAdminTesting] = useState(false);

  const testAdminRoute = async () => {
    setIsAdminTesting(true);
    setAdminStatus(null);
    try {
      const res = await axios.get("/api/v1/auth/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdminStatus({
        success: true,
        status: res.status,
        message: res.data.message,
        data: res.data.data,
      });
    } catch (err) {
      setAdminStatus({
        success: false,
        status: err.response?.status || 500,
        message: err.response?.data?.message || "Failed to access admin endpoint",
      });
    } finally {
      setIsAdminTesting(false);
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-neutral-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="block text-xs font-bold text-neutral-200">
            Role-Based Authorization (RBAC)
          </span>
          <span className="block text-[11px] text-neutral-400">
            Test admin role permissions
          </span>
        </div>
        <motion.button
          type="button"
          onClick={testAdminRoute}
          disabled={isAdminTesting}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="shrink-0 rounded-lg bg-cyan-400/15 border border-cyan-400/30 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/25 cursor-pointer disabled:opacity-50"
        >
          {isAdminTesting ? "Testing..." : "Test Admin Route"}
        </motion.button>
      </div>

      {adminStatus && (
        <div
          className={`mt-3 rounded-lg border p-3 text-xs ${
            adminStatus.success
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-400/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          <div className="font-semibold">
            HTTP {adminStatus.status}: {adminStatus.message}
          </div>
          {adminStatus.data && (
            <div className="mt-1 font-mono text-[11px] text-neutral-300">
              Total Users: {adminStatus.data.totalUsers} | Admins:{" "}
              {adminStatus.data.adminCount}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RbacTestPanel;

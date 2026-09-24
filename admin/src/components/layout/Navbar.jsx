import { useState, useEffect } from "react";
import { Menu, LogOut, Shield, Wifi, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { adminService } from "../../api/adminApi";
import Modal from "../common/Modal";

export const Navbar = ({ onOpenSidebar, pageTitle }) => {
  const { adminUser, logout } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [pingStatus, setPingStatus] = useState({ ok: true, latency: null });
  const [isCheckingPing, setIsCheckingPing] = useState(false);

  const checkPing = async () => {
    setIsCheckingPing(true);
    const start = performance.now();
    try {
      await adminService.checkV2Health();
      const latency = Math.round(performance.now() - start);
      setPingStatus({ ok: true, latency });
    } catch {
      setPingStatus({ ok: false, latency: null });
    } finally {
      setIsCheckingPing(false);
    }
  };

  useEffect(() => {
    checkPing();
    const interval = setInterval(checkPing, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-neutral-800/80 bg-neutral-950/80 px-4 sm:px-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              {pageTitle || "Dashboard Overview"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Server Ping Badge */}
          <button
            type="button"
            onClick={checkPing}
            title="Click to re-ping server"
            disabled={isCheckingPing}
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
              pingStatus.ok
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
            }`}
          >
            <Wifi className={`h-3 w-3 ${isCheckingPing ? "animate-spin" : ""}`} />
            <span>
              {pingStatus.ok
                ? `${pingStatus.latency !== null ? `${pingStatus.latency}ms` : "API Online"}`
                : "API Offline"}
            </span>
          </button>

          {/* Admin Profile Info */}
          <div className="flex items-center gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-500 text-xs font-bold text-white uppercase">
              {adminUser?.userName ? adminUser.userName.slice(0, 2) : "AD"}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-white leading-tight">
                {adminUser?.userName || "Administrator"}
              </p>
              <div className="flex items-center gap-1">
                <Shield className="h-2.5 w-2.5 text-cyan-400" />
                <span className="text-[10px] text-cyan-400 uppercase font-semibold tracking-wider">
                  Admin
                </span>
              </div>
            </div>
          </div>

          {/* Logout button */}
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/50 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-all"
            title="Sign out of Admin Dashboard"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => !isLoggingOut && setIsLogoutModalOpen(false)}
        title="Confirm Sign Out"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-300">
            Are you sure you want to end your administrator session? You will need to sign in again to access the control panel.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => setIsLogoutModalOpen(false)}
              className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleConfirmLogout}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              {isLoggingOut && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Navbar;

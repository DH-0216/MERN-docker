import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Activity,
  ShieldAlert,
  Server,
} from "lucide-react";

export const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const navItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
    },
    {
      name: "User Management",
      path: "/users",
      icon: Users,
    },
    {
      name: "System & Health",
      path: "/system",
      icon: Activity,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-neutral-800/80 bg-neutral-950/95 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center gap-3 border-b border-neutral-800/80 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              Admin Portal
              <span className="rounded-full bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-400 border border-cyan-500/20">
                PRO
              </span>
            </h1>
            <p className="text-xs text-neutral-400">MERN Cloud Control</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 px-3 py-6">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    isActive ? "text-cyan-400" : "text-neutral-400 group-hover:text-white"
                  }`}
                />
                <span>{item.name}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Service status indicator card */}
        <div className="p-4 border-t border-neutral-800/80">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
            <div className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
              <Server className="h-4 w-4 text-emerald-400" />
              <span>Docker Cluster</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Admin App running on port 5174
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

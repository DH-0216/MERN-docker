import { motion } from "framer-motion";

const HomeNavbar = ({ profile, onLogout }) => {
  return (
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
  );
};

export default HomeNavbar;

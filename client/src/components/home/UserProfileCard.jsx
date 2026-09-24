import { useState } from "react";
import { motion } from "framer-motion";
import RbacTestPanel from "./RbacTestPanel";

const UserProfileCard = ({
  profile,
  isLoading,
  error,
  token,
  onRefresh,
  onOpenDeleteModal,
}) => {
  const [copied, setCopied] = useState(false);

  const copyIdToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  return (
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
            onClick={onRefresh}
            whileHover={{ scale: 1.05, rotate: 180 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.3 }}
            disabled={isLoading}
            title="Refresh Profile"
            className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-neutral-400 transition-colors hover:text-cyan-300 cursor-pointer disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
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
        {isLoading && (
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
        {!isLoading && error && (
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
              <span>{error}</span>
            </div>
            <button
              onClick={onRefresh}
              className="mt-3 text-xs font-semibold text-red-300 underline hover:text-red-200 cursor-pointer"
            >
              Retry loading
            </button>
          </div>
        )}

        {/* Profile Loaded State */}
        {!isLoading && profile && (
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
                <p className="text-sm text-neutral-400">{profile.email}</p>
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
                  Assigned Role
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                    profile.role === "admin"
                      ? "border border-purple-400/30 bg-purple-500/15 text-purple-300"
                      : "border border-cyan-400/30 bg-cyan-500/15 text-cyan-300"
                  }`}
                >
                  {profile.role || "user"}
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

              {/* RBAC Route Test Panel Component */}
              <RbacTestPanel token={token} />

              {/* Danger Zone: Account Deletion */}
              <div className="mt-2 rounded-xl border border-red-500/25 bg-red-950/20 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-2 w-2 rounded-full bg-red-400"></span>
                      <span className="text-xs font-bold text-red-200">
                        Danger Zone
                      </span>
                    </div>
                    <span className="block text-[11px] text-neutral-400 mt-0.5">
                      Permanently delete your account and profile data
                    </span>
                  </div>
                  <motion.button
                    type="button"
                    onClick={onOpenDeleteModal}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="shrink-0 flex items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/25 hover:border-red-500/60 cursor-pointer shadow-sm shadow-red-500/10"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete Account
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
};

export default UserProfileCard;

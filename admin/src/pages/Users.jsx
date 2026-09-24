import { useState, useEffect, useCallback } from "react";
import {
  Users as UsersIcon,
  Search,
  Filter,
  UserPlus,
  Shield,
  User,
  Trash2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { adminService, formatApiError } from "../api/adminApi";
import CreateUserModal from "../components/users/CreateUserModal";
import RoleChangeModal from "../components/users/RoleChangeModal";
import DeleteConfirmModal from "../components/users/DeleteConfirmModal";

export const Users = () => {
  const { adminUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    totalUsers: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState(null);

  const fetchUsers = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError("");
      try {
        const res = await adminService.getUsers({
          page,
          limit: pagination.limit,
          search: searchTerm,
          role: roleFilter,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        const data = res.data?.data;
        setUsers(data?.users || []);
        if (data?.pagination) {
          setPagination(data.pagination);
        }
      } catch (err) {
        setError(formatApiError(err, "Failed to load users list from server."));
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, searchTerm, roleFilter],
  );

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-cyan-400" />
            User Accounts
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Manage system credentials, administrator privileges, and account lifecycles
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchUsers(pagination.currentPage)}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/80 px-3.5 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-opacity"
          >
            <UserPlus className="h-4 w-4" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username or email..."
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950/60 pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </form>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-400">
            <Filter className="h-3.5 w-3.5 text-neutral-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs"
            >
              <option value="all" className="bg-neutral-900 text-white">
                All Roles
              </option>
              <option value="admin" className="bg-neutral-900 text-white">
                Administrators Only
              </option>
              <option value="user" className="bg-neutral-900 text-white">
                Standard Users Only
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/60 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800/80 bg-neutral-950/40 text-neutral-400">
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">
                  Account / Username
                </th>
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">
                  Email Address
                </th>
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">
                  Role
                </th>
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">
                  Registration Date
                </th>
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-neutral-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-cyan-400" />
                    Loading user records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-neutral-400">
                    No users matching the search query or filters found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrentAdmin =
                    adminUser?._id && u._id === adminUser._id;

                  return (
                    <tr
                      key={u._id}
                      className="group transition-colors hover:bg-neutral-800/30"
                    >
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-xs font-bold text-cyan-300 ring-1 ring-white/10 uppercase">
                            {u.userName.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span>{u.userName}</span>
                              {isCurrentAdmin && (
                                <span className="rounded-full bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-400 border border-cyan-500/20">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-neutral-500">
                              {u._id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-neutral-300">
                        {u.email}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                            u.role === "admin"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : "bg-neutral-800 text-neutral-300 border border-neutral-700/60"
                          }`}
                        >
                          {u.role === "admin" ? (
                            <Shield className="h-3 w-3" />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-neutral-400">
                        <div>
                          <p>{new Date(u.createdAt).toLocaleDateString()}</p>
                          <p className="text-[10px] text-neutral-500">
                            {new Date(u.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Toggle role button */}
                          <button
                            type="button"
                            disabled={isCurrentAdmin}
                            onClick={() => setSelectedUserForRole(u)}
                            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                              isCurrentAdmin
                                ? "border-neutral-800 text-neutral-600 cursor-not-allowed"
                                : u.role === "admin"
                                ? "border-purple-500/20 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                                : "border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                            }`}
                            title={
                              isCurrentAdmin
                                ? "Cannot change role of current session"
                                : u.role === "admin"
                                ? "Demote to standard user"
                                : "Promote to administrator"
                            }
                          >
                            {u.role === "admin" ? (
                              <>
                                <ShieldAlert className="h-3 w-3" />
                                <span>Demote</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-3 w-3" />
                                <span>Promote</span>
                              </>
                            )}
                          </button>

                          {/* Delete user button */}
                          <button
                            type="button"
                            disabled={isCurrentAdmin}
                            onClick={() => setSelectedUserForDelete(u)}
                            className={`rounded-lg border p-1.5 transition-colors ${
                              isCurrentAdmin
                                ? "border-neutral-800 text-neutral-600 cursor-not-allowed"
                                : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                            }`}
                            title={
                              isCurrentAdmin
                                ? "Cannot delete active admin account"
                                : "Delete this account"
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-neutral-800/80 px-4 py-3 text-xs text-neutral-400">
          <div>
            Showing{" "}
            <span className="font-semibold text-white">
              {users.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-white">
              {pagination.totalUsers}
            </span>{" "}
            registered accounts
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.currentPage <= 1 || isLoading}
              onClick={() => fetchUsers(pagination.currentPage - 1)}
              className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-2 text-neutral-300">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={
                pagination.currentPage >= pagination.totalPages || isLoading
              }
              onClick={() => fetchUsers(pagination.currentPage + 1)}
              className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-40 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchUsers(1)}
      />

      <RoleChangeModal
        isOpen={!!selectedUserForRole}
        user={selectedUserForRole}
        onClose={() => setSelectedUserForRole(null)}
        onSuccess={() => fetchUsers(pagination.currentPage)}
      />

      <DeleteConfirmModal
        isOpen={!!selectedUserForDelete}
        user={selectedUserForDelete}
        onClose={() => setSelectedUserForDelete(null)}
        onSuccess={() => fetchUsers(pagination.currentPage)}
      />
    </div>
  );
};

export default Users;

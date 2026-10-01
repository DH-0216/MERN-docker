import mongoose from "mongoose";
import User from "../models/user.model.js";
import { registerUser } from "./auth.service.js";
import {
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
} from "./cache.service.js";
import { getActiveUsersCount } from "./presence.service.js";
import { revokeAllUserRefreshTokens } from "./refreshToken.service.js";

const STATS_CACHE_KEY = "admin:dashboard:stats";

/**
 * Invalidate all admin dashboard and user list caches.
 */
const invalidateAdminCaches = async () => {
  await Promise.all([
    deleteCache(STATS_CACHE_KEY),
    deleteCachePattern("admin:users:*"),
  ]);
};

/**
 * Retrieve aggregated metrics and system health for the admin dashboard.
 * Caches results in Redis with a 60-second TTL to reduce database load.
 */
export const getDashboardStats = async () => {
  // Check Redis cache first
  const cached = await getCache(STATS_CACHE_KEY);
  if (cached) {
    return { ...cached, isCached: true };
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, adminCount, newUsers24h, newUsers7d, activeUsersNow] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      getActiveUsersCount(5),
    ]);

  const regularUsersCount = totalUsers - adminCount;
  const memoryUsage = process.memoryUsage();

  const data = {
    metrics: {
      totalUsers,
      adminCount,
      regularUsersCount,
      newUsers24h,
      newUsers7d,
      activeUsersNow,
    },
    system: {
      uptime: process.uptime(),
      serverStartTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rssMB: Math.round(memoryUsage.rss / (1024 * 1024)),
        heapUsedMB: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
        heapTotalMB: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
      },
      mongoStatus:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      timestamp: now.toISOString(),
    },
  };

  // Cache computed metrics in Redis for 60 seconds
  await setCache(STATS_CACHE_KEY, data, 60);

  return { ...data, isCached: false };
};

/**
 * Paginated user query with optional search and role filtering.
 * Caches query results in Redis for 30 seconds.
 */
export const getUsersList = async ({
  page = 1,
  limit = 10,
  search = "",
  role = "all",
  sortBy = "createdAt",
  sortOrder = "desc",
}) => {
  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

  const allowedSortFields = ["createdAt", "userName", "email", "role"];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  const cacheKey = `admin:users:${numericPage}:${numericLimit}:${search}:${role}:${sortField}:${sortDirection}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return { ...cached, isCached: true };
  }

  const filter = {};

  if (role && role !== "all") {
    filter.role = role;
  }

  if (search && search.trim() !== "") {
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { userName: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  const [totalUsers, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit)
      .select("-password"),
  ]);

  const totalPages = Math.ceil(totalUsers / numericLimit) || 1;

  const result = {
    users,
    pagination: {
      totalUsers,
      totalPages,
      currentPage: numericPage,
      limit: numericLimit,
    },
  };

  // Cache user list results in Redis for 30 seconds
  await setCache(cacheKey, result, 30);

  return { ...result, isCached: false };
};

/**
 * Promote or demote a user's role.
 */
export const updateUserRole = async (userId, newRole, requestingAdminId) => {
  if (
    userId.toString() === requestingAdminId.toString() &&
    newRole !== "admin"
  ) {
    const error = new Error("You cannot demote your own admin account");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  user.role = newRole;
  await user.save();

  // Invalidate cache and revoke all active refresh tokens so new role takes effect immediately
  await Promise.all([
    invalidateAdminCaches(),
    revokeAllUserRefreshTokens(userId),
  ]);

  return user.toJSON();
};

/**
 * Delete a user account (with safeguard against deleting self).
 */
export const deleteUserById = async (userId, requestingAdminId) => {
  if (userId.toString() === requestingAdminId.toString()) {
    const error = new Error(
      "You cannot delete your own account from the admin dashboard",
    );
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  // Invalidate cache and terminate all active sessions in Redis
  await Promise.all([
    invalidateAdminCaches(),
    revokeAllUserRefreshTokens(userId),
  ]);

  return {
    id: user._id,
    userName: user.userName,
    email: user.email,
  };
};

/**
 * Create a new user from the admin dashboard.
 */
export const createAdminUser = async ({ userName, email, password, role }) => {
  const result = await registerUser(userName, email, password, role);
  // Invalidate cache immediately on user creation
  await invalidateAdminCaches();
  return result;
};

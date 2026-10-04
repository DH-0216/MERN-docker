import crypto from "crypto";
import mongoose from "mongoose";
import { redisClient, isRedisConnected } from "../config/redis.js";
import User from "../models/user.model.js";
import RefreshToken from "../models/refreshToken.model.js";
import config, { isTestEnv } from "../config/env.js";
import { generateToken } from "./auth.service.js";

// In-memory fallback map for test environments or Redis downtime
const memoryRefreshTokens = new Map();
const memoryRevokedTokens = new Map();
const memoryGraceTokens = new Map();

const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const REUSE_DETECTION_WINDOW_SECONDS = 300; // 5 minutes to detect compromised tokens
export let ROTATION_GRACE_PERIOD_SECONDS = parseInt(
  process.env.REFRESH_TOKEN_GRACE_PERIOD || (isTestEnv ? "0" : "15"),
  10,
);

export const setRotationGracePeriodSeconds = (sec) => {
  ROTATION_GRACE_PERIOD_SECONDS = sec;
};

const isMongoConnected = () => mongoose.connection?.readyState === 1;

/**
 * Cookie options adhering to OWASP security guidelines
 * path: "/" allows SPA initial routing & background silent refresh without subpath drop
 * sameSite: "lax" ensures the cookie is sent on top-level navigations (reopening tab/typing URL)
 * secure: only enabled when HTTPS is explicitly used or via COOKIE_SECURE=true
 */
export const getRefreshTokenCookieOptions = () => {
  const isSecure = process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : config.isProduction && process.env.SSL_ENABLED === "true";

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  };
};

/**
 * Clean cookie options for clearing cookies without maxAge conflict
 */
export const getRefreshTokenCookieClearOptions = () => {
  const isSecure = process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : config.isProduction && process.env.SSL_ENABLED === "true";

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
  };
};

/**
 * Generate a cryptographically secure, high-entropy refresh token string.
 */
const generateRandomToken = () => {
  return crypto.randomBytes(40).toString("hex");
};

/**
 * Store a new refresh token in Redis (or MongoDB fallback) and associate it with the user session.
 * @param {object} user - User document
 * @param {string} [userAgent] - Request user agent
 * @param {string} [ip] - Client IP address
 * @param {string} [familyId] - Family ID for token rotation & reuse detection
 * @returns {Promise<string>} - The newly generated raw refresh token
 */
export const createRefreshToken = async (user, userAgent = "", ip = "", familyId = null) => {
  const token = generateRandomToken();
  const tokenFamily = familyId || crypto.randomUUID();
  const sessionData = {
    userId: (user.id || user._id).toString(),
    email: user.email,
    role: user.role || "user",
    familyId: tokenFamily,
    userAgent,
    ip,
    createdAt: Date.now(),
  };

  const serialized = JSON.stringify(sessionData);

  // Store in memory fallback
  memoryRefreshTokens.set(token, sessionData);

  if (isRedisConnected()) {
    try {
      const pipeline = redisClient.pipeline();
      // Store token session with 30-day TTL
      pipeline.set(`rt:${token}`, serialized, "EX", REFRESH_TOKEN_TTL_SECONDS);
      // Track token in user's active token family set
      pipeline.sadd(`user:${sessionData.userId}:rts`, token);
      pipeline.expire(`user:${sessionData.userId}:rts`, REFRESH_TOKEN_TTL_SECONDS);
      await pipeline.exec();
    } catch (err) {
      console.warn("⚠️ [REFRESH TOKEN ERROR] Failed to save refresh token in Redis:", err.message);
    }
  } else if (isMongoConnected()) {
    try {
      await RefreshToken.create({
        token,
        userId: sessionData.userId,
        email: sessionData.email,
        role: sessionData.role,
        familyId: sessionData.familyId,
        userAgent,
        ip,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      });
    } catch (err) {
      console.warn("⚠️ [REFRESH TOKEN ERROR] Failed to save refresh token in MongoDB:", err.message);
    }
  }

  return token;
};

/**
 * Revoke all refresh tokens for a specific user (e.g. on reuse detection, password change, account deletion).
 * @param {string} userId
 */
export const revokeAllUserRefreshTokens = async (userId) => {
  if (!userId) return;

  const idStr = userId.toString();

  // Clear from memory fallback
  for (const [t, data] of memoryRefreshTokens.entries()) {
    if (data.userId === idStr) {
      memoryRefreshTokens.delete(t);
      memoryGraceTokens.delete(t);
    }
  }

  if (isRedisConnected()) {
    try {
      const tokens = await redisClient.smembers(`user:${idStr}:rts`);
      if (tokens && tokens.length > 0) {
        const pipeline = redisClient.pipeline();
        for (const token of tokens) {
          pipeline.del(`rt:${token}`);
          pipeline.del(`grace_rt:${token}`);
        }
        pipeline.del(`user:${idStr}:rts`);
        await pipeline.exec();
      }
    } catch (err) {
      console.warn("⚠️ [REFRESH TOKEN ERROR] Failed to revoke all tokens in Redis:", err.message);
    }
  }

  if (isMongoConnected()) {
    try {
      await RefreshToken.deleteMany({ userId: idStr });
    } catch (err) {
      console.warn("⚠️ [REFRESH TOKEN ERROR] Failed to revoke user tokens in MongoDB:", err.message);
    }
  }
};

/**
 * Revoke a single refresh token upon explicit user logout.
 * @param {string} token
 */
export const revokeRefreshToken = async (token) => {
  if (!token) return;

  const memData = memoryRefreshTokens.get(token);
  const userId = memData?.userId;
  memoryRefreshTokens.delete(token);
  memoryGraceTokens.delete(token);

  if (isRedisConnected()) {
    try {
      let resolvedUserId = userId;
      if (!resolvedUserId) {
        const raw = await redisClient.get(`rt:${token}`);
        if (raw) {
          try {
            resolvedUserId = JSON.parse(raw).userId;
          } catch {}
        }
      }

      const pipeline = redisClient.pipeline();
      pipeline.del(`rt:${token}`);
      pipeline.del(`grace_rt:${token}`);
      if (resolvedUserId) {
        pipeline.srem(`user:${resolvedUserId}:rts`, token);
      }
      await pipeline.exec();
    } catch (err) {
      console.warn("⚠️ [REFRESH TOKEN ERROR] Failed to delete refresh token from Redis:", err.message);
    }
  }

  if (isMongoConnected()) {
    try {
      await RefreshToken.deleteOne({ token });
    } catch (err) {
      console.warn("⚠️ [REFRESH TOKEN ERROR] Failed to delete token from MongoDB:", err.message);
    }
  }
};

/**
 * Rotate a refresh token: verifies existing token, detects replay attacks / token theft,
 * and issues a fresh Access Token and a fresh Refresh Token.
 * 
 * Supports a configurable Grace Period (RFC 6749 / Auth0 Leeway pattern) to smoothly
 * handle React StrictMode double mounts, multi-tab browsing, and network retries.
 * 
 * @param {string} currentToken - The incoming refresh token from httpOnly cookie
 * @param {string} [userAgent]
 * @param {string} [ip]
 * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
 */
export const rotateRefreshToken = async (currentToken, userAgent = "", ip = "") => {
  if (!currentToken) {
    const error = new Error("No refresh token provided");
    error.statusCode = 401;
    throw error;
  }

  let sessionData = memoryRefreshTokens.get(currentToken);
  let mongoDoc = null;

  if (isRedisConnected()) {
    try {
      const raw = await redisClient.get(`rt:${currentToken}`);
      if (raw) {
        sessionData = JSON.parse(raw);
      }
    } catch (err) {
      console.warn("⚠️ [REFRESH TOKEN ERROR] Redis lookup failed, checking fallback:", err.message);
    }
  } else if (!sessionData && isMongoConnected()) {
    try {
      mongoDoc = await RefreshToken.findOne({ token: currentToken });
      if (mongoDoc && !mongoDoc.isRevoked) {
        sessionData = {
          userId: mongoDoc.userId.toString(),
          email: mongoDoc.email,
          role: mongoDoc.role,
          familyId: mongoDoc.familyId,
          userAgent: mongoDoc.userAgent,
          ip: mongoDoc.ip,
          createdAt: mongoDoc.createdAt ? mongoDoc.createdAt.getTime() : Date.now(),
        };
      }
    } catch (err) {
      console.warn("⚠️ [REFRESH TOKEN ERROR] MongoDB lookup failed:", err.message);
    }
  }

  // Grace Period Check: If token was rotated within the grace window, return successor tokens gracefully
  if (!sessionData && ROTATION_GRACE_PERIOD_SECONDS > 0) {
    let graceRecord = memoryGraceTokens.get(currentToken);

    if (isRedisConnected()) {
      try {
        const rawGrace = await redisClient.get(`grace_rt:${currentToken}`);
        if (rawGrace) {
          graceRecord = JSON.parse(rawGrace);
        }
      } catch (err) {
        console.warn("⚠️ [REFRESH TOKEN ERROR] Grace lookup failed:", err.message);
      }
    } else if (
      mongoDoc &&
      mongoDoc.isRevoked &&
      mongoDoc.graceExpiresAt &&
      mongoDoc.graceExpiresAt > new Date()
    ) {
      graceRecord = {
        accessToken: mongoDoc.graceAccessToken,
        refreshToken: mongoDoc.graceRefreshToken,
        user: {
          id: mongoDoc.userId.toString(),
          _id: mongoDoc.userId.toString(),
          email: mongoDoc.email,
          role: mongoDoc.role,
        },
      };
    } else if (!graceRecord && isMongoConnected()) {
      try {
        const revokedDoc = await RefreshToken.findOne({
          token: currentToken,
          isRevoked: true,
        });
        if (
          revokedDoc &&
          revokedDoc.graceExpiresAt &&
          revokedDoc.graceExpiresAt > new Date()
        ) {
          graceRecord = {
            accessToken: revokedDoc.graceAccessToken,
            refreshToken: revokedDoc.graceRefreshToken,
            user: {
              id: revokedDoc.userId.toString(),
              _id: revokedDoc.userId.toString(),
              email: revokedDoc.email,
              role: revokedDoc.role,
            },
          };
        }
      } catch (err) {
        console.warn("⚠️ [REFRESH TOKEN ERROR] MongoDB grace lookup failed:", err.message);
      }
    }

    if (graceRecord) {
      return {
        accessToken: graceRecord.accessToken,
        refreshToken: graceRecord.refreshToken,
        user: graceRecord.user,
      };
    }
  }

  // Reuse Detection: If not active and not in grace period, inspect for breach
  if (!sessionData) {
    if (isRedisConnected()) {
      try {
        const isRevoked = await redisClient.get(`revoked_rt:${currentToken}`);
        if (isRevoked) {
          const reusedPayload = JSON.parse(isRevoked);
          console.error(
            `🚨 [SECURITY ALERT] Refresh token reuse detected for user ${reusedPayload.userId}! Invalidating all user sessions.`,
          );
          // Revoke all tokens for this user immediately!
          await revokeAllUserRefreshTokens(reusedPayload.userId);
          const error = new Error("Security breach detected: token reuse. All sessions terminated.");
          error.statusCode = 401;
          throw error;
        }
      } catch (err) {
        if (err.statusCode) throw err;
      }
    }

    if (mongoDoc && mongoDoc.isRevoked) {
      console.error(
        `🚨 [SECURITY ALERT] Refresh token reuse detected for user ${mongoDoc.userId}! Invalidating all user sessions.`,
      );
      await revokeAllUserRefreshTokens(mongoDoc.userId);
      const error = new Error("Security breach detected: token reuse. All sessions terminated.");
      error.statusCode = 401;
      throw error;
    }

    if (memoryRevokedTokens.has(currentToken)) {
      const reusedPayload = memoryRevokedTokens.get(currentToken);
      await revokeAllUserRefreshTokens(reusedPayload.userId);
      const error = new Error("Security breach detected: token reuse. All sessions terminated.");
      error.statusCode = 401;
      throw error;
    }

    const error = new Error("Invalid or expired session. Please sign in again.");
    error.statusCode = 401;
    throw error;
  }

  // Verify the user still exists in the database
  const user = await User.findById(sessionData.userId);
  if (!user) {
    await revokeRefreshToken(currentToken);
    const error = new Error("User account no longer exists");
    error.statusCode = 401;
    throw error;
  }

  // Delete the old refresh token from memory
  memoryRefreshTokens.delete(currentToken);
  memoryRevokedTokens.set(currentToken, sessionData);
  setTimeout(() => memoryRevokedTokens.delete(currentToken), REUSE_DETECTION_WINDOW_SECONDS * 1000).unref();

  // Generate a brand new refresh token under the same token family
  const newRefreshToken = await createRefreshToken(
    user,
    userAgent,
    ip,
    sessionData.familyId,
  );

  // Generate a brand new 15-minute Access Token
  const newAccessToken = generateToken(user);
  const userJson = user.toJSON();

  // Store in Redis & record grace period mapping
  if (isRedisConnected()) {
    try {
      const pipeline = redisClient.pipeline();
      pipeline.del(`rt:${currentToken}`);
      pipeline.srem(`user:${sessionData.userId}:rts`, currentToken);
      pipeline.set(
        `revoked_rt:${currentToken}`,
        JSON.stringify(sessionData),
        "EX",
        REUSE_DETECTION_WINDOW_SECONDS,
      );

      if (ROTATION_GRACE_PERIOD_SECONDS > 0) {
        const gracePayload = {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user: userJson,
        };
        pipeline.set(
          `grace_rt:${currentToken}`,
          JSON.stringify(gracePayload),
          "EX",
          ROTATION_GRACE_PERIOD_SECONDS,
        );
      }

      await pipeline.exec();
    } catch (err) {
      console.warn("⚠️ [REFRESH TOKEN ERROR] Failed to record token rotation in Redis:", err.message);
    }
  }

  // Record rotation & grace period in MongoDB fallback if Redis is not connected
  if (isMongoConnected()) {
    try {
      await RefreshToken.updateOne(
        { token: currentToken },
        {
          $set: {
            isRevoked: true,
            revokedAt: new Date(),
            graceExpiresAt: new Date(Date.now() + ROTATION_GRACE_PERIOD_SECONDS * 1000),
            graceAccessToken: newAccessToken,
            graceRefreshToken: newRefreshToken,
          },
        },
      );
    } catch (err) {
      console.warn("⚠️ [REFRESH TOKEN ERROR] Failed to record token rotation in MongoDB:", err.message);
    }
  }

  if (ROTATION_GRACE_PERIOD_SECONDS > 0) {
    const gracePayload = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: userJson,
    };
    memoryGraceTokens.set(currentToken, gracePayload);
    setTimeout(() => memoryGraceTokens.delete(currentToken), ROTATION_GRACE_PERIOD_SECONDS * 1000).unref();
  }

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: userJson,
  };
};

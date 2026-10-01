import crypto from "crypto";
import { redisClient, isRedisConnected } from "../config/redis.js";
import User from "../models/user.model.js";
import config from "../config/env.js";
import { generateToken } from "./auth.service.js";

// In-memory fallback map for test environments or Redis downtime
const memoryRefreshTokens = new Map();
const memoryRevokedTokens = new Map();

const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const REUSE_DETECTION_WINDOW_SECONDS = 300; // 5 minutes to detect compromised tokens

/**
 * Cookie options adhering to OWASP security guidelines
 */
export const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: config.isProduction,
  sameSite: config.isProduction ? "strict" : "lax",
  path: "/api/v1/auth",
  maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
});

/**
 * Generate a cryptographically secure, high-entropy refresh token string.
 */
const generateRandomToken = () => {
  return crypto.randomBytes(40).toString("hex");
};

/**
 * Store a new refresh token in Redis and associate it with the user session.
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
    }
  }

  if (isRedisConnected()) {
    try {
      const tokens = await redisClient.smembers(`user:${idStr}:rts`);
      if (tokens && tokens.length > 0) {
        const pipeline = redisClient.pipeline();
        for (const token of tokens) {
          pipeline.del(`rt:${token}`);
        }
        pipeline.del(`user:${idStr}:rts`);
        await pipeline.exec();
      }
    } catch (err) {
      console.warn("⚠️ [REFRESH TOKEN ERROR] Failed to revoke all tokens in Redis:", err.message);
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
      if (resolvedUserId) {
        pipeline.srem(`user:${resolvedUserId}:rts`, token);
      }
      await pipeline.exec();
    } catch (err) {
      console.warn("⚠️ [REFRESH TOKEN ERROR] Failed to delete refresh token from Redis:", err.message);
    }
  }
};

/**
 * Rotate a refresh token: verifies existing token, detects replay attacks / token theft,
 * and issues a fresh Access Token and a fresh Refresh Token.
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

  if (isRedisConnected()) {
    try {
      const raw = await redisClient.get(`rt:${currentToken}`);
      if (raw) {
        sessionData = JSON.parse(raw);
      } else {
        // Check if token was previously revoked (Reuse Detection / Token Theft!)
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
        sessionData = null;
      }
    } catch (err) {
      if (err.statusCode) throw err;
      console.warn("⚠️ [REFRESH TOKEN ERROR] Redis lookup failed, checking fallback:", err.message);
    }
  }

  // Check memory fallback for reuse detection
  if (!sessionData) {
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

  // Delete the old refresh token
  memoryRefreshTokens.delete(currentToken);
  memoryRevokedTokens.set(currentToken, sessionData);
  setTimeout(() => memoryRevokedTokens.delete(currentToken), REUSE_DETECTION_WINDOW_SECONDS * 1000).unref();

  if (isRedisConnected()) {
    try {
      const pipeline = redisClient.pipeline();
      pipeline.del(`rt:${currentToken}`);
      pipeline.srem(`user:${sessionData.userId}:rts`, currentToken);
      // Mark old token as revoked in Redis for reuse detection window
      pipeline.set(
        `revoked_rt:${currentToken}`,
        JSON.stringify(sessionData),
        "EX",
        REUSE_DETECTION_WINDOW_SECONDS,
      );
      await pipeline.exec();
    } catch (err) {
      console.warn("⚠️ [REFRESH TOKEN ERROR] Failed to record token rotation in Redis:", err.message);
    }
  }

  // Generate a brand new refresh token under the same token family
  const newRefreshToken = await createRefreshToken(
    user,
    userAgent,
    ip,
    sessionData.familyId,
  );

  // Generate a brand new 15-minute Access Token
  const newAccessToken = generateToken(user);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: user.toJSON(),
  };
};

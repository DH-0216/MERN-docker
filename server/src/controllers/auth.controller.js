import jwt from "jsonwebtoken";
import {
  deleteUserAccount,
  getProfile,
  loginUser,
  registerUser,
} from "../services/auth.service.js";
import User from "../models/user.model.js";
import { blacklistToken } from "../services/tokenBlacklist.service.js";
import {
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  getRefreshTokenCookieOptions,
} from "../services/refreshToken.service.js";

export const register = async (req, res, next) => {
  try {
    const { userName, email, password } = req.body;

    // Public registration always assigns standard user role to prevent privilege escalation
    const result = await registerUser(userName, email, password, "user");

    // Generate secure 30-day refresh token in Redis and set as httpOnly cookie
    const refreshToken = await createRefreshToken(
      result.user,
      req.headers["user-agent"] || "",
      req.ip || "",
    );
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await loginUser(email, password);

    // Generate secure 30-day refresh token in Redis and set as httpOnly cookie
    const refreshToken = await createRefreshToken(
      result.user,
      req.headers["user-agent"] || "",
      req.ip || "",
    );
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const currentToken = req.cookies?.refreshToken || req.body?.refreshToken;

    const rotated = await rotateRefreshToken(
      currentToken,
      req.headers["user-agent"] || "",
      req.ip || "",
    );

    // Set updated rotated refresh token in httpOnly cookie
    res.cookie("refreshToken", rotated.refreshToken, getRefreshTokenCookieOptions());

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        token: rotated.accessToken,
        user: rotated.user,
      },
    });
  } catch (error) {
    // If refresh token is invalid or stolen, clear cookie
    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    // Revoke refresh token from Redis
    const currentRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (currentRefreshToken) {
      await revokeRefreshToken(currentRefreshToken);
    }

    // Blacklist access token if passed in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          await blacklistToken(token, decoded.exp);
        }
      } catch {
        // Fallback: Proceed with logout acknowledgment
      }
    }

    // Clear refresh token cookie from browser
    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await getProfile(userId);
    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminData = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: "admin" });

    res.status(200).json({
      success: true,
      message: "Admin metrics retrieved successfully",
      data: {
        totalUsers,
        adminCount,
        serverTime: new Date().toISOString(),
        system: {
          uptime: process.uptime(),
          nodeVersion: process.version,
          memoryUsage: process.memoryUsage(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await deleteUserAccount(userId);

    // Invalidate all active refresh tokens in Redis for this deleted account
    await revokeAllUserRefreshTokens(userId);
    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


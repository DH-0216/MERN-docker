import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import config from "../config/env.js";
import { isTokenBlacklisted } from "../services/tokenBlacklist.service.js";
import { recordUserActivity } from "../services/presence.service.js";

export const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret, {
    algorithms: ["HS256"],
  });
};

export const authenticate = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. No token provided.",
    });
  }

  try {
    // Check if token was invalidated via logout or admin revocation
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({
        success: false,
        message: "Token has been revoked. Please sign in again.",
      });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The user belonging to this token no longer exists.",
      });
    }

    req.user = user;
    // Track user active presence asynchronously
    recordUserActivity(user._id).catch(() => {});
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please sign in again.",
      });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Authorization denied.",
      });
    }
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required before checking permissions.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You do not have the required permissions (${roles.join(", ")}).`,
      });
    }

    next();
  };
};

export default authenticate;

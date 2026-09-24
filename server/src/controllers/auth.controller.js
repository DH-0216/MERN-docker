import {
  deleteUserAccount,
  getProfile,
  loginUser,
  registerUser,
} from "../services/auth.service.js";
import User from "../models/user.model.js";

export const register = async (req, res, next) => {
  try {
    const { userName, email, password, role } = req.body;

    const result = await registerUser(userName, email, password, role);

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
    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    // In stateless JWT, logout is primarily handled by the client removing the token.
    // This endpoint provides formal server-side acknowledgment and session cleanup hooks.
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

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


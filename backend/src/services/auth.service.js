import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import config from "../config/env.js";

export const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role || "user",
  };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    algorithm: "HS256",
  });
};

export const registerUser = async (userName, email, password, role = "user") => {
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedUserName = userName.trim();

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    const error = new Error("A user with this email already exists");
    error.statusCode = 409;
    throw error;
  }

  const existingUserName = await User.findOne({ userName: trimmedUserName });
  if (existingUserName) {
    const error = new Error("This username is already taken");
    error.statusCode = 409;
    throw error;
  }

  const user = await User.create({
    userName: trimmedUserName,
    email: normalizedEmail,
    password,
    role: role === "admin" ? "admin" : "user",
  });

  const token = generateToken(user);
  return { user: user.toJSON(), token };
};

export const loginUser = async (email, password) => {
  if (!email || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+password",
  );
  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user);
  return { user: user.toJSON(), token };
};

export const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  return user.toJSON();
};

export const deleteUserAccount = async (userId) => {
  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: user._id,
    userName: user.userName,
    email: user.email,
  };
};


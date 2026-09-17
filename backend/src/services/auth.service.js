import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
};

export const registerUser = async (userName, email, password) => {
  const existingUser = await User.findOne({ email: email });
  if (existingUser) {
    throw new Error("User already exists");
  }
  const user = await User.create({
    userName: userName.trim(),
    email: email.toLowerCase().trim(),
    password: password,
  });

  const token = generateToken(user);
  return { user, token };
};

export const loginUser = async (email, password) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+password",
  );
  if (!user) {
    throw new Error("User not found");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error("Invalid password");
  }

  const token = generateToken(user);
  return { user, token };
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user.toJSON();
};

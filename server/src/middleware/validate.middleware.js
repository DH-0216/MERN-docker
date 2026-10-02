import { z } from "zod";

// NIST SP 800-63B Common Breached Passwords Blacklist
export const BREACHED_PASSWORDS = new Set([
  "password",
  "password1",
  "password12",
  "password123",
  "password123!",
  "12345678",
  "123456789",
  "1234567890",
  "admin1234",
  "admin1234!",
  "qwerty123",
  "qwertyuiop",
  "welcome123",
  "welcome123!",
  "letmein123",
  "changeme123",
  "iloveyou123",
  "secret123",
  "p@ssword1",
  "p@ssword123",
]);

// Reusable NIST-compliant password schema:
// - Minimum 8 characters
// - At least 1 uppercase, 1 lowercase, 1 number, 1 special character
// - Checked against breached password blacklist
export const passwordComplexitySchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters long")
  .max(100, "Password must be at most 100 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special symbol")
  .refine(
    (val) => !BREACHED_PASSWORDS.has(val.toLowerCase().trim()),
    "This password is too common or breached in known security incidents. Please choose a more secure password.",
  );

export const registerSchema = z.object({
  userName: z
    .string({ required_error: "Username is required" })
    .trim()
    .min(3, "Username must be at least 3 characters long")
    .max(10, "Username must be at most 10 characters long")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  password: passwordComplexitySchema,
});

export const adminCreateUserSchema = z.object({
  userName: z
    .string({ required_error: "Username is required" })
    .trim()
    .min(3, "Username must be at least 3 characters long")
    .max(10, "Username must be at most 10 characters long")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  password: passwordComplexitySchema,
  role: z.enum(["user", "admin"]).optional().default("user"),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

export const updateRoleSchema = z.object({
  role: z.enum(["user", "admin"], {
    required_error: "Role is required and must be either 'user' or 'admin'",
  }),
});

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const issues = result.error.issues || [];
    const errorDetails = issues.map((err) => ({
      field: err.path.join(".") || "body",
      message: err.message,
    }));

    return res.status(400).json({
      success: false,
      message: errorDetails[0]?.message || "Invalid input data",
      errors: errorDetails,
    });
  }

  req.body = result.data;
  next();
};

import { useState, useMemo } from "react";
import {
  UserPlus,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
} from "lucide-react";
import Modal from "../common/Modal";
import { adminService, formatApiError } from "../../api/adminApi";

// Breached / commonly targeted passwords
const BREACHED_PASSWORDS = new Set([
  "password",
  "password12",
  "password123",
  "password123!",
  "12345678",
  "123456789",
  "admin1234",
  "admin1234!",
  "qwerty123",
  "qwertyuiop",
  "welcome123",
  "welcome123!",
  "letmein123",
]);

/**
 * Calculates password strength against NIST SP 800-63B complexity criteria.
 */
const calculateStrength = (pwd) => {
  if (!pwd) {
    return {
      score: 0,
      label: "",
      color: "bg-neutral-800",
      textColor: "text-neutral-500",
      isBreached: false,
      criteria: [
        { label: "8+ characters", met: false },
        { label: "Uppercase & lowercase", met: false },
        { label: "Number (0-9)", met: false },
        { label: "Special symbol (!@#...)", met: false },
      ],
    };
  }

  const isBreached = BREACHED_PASSWORDS.has(pwd.toLowerCase().trim());

  const criteria = [
    { label: "8+ characters", met: pwd.length >= 8 },
    {
      label: "Uppercase & lowercase",
      met: /[a-z]/.test(pwd) && /[A-Z]/.test(pwd),
    },
    { label: "Number (0-9)", met: /[0-9]/.test(pwd) },
    {
      label: "Special symbol (!@#...)",
      met: /[^a-zA-Z0-9]/.test(pwd),
    },
  ];

  const score = criteria.filter((c) => c.met).length;

  let label = "Very Weak";
  let color = "bg-red-500";
  let textColor = "text-red-400";

  if (isBreached) {
    label = "Compromised / Blacklisted";
    color = "bg-red-600";
    textColor = "text-red-400";
  } else if (score === 4) {
    label = "Strong (NIST Compliant)";
    color = "bg-emerald-500";
    textColor = "text-emerald-400";
  } else if (score === 3) {
    label = "Good";
    color = "bg-cyan-500";
    textColor = "text-cyan-400";
  } else if (score === 2) {
    label = "Fair";
    color = "bg-amber-500";
    textColor = "text-amber-400";
  } else if (score === 1) {
    label = "Weak";
    color = "bg-red-500";
    textColor = "text-red-400";
  }

  return { score, label, color, textColor, isBreached, criteria };
};

export const CreateUserModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    password: "",
    role: "user",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = useMemo(
    () => calculateStrength(formData.password),
    [formData.password],
  );

  const resetForm = () => {
    setFormData({
      userName: "",
      email: "",
      password: "",
      role: "user",
    });
    setShowPassword(false);
    setError("");
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (strength.isBreached) {
      setError(
        "This password is on the breached password blacklist. Please choose a stronger password.",
      );
      return;
    }

    if (strength.score < 4) {
      setError(
        "Password must satisfy all complexity criteria: at least 8 characters, uppercase, lowercase, number, and special symbol.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await adminService.createUser(formData);
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        formatApiError(err, "Failed to create user. Please check the inputs."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New User Account"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1.5">
            Username
          </label>
          <input
            type="text"
            name="userName"
            required
            minLength={3}
            maxLength={10}
            value={formData.userName}
            onChange={handleChange}
            placeholder="e.g. johndoe"
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
          />
          <p className="mt-1 text-[11px] text-neutral-500">
            3-10 characters (letters, numbers, underscore)
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="user@example.com"
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-neutral-300">
              Password
            </label>
            <span className="text-[11px] text-neutral-500 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-cyan-400" />
              NIST SP 800-63B
            </span>
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={8}
              value={formData.password}
              onChange={handleChange}
              placeholder="e.g. SecureP@ss2026!"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Interactive Password Strength Indicator */}
          {formData.password.length > 0 && (
            <div className="mt-2.5 space-y-2 rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Password Strength:</span>
                <span className={`font-semibold ${strength.textColor}`}>
                  {strength.label}
                </span>
              </div>

              {/* 4-Segment Progress Bar */}
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      strength.score >= step
                        ? strength.color
                        : "bg-neutral-800"
                    }`}
                  />
                ))}
              </div>

              {/* Criteria Checklist */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                {strength.criteria.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 transition-colors ${
                      item.met
                        ? "text-emerald-400 font-medium"
                        : "text-neutral-500"
                    }`}
                  >
                    {item.met ? (
                      <Check className="h-3 w-3 shrink-0 text-emerald-400" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-700 shrink-0 ml-1" />
                    )}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              {strength.isBreached && (
                <p className="text-[11px] text-red-400 pt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    This password is on the breached blacklist and will be rejected.
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1.5">
            Account Role
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors cursor-pointer"
          >
            <option value="user">Regular User</option>
            <option value="admin">Administrator</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleClose}
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            <span>Create Account</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateUserModal;

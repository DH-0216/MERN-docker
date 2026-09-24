import { useState } from "react";
import { UserPlus, AlertCircle, RefreshCw } from "lucide-react";
import Modal from "../common/Modal";
import { adminService, formatApiError } from "../../api/adminApi";

export const CreateUserModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    password: "",
    role: "user",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      userName: "",
      email: "",
      password: "",
      role: "user",
    });
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
          <label className="block text-xs font-medium text-neutral-300 mb-1.5">
            Password
          </label>
          <input
            type="password"
            name="password"
            required
            minLength={6}
            value={formData.password}
            onChange={handleChange}
            placeholder="At least 6 characters"
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1.5">
            Account Role
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
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
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
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

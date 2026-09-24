import { useState } from "react";
import { ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";
import Modal from "../common/Modal";
import { adminService, formatApiError } from "../../api/adminApi";

export const RoleChangeModal = ({ isOpen, user, onClose, onSuccess }) => {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const targetRole = user.role === "admin" ? "user" : "admin";
  const isPromoting = targetRole === "admin";

  const handleConfirm = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      await adminService.updateRole(user._id, targetRole);
      onSuccess();
      onClose();
    } catch (err) {
      setError(formatApiError(err, "Failed to update user role."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title={isPromoting ? "Promote to Administrator" : "Demote to Standard User"}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-sm text-neutral-300">
          Are you sure you want to change the role for{" "}
          <strong className="text-white">{user.userName}</strong> (
          {user.email}) from{" "}
          <span className="font-semibold text-neutral-400">{user.role}</span> to{" "}
          <span
            className={`font-semibold ${
              isPromoting ? "text-purple-400" : "text-cyan-400"
            }`}
          >
            {targetRole}
          </span>
          ?
        </p>

        {isPromoting && (
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-xs text-purple-300">
            <p>
              Granting administrator access will allow this account full access to user management, metrics, and system configuration.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium text-white transition-opacity disabled:opacity-50 ${
              isPromoting
                ? "bg-purple-600 hover:bg-purple-500"
                : "bg-cyan-600 hover:bg-cyan-500"
            }`}
          >
            {isSubmitting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            <span>Confirm Role Change</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RoleChangeModal;

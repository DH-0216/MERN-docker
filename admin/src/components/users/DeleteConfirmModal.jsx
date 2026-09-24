import { useState } from "react";
import { Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import Modal from "../common/Modal";
import { adminService, formatApiError } from "../../api/adminApi";

export const DeleteConfirmModal = ({ isOpen, user, onClose, onSuccess }) => {
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  if (!user) return null;

  const handleConfirm = async () => {
    setError("");
    setIsDeleting(true);

    try {
      await adminService.deleteUser(user._id);
      onSuccess();
      onClose();
    } catch (err) {
      setError(formatApiError(err, "Failed to delete user account."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isDeleting && onClose()}
      title="Delete User Account"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          <p className="font-semibold mb-1">Permanent Action Warning</p>
          <p>
            You are about to permanently delete the account for{" "}
            <strong>{user.userName}</strong> ({user.email}). All profile data and credentials will be removed.
          </p>
        </div>

        <p className="text-xs text-neutral-400">
          This operation cannot be undone. Please confirm you wish to proceed.
        </p>

        <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleConfirm}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span>Delete User</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import HomeNavbar from "../components/home/HomeNavbar";
import UserProfileCard from "../components/home/UserProfileCard";
import HealthMonitorCard from "../components/home/HealthMonitorCard";
import ConfirmationModal from "../components/home/ConfirmationModal";
import { authApi } from "../api/clientApi";

const Home = ({ token, onLogout }) => {
  const [profile, setProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  // Confirmation Modal state: 'delete' | 'logout' | null
  const [activeModal, setActiveModal] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const activeToken = token || localStorage.getItem("authToken");

  const handleOpenLogoutModal = () => {
    setModalError("");
    setActiveModal("logout");
  };

  const handleOpenDeleteModal = () => {
    setModalError("");
    setActiveModal("delete");
  };

  const handleConfirmLogout = async () => {
    setIsModalLoading(true);
    setModalError("");
    try {
      await authApi.logout();
    } catch {
      // Ignore network/server errors during logout
    } finally {
      setIsModalLoading(false);
      setActiveModal(null);
      onLogout();
    }
  };

  const handleConfirmDelete = async () => {
    setIsModalLoading(true);
    setModalError("");
    try {
      await authApi.deleteAccount();
      setActiveModal(null);
      onLogout();
    } catch (err) {
      console.error("Error deleting account:", err);
      setModalError(
        err.response?.data?.message || "Failed to delete account. Please try again.",
      );
    } finally {
      setIsModalLoading(false);
    }
  };

  const fetchProfile = useCallback(async () => {
    setIsProfileLoading(true);
    setProfileError("");
    try {
      if (!activeToken) {
        setProfileError("No authentication token found.");
        setIsProfileLoading(false);
        return;
      }
      const response = await authApi.getProfile();
      if (response.data?.success && response.data?.data) {
        setProfile(response.data.data);
      } else {
        setProfile(response.data);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      if (err.response?.status === 401) {
        onLogout();
        return;
      }
      setProfileError(
        err.response?.data?.message || "Failed to load user profile.",
      );
    } finally {
      setIsProfileLoading(false);
    }
  }, [activeToken, onLogout]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        if (!activeToken) {
          if (!ignore) {
            setProfileError("No authentication token found.");
            setIsProfileLoading(false);
          }
          return;
        }
        const response = await authApi.getProfile();
        if (!ignore) {
          if (response.data?.success && response.data?.data) {
            setProfile(response.data.data);
          } else {
            setProfile(response.data);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error fetching user profile:", err);
          if (err.response?.status === 401) {
            onLogout();
            return;
          }
          setProfileError(
            err.response?.data?.message || "Failed to load user profile.",
          );
        }
      } finally {
        if (!ignore) {
          setIsProfileLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [activeToken, onLogout]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-neutral-950 text-white selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting */}
      <motion.div
        animate={{
          x: [0, 30, 0],
          y: [0, -30, 0],
          opacity: [0.12, 0.2, 0.12],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-40 left-1/4 h-[550px] w-[550px] rounded-full bg-cyan-500/20 blur-[140px]"
      />
      <motion.div
        animate={{
          x: [0, -40, 0],
          y: [0, 40, 0],
          opacity: [0.08, 0.16, 0.08],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -bottom-40 right-1/4 h-[550px] w-[550px] rounded-full bg-blue-600/20 blur-[140px]"
      />

      {/* Top Navbar */}
      <HomeNavbar profile={profile} onLogout={handleOpenLogoutModal} />

      {/* Main Content Area */}
      <div className="relative mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Dashboard & Workspace
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Monitor API microservices health, container status, and inspect your
            authenticated profile details.
          </p>
        </div>

        {/* Two-Column Grid: Profile Section + Health Monitor */}
        <div className="grid gap-8 lg:grid-cols-2">
          <UserProfileCard
            profile={profile}
            isLoading={isProfileLoading}
            error={profileError}
            token={activeToken}
            onRefresh={fetchProfile}
            onOpenDeleteModal={handleOpenDeleteModal}
          />

          <HealthMonitorCard />
        </div>
      </div>

      {/* Reusable Confirmation Modal for Delete & Logout */}
      <ConfirmationModal
        isOpen={activeModal !== null}
        title={activeModal === "delete" ? "Delete Account" : "Confirm Logout"}
        description={
          activeModal === "delete"
            ? `Are you sure you want to delete your account (@${profile?.userName || "user"})? All profile details and session credentials will be permanently removed from MongoDB.`
            : "Are you sure you want to log out of your session? You will need to sign in again to access your dashboard."
        }
        confirmText={
          activeModal === "delete" ? "Confirm & Delete" : "Log Out"
        }
        variant={activeModal === "delete" ? "danger" : "primary"}
        isLoading={isModalLoading}
        error={modalError}
        onClose={() => {
          if (!isModalLoading) setActiveModal(null);
        }}
        onConfirm={
          activeModal === "delete" ? handleConfirmDelete : handleConfirmLogout
        }
      />
    </main>
  );
};

export default Home;

import { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import AuthShowcase from "../components/auth/AuthShowcase";
import AuthForm from "../components/auth/AuthForm";

const Auth = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isLogin = mode === "login";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const endpoint = isLogin ? "login" : "register";
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`/api/v1/auth/${endpoint}`, payload);
      onAuthSuccess(response.data.data.token);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setError("");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-neutral-950 text-white selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting */}
      <motion.div
        animate={{
          x: isLogin ? [0, 20, 0] : [50, 70, 50],
          y: [0, -25, 0],
          opacity: [0.12, 0.2, 0.12],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-40 left-1/4 h-[550px] w-[550px] rounded-full bg-cyan-500/20 blur-[130px]"
      />
      <motion.div
        animate={{
          x: isLogin ? [0, -30, 0] : [-40, -10, -40],
          y: [0, 35, 0],
          opacity: [0.08, 0.16, 0.08],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -bottom-40 right-1/4 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[130px]"
      />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
        <div className="relative grid w-full gap-8 lg:min-h-[640px] lg:grid-cols-2 lg:gap-0">
          <AuthShowcase mode={mode} />
          <AuthForm
            mode={mode}
            formData={formData}
            error={error}
            isLoading={isLoading}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onSwitchMode={switchMode}
          />
        </div>
      </section>
    </main>
  );
};

export default Auth;

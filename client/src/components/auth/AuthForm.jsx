import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const calculatePasswordStrength = (password = "") => {
  if (!password) {
    return {
      score: 0,
      label: "",
      barColor: "bg-white/10",
      textColor: "text-neutral-400",
      bars: 0,
      criteria: [
        { label: "At least 8 characters", met: false },
        { label: "Uppercase & lowercase letters", met: false },
        { label: "At least 1 number", met: false },
        { label: "At least 1 special character", met: false },
      ],
    };
  }

  const criteria = [
    { label: "At least 8 characters", met: password.length >= 8 },
    {
      label: "Uppercase & lowercase",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    { label: "At least 1 number", met: /[0-9]/.test(password) },
    {
      label: "At least 1 symbol",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const metCount = criteria.filter((c) => c.met).length;

  if (password.length < 8) {
    return {
      score: 1,
      label: "Too short (< 8 chars)",
      barColor: "bg-rose-500",
      textColor: "text-rose-400",
      bars: 1,
      criteria,
    };
  }

  if (metCount <= 1) {
    return {
      score: 1,
      label: "Weak",
      barColor: "bg-rose-500",
      textColor: "text-rose-400",
      bars: 1,
      criteria,
    };
  }

  if (metCount === 2) {
    return {
      score: 2,
      label: "Fair",
      barColor: "bg-amber-500",
      textColor: "text-amber-400",
      bars: 2,
      criteria,
    };
  }

  if (metCount === 3) {
    return {
      score: 3,
      label: "Good",
      barColor: "bg-cyan-400",
      textColor: "text-cyan-400",
      bars: 3,
      criteria,
    };
  }

  return {
    score: 4,
    label: "Strong",
    barColor: "bg-emerald-400",
    textColor: "text-emerald-400",
    bars: 4,
    criteria,
  };
};

const contentVariants = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -16,
    filter: "blur(4px)",
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
};

const AuthForm = ({
  mode,
  formData,
  error,
  isLoading,
  onChange,
  onSubmit,
  onSwitchMode,
}) => {
  const isLogin = mode === "login";
  const [showPassword, setShowPassword] = useState(false);
  const passwordStrength = calculatePasswordStrength(formData.password);

  return (
    <div
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] lg:absolute lg:inset-y-0 lg:w-1/2 ${
        isLogin
          ? "lg:left-0 lg:translate-x-full"
          : "lg:left-0 lg:translate-x-0"
      }`}
    >
      <div className="flex h-full items-center">
        <div className="w-full max-w-xl px-2 py-6 sm:px-6 lg:px-10">
          <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-6 backdrop-blur-xl sm:p-8">
            {/* Form Header */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                variants={contentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="mb-6"
              >
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {isLogin ? "Welcome back" : "Create test account"}
                </h2>
                <p className="mt-2 text-sm text-neutral-400">
                  {isLogin
                    ? "Sign in with your test credentials to continue."
                    : "Register once to access the Docker test environment."}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Form with Layout Animations */}
            <motion.form layout onSubmit={onSubmit} className="space-y-4">
              {/* Collapsible Username field with smooth expand/fade */}
              <AnimatePresence initial={false}>
                {!isLogin && (
                  <motion.div
                    key="username-input"
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                      y: 0,
                      transition: {
                        height: {
                          duration: 0.35,
                          ease: [0.16, 1, 0.3, 1],
                        },
                        opacity: { duration: 0.25, delay: 0.08 },
                        y: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                      },
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                      y: -10,
                      transition: {
                        opacity: { duration: 0.15 },
                        height: {
                          duration: 0.3,
                          ease: [0.16, 1, 0.3, 1],
                        },
                        y: { duration: 0.2 },
                      },
                    }}
                    className="overflow-hidden"
                  >
                    <label className="block pb-1">
                      <span className="text-sm font-medium text-neutral-300">
                        Username
                      </span>
                      <input
                        type="text"
                        name="userName"
                        value={formData.userName}
                        onChange={onChange}
                        required={!isLogin}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900/90 px-4 py-3 text-white outline-none transition placeholder:text-neutral-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20"
                        placeholder="Enter your username"
                      />
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Input */}
              <motion.label layout className="block">
                <span className="text-sm font-medium text-neutral-300">
                  Email
                </span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={onChange}
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900/90 px-4 py-3 text-white outline-none transition placeholder:text-neutral-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="Enter your email address"
                />
              </motion.label>

              {/* Password Input with show/hide toggle */}
              <motion.div layout className="block">
                <span className="text-sm font-medium text-neutral-300">
                  Password
                </span>
                <div className="relative mt-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={onChange}
                    required
                    minLength={isLogin ? 6 : 8}
                    className="w-full rounded-xl border border-white/10 bg-neutral-900/90 pl-4 pr-11 py-3 text-white outline-none transition placeholder:text-neutral-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator (Register Mode Only) */}
                <AnimatePresence initial={false}>
                  {!isLogin && formData.password.length > 0 && (
                    <motion.div
                      key="password-strength-meter"
                      initial={{ opacity: 0, height: 0, y: -6 }}
                      animate={{
                        opacity: 1,
                        height: "auto",
                        y: 0,
                        transition: { duration: 0.28, ease: "easeOut" },
                      }}
                      exit={{
                        opacity: 0,
                        height: 0,
                        y: -6,
                        transition: { duration: 0.2 },
                      }}
                      className="overflow-hidden pt-2"
                    >
                      {/* Strength Bars */}
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4].map((barIndex) => (
                          <div
                            key={barIndex}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              barIndex <= passwordStrength.bars
                                ? passwordStrength.barColor
                                : "bg-white/10"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Strength Label */}
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className="text-neutral-400">Password strength:</span>
                        <span className={`font-semibold tracking-wide transition-colors duration-200 ${passwordStrength.textColor}`}>
                          {passwordStrength.label}
                        </span>
                      </div>

                      {/* Criteria Checklist */}
                      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-xl border border-white/5 bg-neutral-900/60 p-2.5 text-xs">
                        {passwordStrength.criteria.map((item, index) => (
                          <div
                            key={index}
                            className={`flex items-center gap-1.5 transition-colors duration-200 ${
                              item.met ? "text-emerald-300" : "text-neutral-500"
                            }`}
                          >
                            <svg
                              className={`h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${
                                item.met ? "text-emerald-400" : "text-neutral-600"
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              {item.met ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              )}
                            </svg>
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Animated Error Alert */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key="error-alert"
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      height: "auto",
                      transition: { duration: 0.28, ease: "easeOut" },
                    }}
                    exit={{
                      opacity: 0,
                      y: -8,
                      height: 0,
                      transition: { duration: 0.2 },
                    }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      <svg
                        className="h-4 w-4 shrink-0 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.div layout className="pt-2">
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={isLoading ? {} : { scale: 1.015 }}
                  whileTap={isLoading ? {} : { scale: 0.985 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                  }}
                  className="relative w-full overflow-hidden rounded-xl bg-cyan-400 px-4 py-3.5 font-bold text-neutral-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-lg shadow-cyan-400/15"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={
                        isLoading
                          ? "loading"
                          : isLogin
                            ? "btn-login"
                            : "btn-register"
                      }
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-center gap-2"
                    >
                      {isLoading && (
                        <svg
                          className="h-4 w-4 animate-spin text-neutral-950"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                      )}
                      <span>
                        {isLoading
                          ? "Please wait..."
                          : isLogin
                            ? "Login"
                            : "Create account"}
                      </span>
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            </motion.form>

            {/* Footer Prompt */}
            <div className="mt-6 text-center text-sm text-neutral-400">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isLogin ? "prompt-login" : "prompt-register"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="inline-block"
                >
                  {isLogin
                    ? "Don't have an account?"
                    : "Already have an account?"}
                </motion.span>
              </AnimatePresence>
              <motion.button
                type="button"
                onClick={() => onSwitchMode(isLogin ? "register" : "login")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="ml-2 font-semibold text-cyan-300 transition-colors hover:text-cyan-200 underline-offset-4 hover:underline cursor-pointer"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={isLogin ? "action-register" : "action-login"}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="inline-block"
                  >
                    {isLogin ? "Register" : "Login"}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;

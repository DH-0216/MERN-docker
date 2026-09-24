import { motion, AnimatePresence } from "framer-motion";

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

              {/* Password Input */}
              <motion.label layout className="block">
                <span className="text-sm font-medium text-neutral-300">
                  Password
                </span>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={onChange}
                  required
                  minLength={6}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900/90 px-4 py-3 text-white outline-none transition placeholder:text-neutral-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="Enter your password"
                />
              </motion.label>

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

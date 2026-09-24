import { motion, AnimatePresence } from "framer-motion";

const FEATURE_ITEMS = [
  { title: "Containerized", desc: "Docker Compose" },
  { title: "JWT Auth", desc: "Stateless session" },
  { title: "API Health", desc: "Live service tests" },
];

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

const AuthShowcase = ({ mode }) => {
  const isLogin = mode === "login";

  return (
    <div
      className={`flex items-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] lg:absolute lg:inset-y-0 lg:w-1/2 ${
        isLogin
          ? "lg:left-0 lg:translate-x-0"
          : "lg:left-0 lg:translate-x-full"
      }`}
    >
      <div className="w-full max-w-2xl px-2 py-6 sm:px-6 lg:px-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400"></span>
          </span>
          Test Docker Project
        </div>

        {/* Title & Subtitle with AnimatePresence */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="mt-6"
          >
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {isLogin
                ? "Welcome to Docker Test Project."
                : "Create an account in this Docker test project."}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-neutral-300">
              {isLogin
                ? "This is a test Docker project built to demonstrate containerized MERN microservices, authentication workflows, and system health checks."
                : "Register a test account to explore containerized Express APIs, MongoDB integration, and environment verification."}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Feature Chips */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {FEATURE_ITEMS.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.08, duration: 0.4 }}
              whileHover={{
                scale: 1.03,
                borderColor: "rgba(103, 232, 249, 0.35)",
                backgroundColor: "rgba(255, 255, 255, 0.06)",
              }}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm transition-colors duration-200"
            >
              <span className="block text-sm font-medium text-neutral-100">
                {item.title}
              </span>
              <span className="mt-1 block text-xs text-neutral-400">
                {item.desc}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuthShowcase;

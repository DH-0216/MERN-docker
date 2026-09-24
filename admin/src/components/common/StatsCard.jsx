export const StatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme = "cyan",
}) => {
  const colorMap = {
    cyan: {
      border: "border-cyan-500/20",
      bg: "bg-cyan-500/5",
      iconBg: "bg-cyan-500/10 text-cyan-400",
      accent: "text-cyan-400",
      glow: "hover:border-cyan-500/40",
    },
    purple: {
      border: "border-purple-500/20",
      bg: "bg-purple-500/5",
      iconBg: "bg-purple-500/10 text-purple-400",
      accent: "text-purple-400",
      glow: "hover:border-purple-500/40",
    },
    emerald: {
      border: "border-emerald-500/20",
      bg: "bg-emerald-500/5",
      iconBg: "bg-emerald-500/10 text-emerald-400",
      accent: "text-emerald-400",
      glow: "hover:border-emerald-500/40",
    },
    amber: {
      border: "border-amber-500/20",
      bg: "bg-amber-500/5",
      iconBg: "bg-amber-500/10 text-amber-400",
      accent: "text-amber-400",
      glow: "hover:border-amber-500/40",
    },
  };

  const scheme = colorMap[colorScheme] || colorMap.cyan;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${scheme.border} ${scheme.bg} ${scheme.glow} p-6 backdrop-blur-xl transition-all duration-300`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            {title}
          </p>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-3xl font-bold tracking-tight text-white">
              {value}
            </h3>
            {trend && (
              <span className="text-xs font-medium text-emerald-400">
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-neutral-400">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${scheme.iconBg} ring-1 ring-white/10`}
          >
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;

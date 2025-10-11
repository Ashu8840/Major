const StatCard = ({ title, value, delta, icon: Icon, trend = "up" }) => {
  const trendColor = trend === "up" ? "text-emerald-600" : "text-rose-500";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          {delta && (
            <p className={`mt-2 text-xs font-semibold ${trendColor}`}>
              {trend === "up" ? "▲" : "▼"} {delta}
            </p>
          )}
        </div>
        {Icon && (
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
            <Icon className="h-6 w-6" />
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;

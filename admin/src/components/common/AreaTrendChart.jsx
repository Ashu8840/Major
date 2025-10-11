import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs shadow">
      <p className="font-semibold text-slate-700">{label}</p>
      <p className="text-slate-500">
        {payload[0].name}:{" "}
        <span className="font-semibold text-primary-500">
          {payload[0].value}
        </span>
      </p>
    </div>
  );
};

const AreaTrendChart = ({ data, dataKey, labelKey = "label", label }) => {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart
        data={data}
        margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3c7dff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3c7dff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={labelKey} stroke="#94a3b8" fontSize={12} />
        <YAxis stroke="#94a3b8" fontSize={12} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={label}
          stroke="#3c7dff"
          strokeWidth={2}
          fill="url(#trendGradient)"
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default AreaTrendChart;

"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Cell,
} from "recharts";

// Small sparkline for habit cards (last 7 days).
export function MiniArea({ data, color = "#3f8f5c" }) {
  const id = `g-${color.replace("#", "")}`;
  return (
    <div className="h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={{ stroke: "#e4ddcf" }}
            contentStyle={tooltipStyle}
            labelStyle={{ color: "#1c1b1a", fontWeight: 600 }}
            formatter={(v) => [v, "logged"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${id})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Bar chart for the reports page with a target line.
export function ReportBars({ data, target, direction, unit }) {
  const goodColor = "#3f8f5c";
  const badColor = "#c2554d";
  const dimColor = "#cfc8ba";

  function barColor(v) {
    if (direction === "avoid") {
      return v > (target || 0) ? badColor : goodColor; // over the limit -> red
    }
    return v >= (target || 0) ? goodColor : dimColor; // hit target -> green
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#efe9dd" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#8a857a" }}
            tickLine={false}
            axisLine={{ stroke: "#e4ddcf" }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11, fill: "#8a857a" }} tickLine={false} axisLine={false} width={42} />
          <Tooltip
            cursor={{ fill: "rgba(28,27,26,0.04)" }}
            contentStyle={tooltipStyle}
            formatter={(v) => [`${v} ${unit}`, "logged"]}
          />
          {target > 0 && (
            <ReferenceLine
              y={target}
              stroke="#4a6fa5"
              strokeDasharray="4 4"
              label={{ value: `target ${target}`, position: "right", fontSize: 10, fill: "#4a6fa5" }}
            />
          )}
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={34}>
            {data.map((d, i) => (
              <Cell key={i} fill={barColor(d.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e4ddcf",
  boxShadow: "0 8px 24px rgba(28,27,26,0.08)",
  fontSize: 12,
};

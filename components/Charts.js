"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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

// Weight-over-time line with a dashed goal line.
export function WeightTrend({ data, goal }) {
  const weights = data.map((d) => d.weight);
  const lo = Math.min(...weights, goal ?? Infinity);
  const hi = Math.max(...weights, goal ?? -Infinity);
  const pad = Math.max(1, (hi - lo) * 0.15);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#efe9dd" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#8a857a" }}
            tickLine={false}
            axisLine={{ stroke: "#e4ddcf" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]}
            tick={{ fontSize: 11, fill: "#8a857a" }}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} kg`, "weight"]} />
          {goal > 0 && (
            <ReferenceLine
              y={goal}
              stroke="#3f8f5c"
              strokeDasharray="4 4"
              label={{ value: `goal ${goal}`, position: "right", fontSize: 10, fill: "#3f8f5c" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#4a6fa5"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#4a6fa5" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Glucose trend (mg/dL) with target zone reference lines.
export function GlucoseChart({ data }) {
  if (!data.length) return null;
  const values = data.map((d) => d.value);
  const lo = Math.min(50, Math.min(...values) - 10);
  const hi = Math.max(220, Math.max(...values) + 20);
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#efe9dd" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8a857a" }} tickLine={false} axisLine={{ stroke: "#e4ddcf" }} interval="preserveStartEnd" minTickGap={20} />
          <YAxis domain={[Math.floor(lo), Math.ceil(hi)]} tick={{ fontSize: 11, fill: "#8a857a" }} tickLine={false} axisLine={false} width={42} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} mg/dL`, "glucose"]} />
          <ReferenceLine y={70} stroke="#e0697a" strokeDasharray="4 4" label={{ value: "low 70", position: "right", fontSize: 10, fill: "#e0697a" }} />
          <ReferenceLine y={180} stroke="#e2a93f" strokeDasharray="4 4" label={{ value: "high 180", position: "right", fontSize: 10, fill: "#e2a93f" }} />
          <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: "#8b5cf6" }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Blood pressure: two lines (systolic + diastolic) with 120/80 reference lines.
export function BPChart({ data }) {
  if (!data.length) return null;
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#efe9dd" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8a857a" }} tickLine={false} axisLine={{ stroke: "#e4ddcf" }} interval="preserveStartEnd" minTickGap={20} />
          <YAxis domain={[40, 200]} tick={{ fontSize: 11, fill: "#8a857a" }} tickLine={false} axisLine={false} width={42} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v} mmHg`, n]} />
          <ReferenceLine y={120} stroke="#3f9e6b" strokeDasharray="4 4" />
          <ReferenceLine y={80} stroke="#3f9e6b" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="systolic" name="systolic" stroke="#e0697a" strokeWidth={2.5} dot={{ r: 3, fill: "#e0697a" }} />
          <Line type="monotone" dataKey="diastolic" name="diastolic" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: "#8b5cf6" }} />
        </LineChart>
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

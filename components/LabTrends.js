"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { prettyDate } from "@/lib/dates";

// Up to 4 lab series we know how to chart, with their friendly names and units.
const SERIES = [
  { key: "hba1c", label: "HbA1c", unit: "%", color: "#8b5cf6" },
  { key: "fastingGlucose", label: "Fasting glucose", unit: "mg/dL", color: "#e0697a" },
  { key: "ldl", label: "LDL", unit: "mg/dL", color: "#e2a93f" },
  { key: "systolic", label: "Systolic BP", unit: "mmHg", color: "#3f9e6b" },
];

export default function LabTrends() {
  const [points, setPoints] = useState(null);
  useEffect(() => {
    fetch("/api/lab-trends", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { points: [] }))
      .then((d) => setPoints(d.points || []))
      .catch(() => setPoints([]));
  }, []);

  if (!points) return null;
  if (points.length < 2) return null; // need at least 2 reports for a trend

  // Build chart data per series so we don't connect through nulls visually.
  const data = points.map((p) => ({
    date: p.date,
    label: prettyDate(p.date),
    ...Object.fromEntries(SERIES.map((s) => [s.key, p.labs?.[s.key] ?? null])),
  }));

  // Only show a series if at least 2 of its values are present.
  const shown = SERIES.filter((s) => data.filter((d) => d[s.key] != null).length >= 2);
  if (shown.length === 0) return null;

  return (
    <section className="card mb-6 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-ink">📊 Lab trends across reports</h2>
        <span className="text-xs text-ink/45">{points.length} reports · last on {prettyDate(points[points.length - 1].date)}</span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#efe9dd" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8a857a" }} tickLine={false} axisLine={{ stroke: "#e4ddcf" }} interval="preserveStartEnd" minTickGap={20} />
            <YAxis tick={{ fontSize: 11, fill: "#8a857a" }} tickLine={false} axisLine={false} width={42} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e4ddcf", fontSize: 12 }} />
            {shown.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={`${s.label} (${s.unit})`}
                stroke={s.color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: s.color }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {shown.map((s) => (
          <span key={s.key} className="pill bg-sand/70 text-ink/70" style={{ borderLeft: `4px solid ${s.color}` }}>
            {s.label}
          </span>
        ))}
      </div>
    </section>
  );
}

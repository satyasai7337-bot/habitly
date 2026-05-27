"use client";

import { useEffect, useState } from "react";

// "Today" hero: a circular calorie ring (consumed vs budget) + summary tiles,
// driven by the calorie log / weight budget.
export default function TodayRing() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/food", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});
  }, []);

  const total = Math.round(data?.total || 0);
  const budget = data?.budget ?? null;
  const remaining = data?.remaining ?? null;
  const entries = data?.entries?.length ?? 0;
  const over = budget != null && remaining < 0;
  const pct = budget ? Math.min(100, (total / budget) * 100) : 0;

  // ring geometry
  const r = 78;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  return (
    <section className="card mb-6 p-6">
      <h2 className="mb-4 font-display text-xl font-bold text-ink">Today&apos;s intake</h2>
      <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
        {/* Ring */}
        <div className="relative mx-auto h-[200px] w-[200px]">
          <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
            <defs>
              <linearGradient id="calRing" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#f0934e" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r={r} fill="none" stroke="#efe9fd" strokeWidth="16" />
            <circle
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke={over ? "#e0697a" : "url(#calRing)"}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl">🔥</span>
            <div className="mt-1 font-display text-2xl font-extrabold text-ink">
              {total}
              {budget != null && <span className="text-base font-bold text-ink/40">/{budget}</span>}
            </div>
            <div className="text-xs font-medium text-ink/50">kcal</div>
          </div>
        </div>

        {/* Tiles */}
        <div className="grid grid-cols-2 gap-3">
          <Tile label="Eaten" value={`${total}`} unit="kcal" tone="accent" />
          <Tile label="Budget" value={budget != null ? `${budget}` : "—"} unit="kcal" />
          <Tile
            label={over ? "Over by" : "Remaining"}
            value={remaining != null ? `${Math.abs(remaining)}` : "—"}
            unit="kcal"
            tone={over ? "bad" : "good"}
          />
          <Tile label="Meals logged" value={`${entries}`} unit="today" />
        </div>
      </div>
      {budget == null && (
        <p className="mt-4 text-xs text-ink/50">
          Set a weight goal or complete your profile to get a daily calorie budget.
        </p>
      )}
    </section>
  );
}

function Tile({ label, value, unit, tone }) {
  const color =
    tone === "accent" ? "text-accent" : tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className="rounded-2xl bg-sand/70 px-4 py-3">
      <div className="text-xs font-medium text-ink/50">{label}</div>
      <div className={`font-display text-xl font-extrabold ${color}`}>
        {value} <span className="text-xs font-semibold text-ink/40">{unit}</span>
      </div>
    </div>
  );
}

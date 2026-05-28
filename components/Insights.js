"use client";

import { useEffect, useState } from "react";

// Lightweight, client-side insights computed from /api/habits/summary.
// No new endpoint, no new schema — just useful pattern recognition.
export default function Insights() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetch("/api/habits/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setSummary)
      .catch(() => {});
  }, []);

  if (!summary) return null;
  const habits = summary.habits || [];
  if (habits.length === 0) return null;

  const good = habits.filter((h) => h.type === "good");
  const insights = [];

  // 1. Longest current streak across good habits.
  const topStreak = good.reduce((best, h) => (h.streak > (best?.streak || 0) ? h : best), null);
  if (topStreak && topStreak.streak > 0) {
    insights.push({
      icon: "🔥",
      text: (
        <>
          <b>{topStreak.streak}-day streak</b> on {topStreak.label.toLowerCase()} — keep it going!
        </>
      ),
    });
  }

  // 2. Today's good-habit progress.
  if (good.length > 0) {
    const hitToday = good.filter((h) => h.progress?.met).length;
    insights.push({
      icon: hitToday === good.length ? "🎯" : "✅",
      text: (
        <>
          Today: <b>{hitToday}/{good.length}</b> good-habit{good.length > 1 ? "s" : ""} hit.
          {hitToday === good.length && " Perfect day!"}
        </>
      ),
    });
  }

  // 3. Best 7-day average habit (the one whose series7 most consistently met its target).
  const adherence = good
    .map((h) => {
      const days = h.series7 || [];
      const met = days.filter((d) => d.value >= (h.target || 0)).length;
      return { h, rate: days.length ? met / days.length : 0, met, total: days.length };
    })
    .sort((a, b) => b.rate - a.rate);
  const top = adherence[0];
  if (top && top.rate > 0) {
    insights.push({
      icon: "📈",
      text: (
        <>
          Most consistent this week: <b>{top.h.label}</b> — on target {top.met}/{top.total} days.
        </>
      ),
    });
  }

  // 4. A nudge for the weakest one.
  const worst = adherence[adherence.length - 1];
  if (worst && worst !== top && worst.rate < 0.5 && worst.total > 0) {
    insights.push({
      icon: "💡",
      text: (
        <>
          {worst.h.label} only hit target {worst.met}/{worst.total} days — try one small win today.
        </>
      ),
    });
  }

  if (insights.length === 0) return null;

  return (
    <section className="card mb-6 overflow-hidden">
      <div className="border-b border-line bg-accent-soft/60 px-5 py-3">
        <h2 className="font-display font-bold text-ink">💡 Insights</h2>
      </div>
      <ul className="divide-y divide-line">
        {insights.map((it, i) => (
          <li key={i} className="flex items-start gap-3 px-5 py-3 text-sm text-ink/80">
            <span className="text-lg leading-none">{it.icon}</span>
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

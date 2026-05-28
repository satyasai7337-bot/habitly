"use client";

import { useCallback, useEffect, useState } from "react";
import HabitCard from "@/components/HabitCard";
import AISuggestions from "@/components/AISuggestions";
import ThoughtOfDay from "@/components/ThoughtOfDay";
import Reminders from "@/components/Reminders";
import Medications from "@/components/Medications";
import WeightLoss from "@/components/WeightLoss";
import CalorieLog from "@/components/CalorieLog";
import EnableNotifications from "@/components/EnableNotifications";
import TodayRing from "@/components/TodayRing";
import HealthPlan from "@/components/HealthPlan";

export default function Dashboard({ user }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  // Model-recommended targets, keyed by habit: { water: 3, sleep: 8, ... }.
  const [recommended, setRecommended] = useState({});
  // Computed after mount to avoid a server/client locale hydration mismatch.
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    );
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/habits/summary", { cache: "no-store" });
      if (res.ok) setSummary(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Load personalized target recommendations once. Only kept when the user's
  // profile is complete, so we never show defaults-from-average as "suggested".
  useEffect(() => {
    fetch("/api/ai/targets", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.profileComplete) return;
        const map = {};
        for (const r of d.recommendations || []) {
          if (r.personalized) map[r.key] = r.recommendedTarget;
        }
        setRecommended(map);
      })
      .catch(() => {});
  }, []);

  const habits = summary?.habits || [];
  const good = habits.filter((h) => h.type === "good");
  const bad = habits.filter((h) => h.type === "bad");

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Your day
          </h1>
          <p className="text-sm text-ink/60">{today || "Today"}</p>
        </div>
        <div className="flex gap-3">
          <StatChip label="Next reminder" value={nextReminderText(summary?.nextReminder)} />
          <StatChip label="Reminders today" value={summary ? String(summary.totalRemindersSent) : "—"} />
        </div>
      </div>

      {/* Today's calorie ring */}
      <TodayRing />

      {/* AI-generated plan from a medical report */}
      <HealthPlan />

      {/* Thought of the day */}
      <ThoughtOfDay />

      {/* Push notifications opt-in */}
      <EnableNotifications />

      {/* Weight-loss goal */}
      <WeightLoss />

      {/* Calorie intake */}
      <CalorieLog />

      {/* In-app reminders */}
      <Reminders onChanged={refresh} />

      {/* Medications */}
      <Medications />

      {/* AI */}
      <div className="mb-8">
        <AISuggestions />
      </div>

      {loading && <p className="text-sm text-ink/50">Loading your habits…</p>}

      {/* Good habits */}
      {good.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-xl font-bold text-ink">
            ✅ Good habits <span className="text-sm font-medium text-ink/40">— keep building</span>
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {good.map((h) => (
              <HabitCard key={h.key} habit={h} onChanged={refresh} recommended={recommended[h.key]} />
            ))}
          </div>
        </section>
      )}

      {/* Bad habits */}
      {bad.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-xl font-bold text-ink">
            🛑 Habits to prevent <span className="text-sm font-medium text-ink/40">— track & reduce</span>
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {bad.map((h) => (
              <HabitCard key={h.key} habit={h} onChanged={refresh} />
            ))}
          </div>
        </section>
      )}

      {!loading && habits.length === 0 && (
        <p className="text-sm text-ink/50">No habits selected yet.</p>
      )}
    </div>
  );
}

function StatChip({ label, value }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-2 shadow-soft">
      <div className="text-xs font-medium text-ink/50">{label}</div>
      <div className="font-display font-bold text-ink">{value}</div>
    </div>
  );
}

function nextReminderText(nr) {
  if (!nr) return "—";
  return `${nr.emoji} ${nr.slot}`;
}

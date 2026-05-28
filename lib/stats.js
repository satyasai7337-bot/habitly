import { lastNDays, dateKey, prettyDate } from "@/lib/dates";

// Sum log entries per date -> { "YYYY-MM-DD": total }
export function aggregateByDate(logs) {
  const map = {};
  for (const l of logs) {
    map[l.date] = (map[l.date] || 0) + (l.value || 0);
  }
  return map;
}

// Build a chart-friendly series for the given day keys.
export function buildSeries(dayKeys, map) {
  return dayKeys.map((d) => ({
    date: d,
    label: prettyDate(d),
    value: Math.round((map[d] || 0) * 100) / 100,
  }));
}

// Progress for a single habit given today's total.
export function habitProgress(habit, todayTotal) {
  const target = habit.target || 0;
  if (habit.targetDirection === "avoid") {
    // bad habit: 0 is best. "remaining" = how far over the (usually 0) limit.
    const over = Math.max(0, todayTotal - target);
    return {
      today: todayTotal,
      target,
      // percent of an "alert" scale (capped) just for the bar width
      percent: target > 0 ? Math.min(100, (todayTotal / target) * 100) : todayTotal > 0 ? 100 : 0,
      met: todayTotal <= target,
      over,
    };
  }
  // good habit: reach at least target
  const percent = target > 0 ? Math.min(100, (todayTotal / target) * 100) : 0;
  return {
    today: todayTotal,
    target,
    percent: Math.round(percent),
    met: todayTotal >= target,
    remaining: Math.max(0, target - todayTotal),
  };
}

// Compute the next upcoming good-habit reminder across all habits.
export function nextReminder(habits, now = new Date()) {
  let best = null;
  for (const h of habits) {
    if (h.type !== "good" || h.reminderEnabled === false) continue;
    for (const slot of h.reminderTimes || []) {
      const [hh, mm] = slot.split(":").map(Number);
      const when = new Date(now);
      when.setHours(hh, mm, 0, 0);
      if (when <= now) when.setDate(when.getDate() + 1); // already passed -> tomorrow
      if (!best || when < best.when) {
        best = { habitKey: h.key, label: h.label, emoji: h.emoji, slot, when };
      }
    }
  }
  if (!best) return null;
  return {
    habitKey: best.habitKey,
    label: best.label,
    emoji: best.emoji,
    slot: best.slot,
    whenISO: best.when.toISOString(),
  };
}

// Adherence stats over a set of day keys for one good habit.
export function adherence(habit, dayKeys, map) {
  if (habit.targetDirection === "avoid") {
    const total = dayKeys.reduce((s, d) => s + (map[d] || 0), 0);
    const cleanDays = dayKeys.filter((d) => (map[d] || 0) <= (habit.target || 0)).length;
    return {
      total: round(total),
      avg: round(total / dayKeys.length),
      cleanDays,
      days: dayKeys.length,
    };
  }
  const total = dayKeys.reduce((s, d) => s + (map[d] || 0), 0);
  const metDays = dayKeys.filter((d) => (map[d] || 0) >= (habit.target || 0)).length;
  return {
    total: round(total),
    avg: round(total / dayKeys.length),
    metDays,
    days: dayKeys.length,
    rate: Math.round((metDays / dayKeys.length) * 100),
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

// Consecutive days (ending today) where the habit met its target.
// For "avoid" habits, met = total <= target (a no-log day counts as clean).
// `dayKeys` oldest-first, `map` is { date: total } from aggregateByDate.
export function streak(habit, dayKeys, map) {
  let count = 0;
  for (let i = dayKeys.length - 1; i >= 0; i--) {
    const total = map[dayKeys[i]] || 0;
    const met =
      habit.targetDirection === "avoid"
        ? total <= (habit.target || 0)
        : total >= (habit.target || 0);
    if (met) count++;
    else break;
  }
  return count;
}

// ---- Scoring & certificate ----

// You "complete" the monthly target (and earn a certificate) at this score.
export const PASS_THRESHOLD = 70;

// 0–100 score for one habit over a period, from its adherence stats.
// Good habit: % of days the target was met. Bad habit: % of clean days.
export function habitScore(habit, stats) {
  if (!stats || !stats.days) return 0;
  if (habit.targetDirection === "avoid") {
    return Math.round((100 * (stats.cleanDays || 0)) / stats.days);
  }
  return Math.round((100 * (stats.metDays || 0)) / stats.days);
}

// Average score across all tracked habits.
export function overallScore(reportHabits) {
  if (!reportHabits || reportHabits.length === 0) return 0;
  const sum = reportHabits.reduce((s, h) => s + habitScore(h, h.stats), 0);
  return Math.round(sum / reportHabits.length);
}

export function gradeFor(score) {
  if (score >= 90) return { label: "Platinum", tier: "platinum", emoji: "🏆" };
  if (score >= 80) return { label: "Gold", tier: "gold", emoji: "🥇" };
  if (score >= PASS_THRESHOLD) return { label: "Silver", tier: "silver", emoji: "🥈" };
  if (score >= 60) return { label: "Bronze", tier: "bronze", emoji: "🥉" };
  return { label: "In progress", tier: "none", emoji: "🌱" };
}

export { lastNDays, dateKey };

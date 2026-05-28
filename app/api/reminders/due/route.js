import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getLogsByDates, getReminderLogsForDate, insertReminderLogs } from "@/lib/store";
import { todayKey, currentSlot } from "@/lib/dates";
import { aggregateByDate } from "@/lib/stats";

export const runtime = "nodejs";

// In-app reminders: figures out which good-habit reminder times have come due
// today, records them (so they're counted and don't repeat), and returns the
// ones that still need action (target not yet met today).
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const today = todayKey(user.timezone);
  const curSlot = currentSlot(user.timezone);

  // Today's logged totals per habit.
  const logs = await getLogsByDates(user.id, [today]);
  const byHabit = {};
  for (const l of logs) (byHabit[l.habitKey] ||= []).push(l);
  const totals = {};
  for (const h of user.habits) {
    const map = aggregateByDate(byHabit[h.key] || []);
    totals[h.key] = map[today] || 0;
  }

  // Reminders already recorded today.
  const existing = await getReminderLogsForDate(user.id, today);
  const seen = new Set(existing.map((r) => `${r.habitKey}|${r.slot}`));

  // Record any newly-due slots.
  const toCreate = [];
  for (const h of user.habits) {
    if (h.type !== "good" || h.reminderEnabled === false) continue;
    for (const slot of h.reminderTimes || []) {
      if (slot <= curSlot && !seen.has(`${h.key}|${slot}`)) {
        toCreate.push({ user: user.id, habitKey: h.key, slot, date: today });
        seen.add(`${h.key}|${slot}`);
      }
    }
  }
  if (toCreate.length) {
    try {
      await insertReminderLogs(toCreate);
    } catch (e) {
      console.error("reminder insert error:", e?.message || e);
    }
  }

  // Build the list of habits with at least one due reminder today.
  const reminders = [];
  for (const h of user.habits) {
    if (h.type !== "good" || h.reminderEnabled === false) continue;
    const dueSlots = (h.reminderTimes || []).filter((s) => s <= curSlot);
    if (dueSlots.length === 0) continue;
    const todayTotal = totals[h.key] || 0;
    reminders.push({
      habitKey: h.key,
      label: h.label,
      emoji: h.emoji,
      unit: h.unit,
      target: h.target,
      step: h.step,
      consequence: h.consequence,
      todayTotal,
      met: todayTotal >= (h.target || 0),
      dueCount: dueSlots.length,
      lastSlot: dueSlots[dueSlots.length - 1],
    });
  }

  const pending = reminders.filter((r) => !r.met);
  return NextResponse.json({
    pending,
    pendingCount: pending.length,
    newCount: toCreate.length,
    serverSlot: curSlot,
  });
}

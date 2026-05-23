import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import HabitLog from "@/models/HabitLog";
import ReminderLog from "@/models/ReminderLog";
import { getSessionUser } from "@/lib/auth";
import { todayKey } from "@/lib/dates";

export const runtime = "nodejs";

// In-app reminders: figures out which good-habit reminder times have come due
// today, records them (so they're counted and don't repeat), and returns the
// ones that still need action (target not yet met today).
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const today = todayKey();
  const now = new Date();
  const curSlot = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  // Today's logged totals per habit.
  const agg = await HabitLog.aggregate([
    { $match: { user: oid(user.id), date: today } },
    { $group: { _id: "$habitKey", total: { $sum: "$value" } } },
  ]);
  const totals = Object.fromEntries(agg.map((a) => [a._id, a.total]));

  // Reminders already recorded today.
  const existing = await ReminderLog.find({ user: user.id, date: today }).lean();
  const seen = new Set(existing.map((r) => `${r.habitKey}|${r.slot}`));

  // Record any newly-due slots.
  const toCreate = [];
  for (const h of user.habits) {
    if (h.type !== "good" || h.reminderEnabled === false) continue;
    for (const slot of h.reminderTimes || []) {
      if (slot <= curSlot && !seen.has(`${h.key}|${slot}`)) {
        toCreate.push({
          user: user.id,
          habitKey: h.key,
          slot,
          date: today,
          channel: "app",
          status: "shown",
          sentAt: new Date(),
        });
        seen.add(`${h.key}|${slot}`);
      }
    }
  }
  if (toCreate.length) {
    try {
      await ReminderLog.insertMany(toCreate, { ordered: false });
    } catch {
      // unique-index race on a duplicate slot — safe to ignore
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

function oid(id) {
  return new mongoose.Types.ObjectId(id);
}

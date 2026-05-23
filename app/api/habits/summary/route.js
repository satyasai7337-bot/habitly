import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import HabitLog from "@/models/HabitLog";
import ReminderLog from "@/models/ReminderLog";
import { getSessionUser } from "@/lib/auth";
import { lastNDays, todayKey } from "@/lib/dates";
import { aggregateByDate, buildSeries, habitProgress, nextReminder } from "@/lib/stats";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const days7 = lastNDays(7);
  const today = todayKey();

  const logs = await HabitLog.find({
    user: user.id,
    date: { $in: days7 },
  }).lean();

  // group logs by habit
  const byHabit = {};
  for (const l of logs) {
    (byHabit[l.habitKey] ||= []).push(l);
  }

  // reminders shown per habit (today)
  const reminderCounts = await ReminderLog.aggregate([
    { $match: { user: toObjectId(user.id), date: today } },
    { $group: { _id: "$habitKey", n: { $sum: 1 } } },
  ]);
  const remByHabit = Object.fromEntries(reminderCounts.map((r) => [r._id, r.n]));
  const totalRemindersSent = reminderCounts.reduce((s, r) => s + r.n, 0);

  const habits = user.habits.map((h) => {
    const map = aggregateByDate(byHabit[h.key] || []);
    const todayTotal = map[today] || 0;
    return {
      ...h,
      todayTotal,
      progress: habitProgress(h, todayTotal),
      series7: buildSeries(days7, map),
      remindersSent: h.type === "good" ? remByHabit[h.key] || 0 : null,
    };
  });

  return NextResponse.json({
    habits,
    nextReminder: nextReminder(user.habits),
    totalRemindersSent,
  });
}

function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

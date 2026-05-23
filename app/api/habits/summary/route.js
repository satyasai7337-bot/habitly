import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getLogsByDates, countRemindersByHabitForDate } from "@/lib/store";
import { lastNDays, todayKey } from "@/lib/dates";
import { aggregateByDate, buildSeries, habitProgress, nextReminder } from "@/lib/stats";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const days7 = lastNDays(7);
  const today = todayKey();

  const logs = await getLogsByDates(user.id, days7);

  // group logs by habit
  const byHabit = {};
  for (const l of logs) (byHabit[l.habitKey] ||= []).push(l);

  // reminders shown per habit (today)
  const remByHabit = await countRemindersByHabitForDate(user.id, today);
  const totalRemindersSent = Object.values(remByHabit).reduce((s, n) => s + n, 0);

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

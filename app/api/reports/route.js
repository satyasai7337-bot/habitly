import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import HabitLog from "@/models/HabitLog";
import { getSessionUser } from "@/lib/auth";
import { rangeForPeriod } from "@/lib/dates";
import { aggregateByDate, buildSeries, adherence } from "@/lib/stats";

export const runtime = "nodejs";

export async function GET(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") === "month" ? "month" : "week";
  const dayKeys = rangeForPeriod(period);

  await connectDB();
  const logs = await HabitLog.find({
    user: user.id,
    date: { $in: dayKeys },
  }).lean();

  const byHabit = {};
  for (const l of logs) (byHabit[l.habitKey] ||= []).push(l);

  const habits = user.habits.map((h) => {
    const map = aggregateByDate(byHabit[h.key] || []);
    return {
      key: h.key,
      label: h.label,
      type: h.type,
      emoji: h.emoji,
      unit: h.unit,
      target: h.target,
      targetDirection: h.targetDirection,
      consequence: h.consequence,
      series: buildSeries(dayKeys, map),
      stats: adherence(h, dayKeys, map),
    };
  });

  return NextResponse.json({ period, days: dayKeys.length, habits });
}

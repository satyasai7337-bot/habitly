import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getLogsByDates } from "@/lib/store";
import { rangeForPeriod } from "@/lib/dates";
import { aggregateByDate, adherence } from "@/lib/stats";
import { generateSuggestions } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const dayKeys = rangeForPeriod("week");
  const logs = await getLogsByDates(user.id, dayKeys);

  const byHabit = {};
  for (const l of logs) (byHabit[l.habitKey] ||= []).push(l);

  const habits = user.habits.map((h) => {
    const map = aggregateByDate(byHabit[h.key] || []);
    const stats = adherence(h, dayKeys, map);
    return {
      key: h.key,
      label: h.label,
      type: h.type,
      unit: h.unit,
      target: h.target,
      ...stats,
    };
  });

  const profile = {
    age: user.age,
    sex: user.sex,
    bodyWeight: user.bodyWeight,
    height: user.height,
  };

  const result = await generateSuggestions(profile, habits);
  return NextResponse.json(result);
}

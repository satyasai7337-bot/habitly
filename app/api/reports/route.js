import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getLogsByDates, getMedications, getMedicationLogsByDates } from "@/lib/store";
import { rangeForPeriod, todayKey, currentSlot } from "@/lib/dates";
import { aggregateByDate, buildSeries, adherence } from "@/lib/stats";
import { medicationAdherence } from "@/lib/medications";

export const runtime = "nodejs";

export async function GET(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") === "month" ? "month" : "week";
  const dayKeys = rangeForPeriod(period, user.timezone);

  const logs = await getLogsByDates(user.id, dayKeys);

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

  // Medication adherence over the same window. Wrapped so a missing
  // medications table (before the migration is run) never breaks Reports.
  let meds = { perMed: [], scheduled: 0, taken: 0, rate: null };
  try {
    const curSlot = currentSlot(user.timezone);
    const [medications, medLogs] = await Promise.all([
      getMedications(user.id),
      getMedicationLogsByDates(user.id, dayKeys),
    ]);
    meds = medicationAdherence(medications, medLogs, dayKeys, todayKey(user.timezone), curSlot);
  } catch (e) {
    console.error("medication adherence skipped:", e?.message || e);
  }

  return NextResponse.json({ period, days: dayKeys.length, habits, meds });
}

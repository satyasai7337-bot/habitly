import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createLog, sumForHabitDate, getRecentLogs } from "@/lib/store";
import { todayKey, dateKey } from "@/lib/dates";

export const runtime = "nodejs";

// Add a habit entry (an amount/usage). Multiple per day are summed.
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { habitKey, value, note, date } = await req.json();
    const habit = user.habits.find((h) => h.key === habitKey);
    if (!habit) {
      return NextResponse.json({ error: "You are not tracking that habit." }, { status: 400 });
    }
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return NextResponse.json({ error: "Invalid value." }, { status: 400 });
    }

    const day = date ? dateKey(new Date(date)) : todayKey();
    await createLog({ userId: user.id, habitKey, date: day, value: num, note });
    const todayTotal = await sumForHabitDate(user.id, habitKey, day);

    return NextResponse.json({ ok: true, habitKey, date: day, todayTotal });
  } catch (err) {
    console.error("log error:", err);
    return NextResponse.json({ error: "Could not save entry." }, { status: 500 });
  }
}

// Recent raw entries for a habit (most recent first).
export async function GET(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const habitKey = searchParams.get("habitKey");
  const logs = await getRecentLogs(user.id, habitKey);
  return NextResponse.json({ logs });
}

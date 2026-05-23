import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import HabitLog from "@/models/HabitLog";
import { getSessionUser } from "@/lib/auth";
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

    await connectDB();
    const day = date ? dateKey(new Date(date)) : todayKey();

    await HabitLog.create({
      user: user.id,
      habitKey,
      date: day,
      value: num,
      note: note || "",
    });

    const agg = await HabitLog.aggregate([
      { $match: { user: toObjectId(user.id), habitKey, date: day } },
      { $group: { _id: null, total: { $sum: "$value" } } },
    ]);
    const todayTotal = agg[0]?.total || 0;

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
  await connectDB();
  const q = { user: user.id };
  if (habitKey) q.habitKey = habitKey;
  const logs = await HabitLog.find(q).sort({ createdAt: -1 }).limit(50).lean();
  return NextResponse.json({
    logs: logs.map((l) => ({
      id: String(l._id),
      habitKey: l.habitKey,
      date: l.date,
      value: l.value,
      note: l.note,
      createdAt: l.createdAt,
    })),
  });
}

function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

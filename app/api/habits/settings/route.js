import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getSessionUser, sanitizeUser } from "@/lib/auth";

export const runtime = "nodejs";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Update a habit's target and (for good habits) reminder times / enabled.
export async function PATCH(req) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { habitKey, target, reminderTimes, reminderEnabled } = await req.json();

    await connectDB();
    const user = await User.findById(session.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const habit = user.habits.find((h) => h.key === habitKey);
    if (!habit) return NextResponse.json({ error: "Habit not tracked" }, { status: 400 });

    if (target !== undefined) {
      const t = Number(target);
      if (Number.isFinite(t) && t >= 0) habit.target = t;
    }

    if (habit.type === "good") {
      if (Array.isArray(reminderTimes)) {
        const clean = [...new Set(reminderTimes.filter((t) => TIME_RE.test(t)))].sort();
        habit.reminderTimes = clean;
      }
      if (typeof reminderEnabled === "boolean") {
        habit.reminderEnabled = reminderEnabled;
      }
    }

    await user.save();
    return NextResponse.json({ user: sanitizeUser(user.toObject()) });
  } catch (err) {
    console.error("settings error:", err);
    return NextResponse.json({ error: "Could not update settings." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSessionUser, sanitizeUser } from "@/lib/auth";
import { updateUserHabits } from "@/lib/store";

export const runtime = "nodejs";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Update a habit's target and (for good habits) reminder times / enabled.
export async function PATCH(req) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { habitKey, target, reminderTimes, reminderEnabled } = await req.json();

    const habits = session.habits.map((h) => ({ ...h }));
    const habit = habits.find((h) => h.key === habitKey);
    if (!habit) return NextResponse.json({ error: "Habit not tracked" }, { status: 400 });

    if (target !== undefined) {
      const t = Number(target);
      if (Number.isFinite(t) && t >= 0) habit.target = t;
    }

    if (habit.type === "good") {
      if (Array.isArray(reminderTimes)) {
        habit.reminderTimes = [...new Set(reminderTimes.filter((t) => TIME_RE.test(t)))].sort();
      }
      if (typeof reminderEnabled === "boolean") {
        habit.reminderEnabled = reminderEnabled;
      }
    }

    const user = await updateUserHabits(session.id, habits);
    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("settings error:", err);
    return NextResponse.json({ error: "Could not update settings." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSessionUser, sanitizeUser } from "@/lib/auth";
import { updateUserHabits } from "@/lib/store";

export const runtime = "nodejs";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const KEY_RE = /^[a-z0-9_]{2,30}$/;

function normalizeTimes(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.filter((t) => typeof t === "string" && TIME_RE.test(t)))].sort();
}

// POST: add a custom habit. Body: { key, label, emoji?, type, unit, target,
// step, targetDirection?, reminderTimes?, consequence? }
export async function POST(req) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const key = String(b.key || "").trim().toLowerCase().replace(/\s+/g, "_");
    if (!KEY_RE.test(key)) {
      return NextResponse.json({ error: "Key must be 2–30 chars, letters/digits/underscores." }, { status: 400 });
    }
    if (session.habits.some((h) => h.key === key)) {
      return NextResponse.json({ error: "You already have a habit with this key." }, { status: 409 });
    }
    const label = String(b.label || "").trim().slice(0, 60);
    if (!label) return NextResponse.json({ error: "Label is required." }, { status: 400 });
    const type = b.type === "bad" ? "bad" : "good";
    const targetDirection = type === "bad" ? "avoid" : "atleast";
    const target = Number(b.target);
    if (!Number.isFinite(target) || target < 0) {
      return NextResponse.json({ error: "Target must be a non-negative number." }, { status: 400 });
    }
    const step = Number(b.step);
    const cfg = {
      key,
      label,
      type,
      emoji: String(b.emoji || (type === "good" ? "⭐" : "🚫")).slice(0, 4),
      unit: String(b.unit || "").trim().slice(0, 16) || "units",
      target: type === "bad" ? 0 : target,
      targetDirection,
      step: Number.isFinite(step) && step > 0 ? step : 1,
      consequence: String(b.consequence || (type === "good" ? "Skipping this hurts your progress." : "Doing this harms your health.")).slice(0, 240),
      reminderTimes: type === "good" ? normalizeTimes(b.reminderTimes) : [],
      reminderEnabled: true,
    };

    const next = [...session.habits.map((h) => ({ ...h })), cfg];
    const user = await updateUserHabits(session.id, next);
    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("habit POST error:", err);
    return NextResponse.json({ error: "Could not add habit." }, { status: 500 });
  }
}

// DELETE /api/habits/settings?habitKey=...
export async function DELETE(req) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const habitKey = new URL(req.url).searchParams.get("habitKey");
  if (!habitKey) return NextResponse.json({ error: "Missing habitKey." }, { status: 400 });
  try {
    const next = session.habits.filter((h) => h.key !== habitKey).map((h) => ({ ...h }));
    const user = await updateUserHabits(session.id, next);
    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("habit DELETE error:", err);
    return NextResponse.json({ error: "Could not remove habit." }, { status: 500 });
  }
}

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

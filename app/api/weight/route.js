import { NextResponse } from "next/server";
import { getSessionUser, sanitizeUser } from "@/lib/auth";
import { upsertWeightLog, deleteWeightLog, updateUserGoal, setUserBodyWeight } from "@/lib/store";
import { todayKey } from "@/lib/dates";
import { bmiOf, projectFromLogs, healthyWeightRange } from "@/lib/weight";
import { getUserNutrition } from "@/lib/nutritionServer";

export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET: weight goal, logs, inferred activity, calorie budget plan, and the
// projected finish date from the logged trend.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { today, logs, current, activity, profileComplete, tdee, plan } =
    await getUserNutrition(user);
  const startWeight = logs.length ? logs[0].weight : user.bodyWeight;

  return NextResponse.json({
    profileComplete,
    goalWeight: user.goalWeight,
    goalDate: user.goalDate,
    current,
    startWeight,
    bmi: current != null && user.height ? bmiOf(current, user.height) : null,
    healthyRange: user.height ? healthyWeightRange(user.height) : null,
    activity,
    tdee,
    logs,
    plan,
    projection: projectFromLogs(logs, user.goalWeight),
    today,
  });
}

// POST: log a weight for a day (defaults to today). Keeps the profile weight in
// sync when logging today's value.
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const weight = Number(body.weight);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 500) {
      return NextResponse.json({ error: "Enter a valid weight in kg." }, { status: 400 });
    }
    const today = todayKey();
    const date = DATE_RE.test(String(body.date)) ? body.date : today;

    await upsertWeightLog({ userId: user.id, date, weight });
    if (date === today) await setUserBodyWeight(user.id, weight);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("weight POST error:", err);
    return NextResponse.json({ error: "Could not log weight." }, { status: 500 });
  }
}

// PATCH: set or update the weight goal (target weight + date).
export async function PATCH(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();

    // Allow clearing the goal.
    if (body.goalWeight === null && body.goalDate === null) {
      const updated = await updateUserGoal(user.id, { goalWeight: null, goalDate: null });
      return NextResponse.json({ user: sanitizeUser(updated) });
    }

    const goalWeight = Number(body.goalWeight);
    if (!Number.isFinite(goalWeight) || goalWeight <= 0 || goalWeight > 500) {
      return NextResponse.json({ error: "Enter a valid goal weight." }, { status: 400 });
    }
    if (!DATE_RE.test(String(body.goalDate)) || body.goalDate <= todayKey()) {
      return NextResponse.json({ error: "Pick a target date in the future." }, { status: 400 });
    }

    const updated = await updateUserGoal(user.id, { goalWeight, goalDate: body.goalDate });
    return NextResponse.json({ user: sanitizeUser(updated) });
  } catch (err) {
    console.error("weight PATCH error:", err);
    return NextResponse.json({ error: "Could not save goal." }, { status: 500 });
  }
}

// DELETE: remove a logged weight by date (/api/weight?date=YYYY-MM-DD).
export async function DELETE(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const date = new URL(req.url).searchParams.get("date");
  if (!DATE_RE.test(String(date))) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  try {
    await deleteWeightLog(user.id, date);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("weight DELETE error:", err);
    return NextResponse.json({ error: "Could not delete entry." }, { status: 500 });
  }
}

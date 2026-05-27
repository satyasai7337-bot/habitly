import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getFoodLogsForDate, createFoodLog, deleteFoodLog } from "@/lib/store";
import { getUserNutrition } from "@/lib/nutritionServer";
import { todayKey } from "@/lib/dates";

export const runtime = "nodejs";

const MEALS = ["breakfast", "lunch", "dinner", "snack"];

// GET: today's calorie entries, total, daily budget, and remaining.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const today = todayKey();
  const [entries, nutrition] = await Promise.all([
    getFoodLogsForDate(user.id, today),
    getUserNutrition(user),
  ]);

  const total = entries.reduce((s, e) => s + e.calories, 0);
  const budget = nutrition.budget; // null if profile incomplete

  return NextResponse.json({
    date: today,
    entries,
    total,
    budget,
    remaining: budget != null ? Math.round(budget - total) : null,
    profileComplete: nutrition.profileComplete,
    isGoalBudget: !!nutrition.plan && nutrition.plan.mode === "loss",
  });
}

// POST: add a calorie entry. Body: { name?, calories, meal?, date? }
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const calories = Math.round(Number(body.calories));
    if (!Number.isFinite(calories) || calories <= 0 || calories > 5000) {
      return NextResponse.json({ error: "Enter calories between 1 and 5000." }, { status: 400 });
    }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) ? body.date : todayKey();
    const meal = MEALS.includes(body.meal) ? body.meal : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";

    const entry = await createFoodLog({ userId: user.id, date, name, calories, meal });
    return NextResponse.json({ entry });
  } catch (err) {
    console.error("food POST error:", err);
    return NextResponse.json({ error: "Could not log food." }, { status: 500 });
  }
}

// DELETE: remove an entry (/api/food?id=<uuid>).
export async function DELETE(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing entry id." }, { status: 400 });
  try {
    await deleteFoodLog(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("food DELETE error:", err);
    return NextResponse.json({ error: "Could not delete entry." }, { status: 500 });
  }
}

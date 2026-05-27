import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getFoodLogsForDate } from "@/lib/store";
import { getUserNutrition } from "@/lib/nutritionServer";
import { generateMealIdeas } from "@/lib/ai";
import { todayKey } from "@/lib/dates";

export const runtime = "nodejs";

const MEALS = ["breakfast", "lunch", "dinner", "snack"];
const DIETS = ["any", "vegetarian", "vegan", "non-veg", "high-protein"];

// Suggest meal ideas for the calories the user has left today.
// Body: { meal?, diet? }
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const meal = MEALS.includes(body.meal) ? body.meal : "";
  const diet = DIETS.includes(body.diet) ? body.diet : "any";

  const today = todayKey();
  const [entries, nutrition] = await Promise.all([
    getFoodLogsForDate(user.id, today),
    getUserNutrition(user),
  ]);
  const total = entries.reduce((s, e) => s + e.calories, 0);

  // Without a computable budget, assume a sensible default so the user still
  // gets ideas.
  const budget = nutrition.budget ?? 2000;
  const remaining = Math.round(budget - total);

  const result = await generateMealIdeas({
    remaining,
    meal,
    diet,
    profile: { age: user.age, sex: user.sex },
  });

  return NextResponse.json({ ...result, remaining, budget, total });
}

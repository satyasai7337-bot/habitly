// Server-side helper: resolve a user's current weight, inferred activity, and
// daily calorie budget. Shared by /api/weight and /api/food so they never
// disagree on the number. (Separate from the pure lib/weight.js because it
// reaches into the data layer.)
import { getWeightLogs, getLogsByDates } from "@/lib/store";
import { lastNDays, todayKey } from "@/lib/dates";

// Use the user's timezone when one is set, so "today" matches their day.
import { aggregateByDate } from "@/lib/stats";
import { inferActivity, resolveNutrition } from "@/lib/weight";

export async function getUserNutrition(user) {
  const tz = user.timezone;
  const today = todayKey(tz);
  const logs = await getWeightLogs(user.id);
  const current = logs.length ? logs[logs.length - 1].weight : user.bodyWeight;

  // Infer activity from the last 14 days of walking/gym logs.
  const days14 = lastNDays(14, tz);
  const habitLogs = await getLogsByDates(user.id, days14);
  const byHabit = {};
  for (const l of habitLogs) (byHabit[l.habitKey] ||= []).push(l);
  const sum = (k) => Object.values(aggregateByDate(byHabit[k] || [])).reduce((s, v) => s + v, 0);
  const activity = inferActivity({ avgSteps: sum("walking") / 14, avgGymMin: sum("gym") / 14 });

  const profileComplete =
    user.height != null && user.age != null && user.sex != null && current != null;

  let tdee = null;
  let plan = null;
  let budget = null;
  if (profileComplete) {
    const profile = { sex: user.sex, height: user.height, age: user.age, weight: current };
    ({ tdee, plan, budget } = resolveNutrition({
      profile,
      current,
      goalWeight: user.goalWeight,
      goalDate: user.goalDate,
      today,
      factor: activity.factor,
    }));
  }

  return { today, logs, current, activity, profileComplete, tdee, plan, budget };
}

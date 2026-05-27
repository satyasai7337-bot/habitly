// Weight-loss math. All pure functions — energy balance heuristics for a habit
// tracker, NOT medical advice. The UI labels them as such and applies safety
// caps (max pace + calorie floor; no deficit when underweight).

export const KCAL_PER_KG = 7700; // approx energy in 1 kg of body fat
export const MAX_PACE = 0.75; // kg/week — recommended safe upper bound
export const MIN_BMI = 18.5; // below this we don't recommend losing

// Minimum daily calories we'll ever recommend, by sex.
const CALORIE_FLOOR = { male: 1500, female: 1200, other: 1300 };

// Activity multipliers (Mifflin-St-Jeor TDEE).
const ACTIVITY = [
  { factor: 1.2, label: "sedentary" },
  { factor: 1.375, label: "lightly active" },
  { factor: 1.55, label: "moderately active" },
  { factor: 1.725, label: "very active" },
];

function sexKey(sex) {
  return String(sex || "").toLowerCase().startsWith("m") ? "male"
    : String(sex || "").toLowerCase().startsWith("f") ? "female"
    : "other";
}

// Mifflin-St-Jeor basal metabolic rate (kcal/day).
export function bmr({ sex, weight, height, age }) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(base + (sexKey(sex) === "male" ? 5 : -161));
}

export function bmiOf(weight, height) {
  const m = height / 100;
  if (!m) return null;
  return Math.round((weight / (m * m)) * 10) / 10;
}

// Healthy weight range (BMI 18.5–24.9) for a height, in kg.
export function healthyWeightRange(height) {
  const m = height / 100;
  if (!m) return null;
  return { min: Math.round(18.5 * m * m), max: Math.round(24.9 * m * m) };
}

// Infer an activity multiplier from recent average steps + gym minutes/day.
export function inferActivity({ avgSteps = 0, avgGymMin = 0 }) {
  let i = 0; // sedentary
  if (avgSteps >= 12000 || avgGymMin >= 60) i = 3;
  else if (avgSteps >= 8000 || avgGymMin >= 40) i = 2;
  else if (avgSteps >= 5000 || avgGymMin >= 15) i = 1;
  return ACTIVITY[i];
}

export function tdee(profile, factor) {
  return Math.round(bmr(profile) * factor);
}

// Resolve the daily calorie target: the weight-loss budget when a goal is set,
// otherwise maintenance (TDEE). Shared by the weight and food-log features so
// they always show the same number.
export function resolveNutrition({ profile, current, goalWeight, goalDate, today, factor }) {
  const tdeeVal = tdee(profile, factor);
  let plan = null;
  if (goalWeight != null && goalDate) {
    plan = buildPlan({ profile, current, goalWeight, goalDate, today, tdeeVal });
  }
  return { tdee: tdeeVal, plan, budget: plan ? plan.calorieBudget : tdeeVal };
}

// ---- date helpers (UTC day-number arithmetic, timezone-stable) ----
function toDays(key) {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
function fromDays(n) {
  const dt = new Date(n * 86400000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Build the plan from a target weight + target date.
// Returns the daily calorie budget, required vs safe pace, feasibility, and a
// suggested feasible date when the target date is too aggressive.
export function buildPlan({ profile, current, goalWeight, goalDate, today, tdeeVal }) {
  const bmi = bmiOf(current, profile.height);
  const floor = CALORIE_FLOOR[sexKey(profile.sex)];

  // Not a weight-loss goal.
  if (goalWeight >= current) {
    return { mode: "not_loss", bmi, calorieBudget: tdeeVal, tdee: tdeeVal };
  }
  // Already lean — recommend maintenance, not a deficit.
  if (bmi != null && bmi < MIN_BMI) {
    return { mode: "underweight", bmi, calorieBudget: tdeeVal, tdee: tdeeVal };
  }

  const totalToLose = round1(current - goalWeight);
  const weeks = (toDays(goalDate) - toDays(today)) / 7;
  if (weeks <= 0) {
    return { mode: "date_passed", bmi, totalToLose, tdee: tdeeVal, calorieBudget: tdeeVal };
  }

  const requiredPace = totalToLose / weeks; // kg/week
  const safe = requiredPace <= MAX_PACE;
  const effPace = Math.min(requiredPace, MAX_PACE);

  let budget = Math.round(tdeeVal - (effPace * KCAL_PER_KG) / 7);
  const floorHit = budget < floor;
  if (floorHit) budget = floor;

  // Pace actually achievable given the (possibly floored) budget.
  const achievablePace = round2(((tdeeVal - budget) * 7) / KCAL_PER_KG);
  const finishDays = achievablePace > 0 ? Math.ceil(totalToLose / achievablePace * 7) : null;
  const feasibleDate = finishDays != null ? fromDays(toDays(today) + finishDays) : null;

  return {
    mode: "loss",
    bmi,
    totalToLose,
    weeks: Math.round(weeks * 10) / 10,
    requiredPace: round2(requiredPace),
    safePace: MAX_PACE,
    safe: safe && !floorHit,
    achievablePace,
    dailyDeficit: tdeeVal - budget,
    calorieBudget: budget,
    tdee: tdeeVal,
    floorHit,
    feasibleDate: safe && !floorHit ? goalDate : feasibleDate,
  };
}

// Estimate trend + projected goal date from logged weights (least squares).
// `logs` is [{ date, weight }] sorted ascending.
export function projectFromLogs(logs, goalWeight) {
  if (!logs || logs.length < 2) return null;
  const x0 = toDays(logs[0].date);
  let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const l of logs) {
    const x = toDays(l.date) - x0;
    const y = Number(l.weight);
    n++; sx += x; sy += y; sxx += x * x; sxy += x * y;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slopePerDay = (n * sxy - sx * sy) / denom; // kg/day
  const current = Number(logs[logs.length - 1].weight);

  let projectedDate = null;
  let daysToGoal = null;
  if (slopePerDay < -1e-6 && goalWeight != null && current > goalWeight) {
    daysToGoal = Math.ceil((goalWeight - current) / slopePerDay); // neg/neg -> positive
    projectedDate = fromDays(toDays(logs[logs.length - 1].date) + daysToGoal);
  }

  return {
    weeklyChange: round2(slopePerDay * 7),
    trend: slopePerDay < -1e-6 ? "losing" : slopePerDay > 1e-6 ? "gaining" : "flat",
    projectedDate,
    daysToGoal,
  };
}

function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }

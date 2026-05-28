import { GoogleGenerativeAI } from "@google/generative-ai";

// Generates health suggestions. Uses Google Gemini when GEMINI_API_KEY is set,
// otherwise falls back to a built-in rule-based generator so the panel always works.
export async function generateSuggestions(profile, habits) {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      return await geminiSuggestions(key, profile, habits);
    } catch (err) {
      console.error("Gemini failed, falling back to rules:", err?.message || err);
    }
  }
  return { source: "rules", ...ruleBasedSuggestions(profile, habits) };
}

async function geminiSuggestions(key, profile, habits) {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  });

  const lines = habits.map((h) => {
    if (h.type === "good") {
      return `- ${h.label} (good): target ${h.target} ${h.unit}/day, last 7d avg ${h.avg} ${h.unit}, hit target ${h.metDays}/${h.days} days.`;
    }
    return `- ${h.label} (bad/avoid): used ${h.total} ${h.unit} over 7 days, ${h.cleanDays}/${h.days} clean days.`;
  });

  const prompt = `You are a friendly health & habit coach for a habit-tracking app.
User profile: age ${profile.age ?? "?"}, sex ${profile.sex ?? "?"}, weight ${profile.bodyWeight ?? "?"}kg, height ${profile.height ?? "?"}cm.
Their last 7 days:
${lines.join("\n")}

Give concise, motivating, practical advice. Encourage maintaining the good habits and reducing/quitting the bad ones. Do NOT give medical diagnoses; for drugs/alcohol mention support is available.
Respond ONLY with strict JSON of this exact shape, no markdown:
{"overview": "<1-2 sentence summary>", "tips": ["<tip>", "<tip>", "<tip>", "<tip>"]}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = extractJson(text);
  if (parsed && Array.isArray(parsed.tips)) {
    return {
      source: "gemini",
      overview: String(parsed.overview || "").trim(),
      tips: parsed.tips.map((t) => String(t).trim()).filter(Boolean).slice(0, 8),
    };
  }
  // Couldn't parse JSON — fall back to splitting lines.
  const tips = text
    .split("\n")
    .map((l) => l.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((l) => l.length > 3)
    .slice(0, 6);
  return { source: "gemini", overview: "", tips };
}

// Suggest meal ideas that fit the user's remaining calorie budget for a meal.
// Uses Gemini when configured, else a built-in rule-based picker.
export async function generateMealIdeas({ remaining, meal, diet, profile }) {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      return await geminiMeals(key, { remaining, meal, diet, profile });
    } catch (err) {
      console.error("Gemini meals failed, falling back to rules:", err?.message || err);
    }
  }
  return { source: "rules", meals: ruleBasedMeals({ remaining, meal, diet }) };
}

async function geminiMeals(key, { remaining, meal, diet }) {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  });

  const budgetLine =
    remaining > 0
      ? `They have about ${remaining} kcal left in their daily budget`
      : `They are already over their daily budget by ${Math.abs(remaining)} kcal, so suggest very light options or water`;

  const prompt = `You are a friendly nutrition coach in a habit-tracking app.
${budgetLine}. Suggest 3 ${diet && diet !== "any" ? diet + " " : ""}${meal || "meal"} ideas that fit.
Keep them realistic and simple. This is general wellness guidance, not medical or dietary prescription.
Respond ONLY with strict JSON, no markdown, of this exact shape:
{"meals":[{"name":"<dish>","calories":<int>,"note":"<short why/how>"}]}`;

  const result = await model.generateContent(prompt);
  const parsed = extractJson(result.response.text());
  if (parsed && Array.isArray(parsed.meals)) {
    return {
      source: "gemini",
      meals: parsed.meals
        .map((m) => ({
          name: String(m.name || "").trim(),
          calories: Math.round(Number(m.calories) || 0),
          note: String(m.note || "").trim(),
        }))
        .filter((m) => m.name)
        .slice(0, 4),
    };
  }
  return { source: "gemini", meals: ruleBasedMeals({ remaining, meal, diet }) };
}

// Small curated meal library for the offline fallback.
const MEAL_LIBRARY = [
  { name: "Greek yogurt with berries", calories: 180, tags: ["vegetarian", "high-protein"], meals: ["breakfast", "snack"] },
  { name: "Oatmeal with banana & peanut butter", calories: 350, tags: ["vegetarian", "vegan"], meals: ["breakfast"] },
  { name: "Veggie omelette + toast", calories: 400, tags: ["vegetarian", "high-protein"], meals: ["breakfast"] },
  { name: "Grilled chicken salad", calories: 450, tags: ["non-veg", "high-protein"], meals: ["lunch", "dinner"] },
  { name: "Lentil soup with whole-grain bread", calories: 380, tags: ["vegetarian", "vegan", "high-protein"], meals: ["lunch", "dinner"] },
  { name: "Paneer & veggie stir-fry with rice", calories: 520, tags: ["vegetarian", "high-protein"], meals: ["lunch", "dinner"] },
  { name: "Tofu & vegetable bowl", calories: 430, tags: ["vegetarian", "vegan", "high-protein"], meals: ["lunch", "dinner"] },
  { name: "Baked salmon with greens", calories: 480, tags: ["non-veg", "high-protein"], meals: ["dinner"] },
  { name: "Chickpea & quinoa salad", calories: 420, tags: ["vegetarian", "vegan", "high-protein"], meals: ["lunch"] },
  { name: "Apple with almonds", calories: 200, tags: ["vegetarian", "vegan"], meals: ["snack"] },
  { name: "Cottage cheese with cucumber", calories: 150, tags: ["vegetarian", "high-protein"], meals: ["snack"] },
  { name: "Handful of mixed nuts", calories: 170, tags: ["vegetarian", "vegan"], meals: ["snack"] },
];

function ruleBasedMeals({ remaining, meal, diet }) {
  const cap = remaining > 0 ? remaining : 200; // over budget -> light options
  let pool = MEAL_LIBRARY.filter((m) => m.calories <= cap + 60);
  if (meal) pool = pool.filter((m) => m.meals.includes(meal));
  if (diet && diet !== "any") pool = pool.filter((m) => m.tags.includes(diet));

  // Relax filters if nothing matched, so we always return something useful.
  if (pool.length === 0) pool = MEAL_LIBRARY.filter((m) => m.calories <= cap + 60);
  if (pool.length === 0) pool = [...MEAL_LIBRARY].sort((a, b) => a.calories - b.calories);

  return pool
    .sort((a, b) => b.calories - a.calories) // fill the budget sensibly
    .slice(0, 3)
    .map((m) => ({ name: m.name, calories: m.calories, note: m.tags.join(", ") }));
}

// Analyze an uploaded medical report (PDF/image) with Gemini's multimodal
// input and return a structured wellness plan. SAFETY: the prompt instructs
// the model NOT to prescribe new drugs or doses; medications are EXTRACTED
// from what the report already lists (so we can set reminders), and everything
// else is lifestyle guidance with a clear disclaimer.
export async function analyzeMedicalReport({ fileBuffer, mimeType, profile = {} }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return {
      error: "AI analysis needs a Gemini API key configured on the server.",
    };
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  });

  const profileLine =
    `Patient profile (optional context): age ${profile.age ?? "?"}, sex ${profile.sex ?? "?"}, ` +
    `weight ${profile.bodyWeight ?? "?"}kg, height ${profile.height ?? "?"}cm.`;

  const prompt = `You are an assistant that reads a medical report and produces a friendly,
practical wellness plan for a habit-tracking app. This is EDUCATIONAL, not medical
advice. Strict rules:
- Do NOT prescribe new medications or doses.
- Only list medications that are explicitly mentioned in the report, copying their
  name/dosage/timing verbatim where stated; if no times are given, suggest reasonable
  defaults and clearly mark them "discuss with doctor".
- Recommendations for water/calories/sleep/food are lifestyle guidance, not treatment.
- Be concise and concrete.

${profileLine}

Respond ONLY with strict JSON of this exact shape, no markdown:
{
  "summary": "<1-2 sentences>",
  "conditions": ["<condition>", "..."],
  "redFlags": ["<notable finding to discuss with doctor>", "..."],
  "water":     { "litersPerDay": <number>, "rationale": "<one line>" },
  "calories":  { "kcalPerDay": <integer>,  "rationale": "<one line>" },
  "sleep":     { "hoursPerDay": <number>,  "rationale": "<one line>" },
  "food": {
    "eat":   ["<food/category>", "..."],
    "avoid": ["<food/category>", "..."]
  },
  "medications": [
    {
      "name": "<as listed in report>",
      "dosage": "<as listed, e.g. '500 mg'>",
      "times": ["HH:MM", "..."],
      "note": "<short, e.g. 'with meals' or 'discuss with doctor'>"
    }
  ],
  "lifestyle": ["<tip>", "..."],
  "disclaimer": "Educational only — confirm everything with your doctor."
}`;

  const fileData = {
    inlineData: { mimeType, data: fileBuffer.toString("base64") },
  };
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }, fileData] }],
  });
  const text = result.response.text();
  const parsed = extractJson(text);
  if (!parsed) {
    return { error: "Could not parse the AI's response. Try a clearer report." };
  }

  // Sanity-clamp the numbers so a hallucinated value can't override hard limits.
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || 0));
  if (parsed.water?.litersPerDay) parsed.water.litersPerDay = Math.round(clamp(parsed.water.litersPerDay, 1, 5) * 4) / 4;
  if (parsed.calories?.kcalPerDay) parsed.calories.kcalPerDay = Math.round(clamp(parsed.calories.kcalPerDay, 1200, 3500));
  if (parsed.sleep?.hoursPerDay) parsed.sleep.hoursPerDay = Math.round(clamp(parsed.sleep.hoursPerDay, 6, 10) * 2) / 2;

  // Always overwrite with a strong disclaimer.
  parsed.disclaimer =
    "Educational only — this is generated by an AI from your report. Always confirm medications, doses and any plan changes with your doctor.";
  parsed.analyzedAt = new Date().toISOString();
  return { plan: parsed };
}

function extractJson(text) {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function ruleBasedSuggestions(profile, habits) {
  const tips = [];
  const good = habits.filter((h) => h.type === "good");
  const bad = habits.filter((h) => h.type === "bad");

  for (const h of good) {
    if (h.metDays < Math.ceil(h.days / 2)) {
      tips.push(
        `You hit your ${h.label.toLowerCase()} target only ${h.metDays}/${h.days} days — try a fixed daily slot to reach ${h.target} ${h.unit}.`
      );
    } else if (h.metDays >= h.days) {
      tips.push(`Great consistency on ${h.label.toLowerCase()} — you hit your target every day. Keep it up! 🔥`);
    }
  }

  for (const h of bad) {
    if (h.total > 0) {
      tips.push(
        `You logged ${h.label.toLowerCase()} ${h.total} ${h.unit} this week. Set a smaller cap next week and replace the urge with a walk or water.`
      );
      if (h.key === "drugs" || h.key === "alcohol") {
        tips.push(`For ${h.label.toLowerCase()}, free confidential support is available — you don't have to do it alone.`);
      }
    } else {
      tips.push(`Zero ${h.label.toLowerCase()} this week — fantastic. Protect that streak. 💪`);
    }
  }

  if (tips.length === 0) {
    tips.push("Log a few days of data and you'll get personalized tips here.");
  }

  const metAll = good.filter((h) => h.metDays >= h.days).length;
  const overview =
    good.length > 0
      ? `You're hitting all targets on ${metAll}/${good.length} good habits this week.`
      : "Here's how to keep your habits on track.";

  return { overview, tips: tips.slice(0, 8) };
}

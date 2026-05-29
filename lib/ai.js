import { GoogleGenerativeAI } from "@google/generative-ai";

// Retry Gemini requests on transient overload (503) / rate-limit (429).
// Spikes on gemini-2.5-flash are common and usually clear in a few seconds.
async function generateWithRetry(model, args, max = 3) {
  for (let attempt = 0; attempt < max; attempt++) {
    try {
      return await model.generateContent(args);
    } catch (err) {
      const msg = String(err?.message || "");
      const code = (msg.match(/\[(\d+)\s/) || [])[1];
      const transient =
        code === "503" || code === "429" || code === "500" ||
        /unavailable|overloaded|high demand|try again/i.test(msg);
      if (!transient || attempt === max - 1) throw err;
      const delay = 1500 * Math.pow(2, attempt); // 1.5s, 3s, 6s
      console.log(`Gemini ${code || "transient"} — retrying in ${delay}ms (attempt ${attempt + 2}/${max})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

function isOverloadedError(err) {
  const msg = String(err?.message || err || "");
  return /503|429|unavailable|overloaded|high demand|try again/i.test(msg);
}

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

  const result = await generateWithRetry(model, prompt);
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
export async function generateMealIdeas({ remaining, meal, diet, cuisine, date, profile }) {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      return await geminiMeals(key, { remaining, meal, diet, cuisine, date, profile });
    } catch (err) {
      console.error("Gemini meals failed, falling back to rules:", err?.message || err);
    }
  }
  return { source: "rules", meals: ruleBasedMeals({ remaining, meal, diet, cuisine, date }) };
}

async function geminiMeals(key, { remaining, meal, diet, cuisine, date }) {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  });

  const budgetLine =
    remaining > 0
      ? `They have about ${remaining} kcal left in their daily budget`
      : `They are already over their daily budget by ${Math.abs(remaining)} kcal, so suggest very light options or water`;

  const cuisineLine =
    cuisine && cuisine !== "any"
      ? `Suggest authentic ${cuisine} dishes (use dish names a ${cuisine} home cook would recognize).`
      : "";
  const regionMix =
    cuisine === "indian"
      ? "Include a MIX of North Indian AND South Indian dishes across the 3 ideas (for example: one North Indian, one South Indian, and one of your choice). Use specific dish names."
      : "";
  const varyLine = date
    ? `Today is ${date}. Vary your picks day-to-day so a user opening the app daily sees fresh dishes.`
    : "Vary your picks across calls.";

  const prompt = `You are a friendly nutrition coach in a habit-tracking app.
${budgetLine}. Suggest 3 ${diet && diet !== "any" ? diet + " " : ""}${meal || "meal"} ideas that fit.
${cuisineLine}
${regionMix}
${varyLine}
Keep them realistic, simple, and home-cookable. This is general wellness guidance, not medical or dietary prescription.
Respond ONLY with strict JSON, no markdown, of this exact shape:
{"meals":[{"name":"<dish>","calories":<int>,"note":"<short why/how>"}]}`;

  const result = await generateWithRetry(model, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.95 },
  });
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
  return { source: "gemini", meals: ruleBasedMeals({ remaining, meal, diet, cuisine, date }) };
}

// Small curated meal library for the offline fallback. Each entry is tagged
// with cuisine so the picker can match the user's cuisine preference.
const MEAL_LIBRARY = [
  // -------- Indian (region: north | south | any) --------
  { name: "Moong dal khichdi", calories: 350, tags: ["vegetarian", "vegan", "high-protein"], meals: ["lunch", "dinner"], cuisine: "indian", region: "any" },
  { name: "Vegetable poha", calories: 300, tags: ["vegetarian", "vegan"], meals: ["breakfast"], cuisine: "indian", region: "any" },
  { name: "Sprouts moong chaat", calories: 250, tags: ["vegetarian", "vegan", "high-protein"], meals: ["snack", "breakfast"], cuisine: "indian", region: "any" },
  { name: "Roasted chana", calories: 180, tags: ["vegetarian", "vegan", "high-protein"], meals: ["snack"], cuisine: "indian", region: "any" },
  { name: "Egg curry + 2 roti", calories: 500, tags: ["non-veg", "high-protein"], meals: ["lunch", "dinner"], cuisine: "indian", region: "any" },
  { name: "Chicken biryani (small bowl)", calories: 550, tags: ["non-veg", "high-protein"], meals: ["lunch", "dinner"], cuisine: "indian", region: "any" },
  { name: "2 boiled eggs + 1 roti", calories: 300, tags: ["non-veg", "high-protein"], meals: ["breakfast", "snack"], cuisine: "indian", region: "any" },

  // North Indian
  { name: "Dal tadka + 2 chapati", calories: 500, tags: ["vegetarian", "high-protein"], meals: ["lunch", "dinner"], cuisine: "indian", region: "north" },
  { name: "Rajma + brown rice", calories: 550, tags: ["vegetarian", "vegan", "high-protein"], meals: ["lunch", "dinner"], cuisine: "indian", region: "north" },
  { name: "Chana masala + 2 roti", calories: 520, tags: ["vegetarian", "vegan", "high-protein"], meals: ["lunch", "dinner"], cuisine: "indian", region: "north" },
  { name: "Palak paneer + 2 roti", calories: 540, tags: ["vegetarian", "high-protein"], meals: ["lunch", "dinner"], cuisine: "indian", region: "north" },
  { name: "Aloo gobi + 2 roti", calories: 480, tags: ["vegetarian", "vegan"], meals: ["lunch", "dinner"], cuisine: "indian", region: "north" },
  { name: "Paneer bhurji + 1 roti", calories: 380, tags: ["vegetarian", "high-protein"], meals: ["breakfast", "lunch"], cuisine: "indian", region: "north" },
  { name: "Aloo paratha + curd", calories: 420, tags: ["vegetarian"], meals: ["breakfast"], cuisine: "indian", region: "north" },
  { name: "Tandoori chicken + cucumber salad", calories: 430, tags: ["non-veg", "high-protein"], meals: ["lunch", "dinner"], cuisine: "indian", region: "north" },

  // South Indian
  { name: "3 idli + sambar + coconut chutney", calories: 350, tags: ["vegetarian", "vegan", "high-protein"], meals: ["breakfast"], cuisine: "indian", region: "south" },
  { name: "Masala dosa", calories: 450, tags: ["vegetarian"], meals: ["breakfast", "lunch"], cuisine: "indian", region: "south" },
  { name: "Vegetable upma", calories: 320, tags: ["vegetarian", "vegan"], meals: ["breakfast"], cuisine: "indian", region: "south" },
  { name: "Ven pongal", calories: 360, tags: ["vegetarian"], meals: ["breakfast", "lunch"], cuisine: "indian", region: "south" },
  { name: "Curd rice", calories: 320, tags: ["vegetarian"], meals: ["lunch", "dinner"], cuisine: "indian", region: "south" },
  { name: "Lemon rice", calories: 380, tags: ["vegetarian", "vegan"], meals: ["lunch"], cuisine: "indian", region: "south" },
  { name: "Rasam + rice", calories: 350, tags: ["vegetarian", "vegan"], meals: ["lunch", "dinner"], cuisine: "indian", region: "south" },
  { name: "Vada + sambar", calories: 340, tags: ["vegetarian", "vegan"], meals: ["breakfast", "snack"], cuisine: "indian", region: "south" },
  { name: "Fish curry + rice (Kerala style)", calories: 520, tags: ["non-veg", "high-protein"], meals: ["lunch", "dinner"], cuisine: "indian", region: "south" },
  { name: "Chettinad chicken + 2 roti", calories: 520, tags: ["non-veg", "high-protein"], meals: ["lunch", "dinner"], cuisine: "indian", region: "south" },

  // -------- Western / general --------
  { name: "Greek yogurt with berries", calories: 180, tags: ["vegetarian", "high-protein"], meals: ["breakfast", "snack"], cuisine: "western" },
  { name: "Oatmeal with banana & peanut butter", calories: 350, tags: ["vegetarian", "vegan"], meals: ["breakfast"], cuisine: "western" },
  { name: "Veggie omelette + toast", calories: 400, tags: ["vegetarian", "high-protein"], meals: ["breakfast"], cuisine: "western" },
  { name: "Grilled chicken salad", calories: 450, tags: ["non-veg", "high-protein"], meals: ["lunch", "dinner"], cuisine: "western" },
  { name: "Lentil soup with whole-grain bread", calories: 380, tags: ["vegetarian", "vegan", "high-protein"], meals: ["lunch", "dinner"], cuisine: "western" },
  { name: "Tofu & vegetable bowl", calories: 430, tags: ["vegetarian", "vegan", "high-protein"], meals: ["lunch", "dinner"], cuisine: "asian" },
  { name: "Baked salmon with greens", calories: 480, tags: ["non-veg", "high-protein"], meals: ["dinner"], cuisine: "western" },
  { name: "Chickpea & quinoa salad", calories: 420, tags: ["vegetarian", "vegan", "high-protein"], meals: ["lunch"], cuisine: "mediterranean" },
  { name: "Apple with almonds", calories: 200, tags: ["vegetarian", "vegan"], meals: ["snack"], cuisine: "western" },
  { name: "Cottage cheese with cucumber", calories: 150, tags: ["vegetarian", "high-protein"], meals: ["snack"], cuisine: "western" },
  { name: "Handful of mixed nuts", calories: 170, tags: ["vegetarian", "vegan"], meals: ["snack"], cuisine: "western" },
];

// Date-seeded RNG so picks change daily but stay stable within a day.
function rngFromString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ruleBasedMeals({ remaining, meal, diet, cuisine, date }) {
  const rng = rngFromString(`${date || ""}|${cuisine || ""}|${diet || ""}|${meal || ""}`);
  const cap = remaining > 0 ? remaining : 200; // over budget -> light options
  let pool = MEAL_LIBRARY.filter((m) => m.calories <= cap + 60);
  if (meal) pool = pool.filter((m) => m.meals.includes(meal));
  if (diet && diet !== "any") pool = pool.filter((m) => m.tags.includes(diet));
  if (cuisine && cuisine !== "any") pool = pool.filter((m) => m.cuisine === cuisine);

  // Relax filters progressively so we always return something useful.
  if (pool.length === 0 && cuisine && cuisine !== "any") {
    pool = MEAL_LIBRARY.filter(
      (m) =>
        m.calories <= cap + 60 &&
        (!meal || m.meals.includes(meal)) &&
        (!diet || diet === "any" || m.tags.includes(diet))
    );
  }
  if (pool.length === 0) pool = MEAL_LIBRARY.filter((m) => m.calories <= cap + 60);
  if (pool.length === 0) pool = [...MEAL_LIBRARY].sort((a, b) => a.calories - b.calories);

  let picks;
  if (cuisine === "indian") {
    // Region-balanced: try 1 North + 1 South + 1 free (filling from any/leftovers).
    const groups = { north: [], south: [], any: [] };
    for (const m of pool) (groups[m.region || "any"] ||= []).push(m);
    const north = shuffle(groups.north, rng);
    const south = shuffle(groups.south, rng);
    const anyG = shuffle(groups.any, rng);
    picks = [];
    if (north[0]) picks.push(north.shift());
    if (south[0]) picks.push(south.shift());
    const rest = shuffle([...anyG, ...north, ...south], rng);
    for (const m of rest) {
      if (picks.length >= 3) break;
      if (!picks.includes(m)) picks.push(m);
    }
  } else {
    picks = shuffle(pool, rng).slice(0, 3);
  }

  return picks.map((m) => ({
    name: m.name,
    calories: m.calories,
    note: [m.cuisine, m.region, ...m.tags].filter(Boolean).join(" · "),
  }));
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
  "reportDate": "<YYYY-MM-DD if a date is on the report, else null>",
  "labs": {
    "hba1c":           <number or null>,    "// percent",
    "fastingGlucose":  <number or null>,    "// mg/dL",
    "ldl":             <number or null>,    "// mg/dL",
    "hdl":             <number or null>,    "// mg/dL",
    "triglycerides":   <number or null>,    "// mg/dL",
    "totalCholesterol":<number or null>,    "// mg/dL",
    "systolic":        <number or null>,    "// mmHg",
    "diastolic":       <number or null>,    "// mmHg",
    "creatinine":      <number or null>     "// mg/dL"
  },
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
}
Only fill a labs.* number if it is clearly written in the report; otherwise leave it null. Do NOT invent lab values.`;

  const fileData = {
    inlineData: { mimeType, data: fileBuffer.toString("base64") },
  };
  let result;
  try {
    result = await generateWithRetry(model, {
      contents: [{ role: "user", parts: [{ text: prompt }, fileData] }],
    });
  } catch (err) {
    if (isOverloadedError(err)) {
      return { error: "Gemini is busy right now (high demand on the model). Please try again in a few seconds." };
    }
    return { error: "Could not reach the AI service. Try again in a moment." };
  }
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

  // Normalize labs to clean numbers (or null) — never invent values.
  if (parsed.labs && typeof parsed.labs === "object") {
    const out = {};
    for (const [k, v] of Object.entries(parsed.labs)) {
      const n = Number(v);
      out[k] = Number.isFinite(n) && n > 0 ? n : null;
    }
    parsed.labs = out;
  }
  if (parsed.reportDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(parsed.reportDate))) {
    parsed.reportDate = null;
  }

  // Always overwrite with a strong disclaimer.
  parsed.disclaimer =
    "Educational only — this is generated by an AI from your report. Always confirm medications, doses and any plan changes with your doctor.";
  parsed.analyzedAt = new Date().toISOString();
  return { plan: parsed };
}

// Estimate the calories of a meal from a single photo. Returns { meal: {...} }
// or { error }. Conservative — Gemini gives a confidence the user can see.
export async function estimateMealFromPhoto({ fileBuffer, mimeType }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { error: "AI analysis needs a Gemini API key configured on the server." };

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  });
  const prompt = `You see a photo of food. Identify what's on the plate and estimate the
total calories of the visible portion. Be concise; if you can't tell, set confidence to "low".
This is general guidance, not a precise nutritional analysis.
Respond ONLY with strict JSON, no markdown:
{"name":"<short dish name>","calories":<integer kcal>,"confidence":"low"|"medium"|"high","note":"<one line>"}`;

  let result;
  try {
    result = await generateWithRetry(model, {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: fileBuffer.toString("base64") } },
          ],
        },
      ],
    });
  } catch (err) {
    if (isOverloadedError(err)) {
      return { error: "Gemini is busy right now — try the photo again in a few seconds." };
    }
    return { error: "Could not reach the AI service. Try again in a moment." };
  }
  const parsed = extractJson(result.response.text());
  if (!parsed?.name) {
    return { error: "Couldn't read that photo. Try a clearer shot of the plate." };
  }
  const calories = Math.min(2500, Math.max(0, Math.round(Number(parsed.calories) || 0)));
  return {
    meal: {
      name: String(parsed.name).trim().slice(0, 80),
      calories,
      confidence: ["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "medium",
      note: String(parsed.note || "").trim().slice(0, 160),
    },
  };
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

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
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
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

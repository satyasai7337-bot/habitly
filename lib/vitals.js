// Pure helpers for the vitals feature: target zones, colors, validation.
// Zones reflect commonly-cited targets (ADA for glucose, AHA-ish for BP) but
// are NOT medical advice — always confirm targets with your doctor.

export const TYPES = ["glucose", "bp", "mood"];
export const GLUCOSE_CONTEXTS = ["fasting", "post-meal", "random", "bedtime"];

// Glucose zone in mg/dL. `context` lets us be stricter for fasting readings.
export function glucoseZone(value, context = "random") {
  if (value == null || !Number.isFinite(value)) return null;
  if (context === "fasting") {
    if (value < 70) return "low";
    if (value <= 130) return "in-range";
    if (value <= 180) return "elevated";
    return "high";
  }
  // post-meal / random / bedtime
  if (value < 70) return "low";
  if (value <= 180) return "in-range";
  if (value <= 250) return "elevated";
  return "high";
}

// Blood-pressure category from systolic/diastolic in mmHg.
export function bpZone(systolic, diastolic) {
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;
  if (systolic >= 180 || diastolic >= 120) return "crisis";
  if (systolic >= 140 || diastolic >= 90) return "stage2";
  if (systolic >= 130 || diastolic >= 80) return "stage1";
  if (systolic >= 120) return "elevated";
  return "normal";
}

// Mood: 1 (😞) … 5 (😄). Returns a zone for color, not a category.
export function moodZone(value) {
  if (!value) return null;
  if (value <= 2) return "low";
  if (value >= 4) return "in-range";
  return "elevated";
}

export const MOOD_EMOJI = { 1: "😞", 2: "😕", 3: "😐", 4: "🙂", 5: "😄" };

// Single color palette used by chips, dots and chart strokes.
export function zoneColor(zone) {
  return (
    {
      low: "#e0697a",
      "in-range": "#3f9e6b",
      normal: "#3f9e6b",
      elevated: "#e2a93f",
      stage1: "#e2a93f",
      stage2: "#e0697a",
      crisis: "#c2554d",
      high: "#e0697a",
    }[zone] || "#8b5cf6"
  );
}

export function zoneLabel(zone) {
  return (
    {
      low: "Low",
      "in-range": "In range",
      normal: "Normal",
      elevated: "Elevated",
      stage1: "Stage 1",
      stage2: "Stage 2",
      crisis: "Crisis",
      high: "High",
    }[zone] || ""
  );
}

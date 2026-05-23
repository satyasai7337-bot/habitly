// Central catalog of every habit the app supports.
// "good" habits help health (they get targets + email reminders).
// "bad" habits damage health (tracking + reports only, NO reminders).
//
// At signup we snapshot the chosen habits into the user document so the
// dashboard and the email worker can read everything without this file.

export const HABIT_CATALOG = [
  // ---------- GOOD HABITS ----------
  {
    key: "water",
    label: "Water",
    type: "good",
    emoji: "💧",
    unit: "L",
    target: 6,
    targetDirection: "atleast", // reach AT LEAST this amount
    step: 0.25,
    blurb: "Stay hydrated through the day.",
    consequence:
      "Skipping water leads to dehydration, headaches, fatigue and poor focus.",
    reminderTimes: ["09:00", "12:00", "15:00", "18:00", "21:00"],
  },
  {
    key: "food",
    label: "Meals",
    type: "good",
    emoji: "🍽️",
    unit: "meals",
    target: 3,
    targetDirection: "atleast",
    step: 1,
    blurb: "Eat balanced meals.",
    consequence:
      "Irregular meals cause low energy, poor nutrition and mood swings.",
    reminderTimes: ["08:00", "13:00", "20:00"],
  },
  {
    key: "gym",
    label: "Gym",
    type: "good",
    emoji: "🏋️",
    unit: "min",
    target: 45,
    targetDirection: "atleast",
    step: 5,
    blurb: "Train your body.",
    consequence:
      "Skipping workouts means lost strength, lower fitness and weight gain.",
    reminderTimes: ["18:00"],
  },
  {
    key: "sleep",
    label: "Sleep",
    type: "good",
    emoji: "😴",
    unit: "hrs",
    target: 8,
    targetDirection: "atleast",
    step: 0.5,
    blurb: "Recover with quality sleep.",
    consequence:
      "Too little sleep causes fatigue, poor focus and a weaker immune system.",
    reminderTimes: ["22:30"],
  },
  {
    key: "walking",
    label: "Walking",
    type: "good",
    emoji: "🚶",
    unit: "steps",
    target: 8000,
    targetDirection: "atleast",
    step: 500,
    blurb: "Keep moving every day.",
    consequence:
      "A sedentary day raises risk of heart issues and stiff, weak muscles.",
    reminderTimes: ["17:00"],
  },
  {
    key: "study",
    label: "Study",
    type: "good",
    emoji: "📚",
    unit: "hrs",
    target: 3,
    targetDirection: "atleast",
    step: 0.5,
    blurb: "Invest in learning.",
    consequence:
      "Skipping study time means falling behind on your goals and knowledge.",
    reminderTimes: ["19:00"],
  },
  {
    key: "work",
    label: "Work",
    type: "good",
    emoji: "💼",
    unit: "hrs",
    target: 8,
    targetDirection: "atleast",
    step: 0.5,
    blurb: "Stay productive.",
    consequence:
      "Losing focus at work means missed deadlines and lower productivity.",
    reminderTimes: ["09:30"],
  },

  // ---------- BAD HABITS ----------
  {
    key: "alcohol",
    label: "Alcohol",
    type: "bad",
    emoji: "🍺",
    unit: "drinks",
    target: 0,
    targetDirection: "avoid", // aim for 0 / as low as possible
    step: 1,
    blurb: "Track and cut down.",
    consequence:
      "Regular drinking harms your liver, sleep and mood, and can lead to addiction.",
    reminderTimes: [],
  },
  {
    key: "smoking",
    label: "Smoking",
    type: "bad",
    emoji: "🚬",
    unit: "cigarettes",
    target: 0,
    targetDirection: "avoid",
    step: 1,
    blurb: "Track and quit.",
    consequence:
      "Smoking damages your lungs and heart and sharply raises cancer risk.",
    reminderTimes: [],
  },
  {
    key: "vaping",
    label: "Vaping",
    type: "bad",
    emoji: "💨",
    unit: "sessions",
    target: 0,
    targetDirection: "avoid",
    step: 1,
    blurb: "Track and reduce.",
    consequence:
      "Vaping causes lung irritation and a strong nicotine addiction.",
    reminderTimes: [],
  },
  {
    key: "drugs",
    label: "Drugs",
    type: "bad",
    emoji: "⚠️",
    unit: "times",
    target: 0,
    targetDirection: "avoid",
    step: 1,
    blurb: "Track and stop.",
    consequence:
      "Drug use leads to addiction, organ damage and serious mental-health harm.",
    reminderTimes: [],
  },
];

export const GOOD_HABITS = HABIT_CATALOG.filter((h) => h.type === "good");
export const BAD_HABITS = HABIT_CATALOG.filter((h) => h.type === "bad");

const BY_KEY = Object.fromEntries(HABIT_CATALOG.map((h) => [h.key, h]));

export function getHabit(key) {
  return BY_KEY[key] || null;
}

export function isGood(key) {
  return BY_KEY[key]?.type === "good";
}

// Build the snapshot stored on the user document at signup.
export function snapshotHabit(key) {
  const h = getHabit(key);
  if (!h) return null;
  return {
    key: h.key,
    label: h.label,
    type: h.type,
    emoji: h.emoji,
    unit: h.unit,
    target: h.target,
    targetDirection: h.targetDirection,
    step: h.step,
    consequence: h.consequence,
    reminderTimes: h.type === "good" ? [...h.reminderTimes] : [],
  };
}

// Personalized habit-target models.
//
// There is not yet a real labeled dataset, so we *generate* a synthetic
// training set from established health heuristics (Mifflin-St-Jeor-style
// scaling for hydration, age-based sleep needs, BMI-driven activity), add
// noise, then fit one linear regression per physiological habit. The fitted
// models turn a user's profile (age, sex, weight, height) into recommended
// daily targets — replacing the fixed catalog defaults.
//
// NOTE: these are wellness heuristics for a habit tracker, not medical advice.

import { LinearRegression } from "@/lib/ml/linearRegression";
import { getHabit } from "@/lib/habits";

// ----------------------------------------------------------------------------
// Feature engineering
// ----------------------------------------------------------------------------
// Profile -> numeric feature vector [age, sexMale, weight(kg), height(cm), bmi]
export const FEATURE_NAMES = ["age", "sexMale", "weight", "height", "bmi"];
const FEATURE_INDEX = Object.fromEntries(FEATURE_NAMES.map((n, i) => [n, i]));

// Pick a subset of the full feature vector by name (per-habit feature selection).
function project(fullVec, names) {
  return names.map((n) => fullVec[FEATURE_INDEX[n]]);
}

function bmiOf(weight, height) {
  const m = height / 100;
  if (!m) return 22;
  return weight / (m * m);
}

export function featurize(profile) {
  const age = num(profile.age, 30);
  const sexMale = String(profile.sex || "").toLowerCase().startsWith("m") ? 1 : 0;
  const weight = num(profile.bodyWeight ?? profile.weight, 70);
  const height = num(profile.height, sexMale ? 176 : 163);
  return [age, sexMale, weight, height, bmiOf(weight, height)];
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ----------------------------------------------------------------------------
// Ground-truth heuristics for the synthetic data (per modeled habit).
//   truth:    takes the FULL feature vector, returns the "ideal" target pre-noise
//   features: the subset each regression is actually trained on — exactly the
//             inputs its formula depends on. Feeding only the relevant features
//             avoids the weight/height/bmi collinearity, so the learned weights
//             track the formula and the model can't fit noise via stray inputs.
//   noise:    individual variation around the heuristic (sets the R² ceiling).
// ----------------------------------------------------------------------------
const HABIT_MODELS = {
  // Hydration ≈ 33 ml per kg, men a touch higher, gentle decline with age.
  water: {
    features: ["weight", "sexMale", "age"],
    truth: ([age, sexMale, weight]) => 0.033 * weight + 0.3 * sexMale - 0.004 * age + 0.5,
    noise: 0.12,
    min: 1.5,
    max: 5,
  },
  // Sleep need eases with age; women average slightly more.
  sleep: {
    features: ["age", "sexMale"],
    truth: ([age, sexMale]) => 8.6 - 0.018 * age + 0.2 * (1 - sexMale),
    noise: 0.15,
    min: 6,
    max: 9.5,
  },
  // Activity scales with BMI (more recommended when higher), tapers with age.
  gym: {
    features: ["bmi", "age", "sexMale"],
    truth: ([age, sexMale, , , bmi]) => 30 + 1.4 * (bmi - 22) - 0.18 * (age - 30) + 4 * sexMale,
    noise: 3,
    min: 15,
    max: 75,
  },
  // Daily steps: ~9.5k baseline, more with higher BMI, fewer with age.
  walking: {
    features: ["bmi", "age"],
    truth: ([age, , , , bmi]) => 9500 + 90 * (bmi - 22) - 45 * (age - 30),
    noise: 350,
    min: 5000,
    max: 12000,
  },
};

export const MODELED_HABITS = Object.keys(HABIT_MODELS);

// ----------------------------------------------------------------------------
// Seeded RNG (mulberry32) so training data — and therefore the fitted models —
// are reproducible across processes.
// ----------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Standard-normal sample via Box-Muller, driven by a uniform RNG.
function gaussian(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Build a synthetic population of plausible profiles (feature vectors).
function syntheticProfiles(rng, n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const age = 16 + rng() * 54; // 16–70
    const sexMale = rng() < 0.5 ? 1 : 0;
    const height = sexMale ? 176 + gaussian(rng) * 7 : 163 + gaussian(rng) * 6;
    const targetBmi = 18 + rng() * 14; // 18–32
    const m = height / 100;
    const weight = targetBmi * m * m + gaussian(rng) * 3;
    rows.push([age, sexMale, weight, height, bmiOf(weight, height)]);
  }
  return rows;
}

// ----------------------------------------------------------------------------
// Training (memoized: trains once per process).
// ----------------------------------------------------------------------------
const TRAIN_SAMPLES = 4000;
const SEED = 1234;
let _cache = null;

export function trainTargetModels({ samples = TRAIN_SAMPLES, seed = SEED } = {}) {
  if (_cache) return _cache;
  const rng = mulberry32(seed);
  const X = syntheticProfiles(rng, samples);

  const models = {};
  for (const key of MODELED_HABITS) {
    const spec = HABIT_MODELS[key];
    const Xs = X.map((f) => project(f, spec.features)); // only this habit's features
    const y = X.map((f) => spec.truth(f) + gaussian(rng) * spec.noise);
    models[key] = { reg: new LinearRegression().fit(Xs, y), features: spec.features };
  }
  _cache = { models, samples, seed };
  return _cache;
}

// ----------------------------------------------------------------------------
// Prediction
// ----------------------------------------------------------------------------
// Round to the habit's UI step and clamp into a sane range.
function snap(value, key) {
  const spec = HABIT_MODELS[key];
  const step = getHabit(key)?.step || 1;
  const clamped = Math.min(spec.max, Math.max(spec.min, value));
  return Math.round(clamped / step) * step;
}

// Run a fitted model on a profile (projecting to the habit's features first).
function predictRaw(model, profile) {
  return model.reg.predict(project(featurize(profile), model.features));
}

// Returns the recommended target for one modeled habit, or null if unmodeled.
export function predictTarget(profile, key) {
  if (!HABIT_MODELS[key]) return null;
  const { models } = trainTargetModels();
  return snap(predictRaw(models[key], profile), key);
}

// Recommend targets for every habit on the user, falling back to the existing
// catalog/snapshot target for habits we don't model (study, work, bad habits).
// `habits` is the user's habit snapshot array (each has key, label, unit, target...).
export function recommendTargets(profile, habits) {
  const { models } = trainTargetModels();
  return habits.map((h) => {
    const modeled = !!HABIT_MODELS[h.key];
    const recommended = modeled ? snap(predictRaw(models[h.key], profile), h.key) : h.target;
    return {
      key: h.key,
      label: h.label,
      unit: h.unit,
      currentTarget: h.target,
      recommendedTarget: recommended,
      personalized: modeled,
    };
  });
}

// Diagnostics for the training script: per-habit R² and original-space weights.
export function modelReport() {
  const { models, samples, seed } = trainTargetModels();
  const report = {};
  for (const key of MODELED_HABITS) {
    const m = models[key];
    const { intercept, weights } = m.reg.rawCoefficients();
    report[key] = {
      r2: m.reg.r2,
      intercept,
      weights: Object.fromEntries(m.features.map((name, i) => [name, weights[i]])),
    };
  }
  return { samples, seed, habits: report };
}

// Trains the per-habit linear-regression target models and prints, for each
// habit, the training R² and the learned weights (in original feature units),
// followed by sample recommendations for a few example profiles.
//
//   npm run train:targets
import { register } from "node:module";

register("./esm-alias-loader.mjs", import.meta.url);

const { modelReport, recommendTargets } = await import("../lib/ml/targetModel.js");

const report = modelReport();

console.log(`\nTrained on ${report.samples} synthetic profiles (seed ${report.seed}).`);
console.log(`Each habit uses only the features its formula depends on.\n`);

for (const [habit, m] of Object.entries(report.habits)) {
  console.log(`• ${habit.padEnd(8)} R² = ${m.r2.toFixed(3)}`);
  const terms = Object.entries(m.weights)
    .map(([name, w]) => `${w >= 0 ? "+" : "−"}${Math.abs(w).toPrecision(3)}·${name}`)
    .join(" ");
  console.log(`    target ≈ ${m.intercept.toPrecision(3)} ${terms}\n`);
}

// Example profiles -> recommended targets.
const sampleHabits = [
  { key: "water", label: "Water", unit: "L", target: 6 },
  { key: "sleep", label: "Sleep", unit: "hrs", target: 8 },
  { key: "gym", label: "Gym", unit: "min", target: 45 },
  { key: "walking", label: "Walking", unit: "steps", target: 8000 },
];

const examples = [
  { name: "F, 22, 58kg, 165cm", profile: { age: 22, sex: "female", bodyWeight: 58, height: 165 } },
  { name: "M, 35, 82kg, 178cm", profile: { age: 35, sex: "male", bodyWeight: 82, height: 178 } },
  { name: "M, 60, 95kg, 172cm", profile: { age: 60, sex: "male", bodyWeight: 95, height: 172 } },
];

console.log("Sample recommendations (current default → personalized):\n");
for (const ex of examples) {
  console.log(`  ${ex.name}`);
  for (const r of recommendTargets(ex.profile, sampleHabits)) {
    console.log(`    ${r.label.padEnd(8)} ${String(r.currentTarget).padStart(6)} → ${r.recommendedTarget} ${r.unit}`);
  }
  console.log("");
}

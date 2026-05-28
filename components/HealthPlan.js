"use client";

import { useEffect, useRef, useState } from "react";

export default function HealthPlan() {
  const [plan, setPlan] = useState(undefined); // undefined=loading, null=none, object=plan
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    fetch("/api/ai/health-plan", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPlan(d.plan || null))
      .catch(() => setPlan(null));
  }, []);

  async function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg("Analyzing your report — this can take a few seconds…");
    try {
      const fd = new FormData();
      fd.append("report", file);
      const res = await fetch("/api/ai/health-plan", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok) {
        setPlan(d.plan);
        setMsg("");
      } else {
        setMsg(d.error || "Could not analyze.");
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function clearPlan() {
    if (!window.confirm("Remove this plan?")) return;
    await fetch("/api/ai/health-plan", { method: "DELETE" });
    setPlan(null);
    setMsg("");
  }

  async function applyHabit(habitKey, target, label) {
    setBusy(true);
    try {
      const res = await fetch("/api/habits/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitKey, target }),
      });
      const d = await res.json().catch(() => ({}));
      setMsg(
        res.ok
          ? `Applied ${label} target (${target}).`
          : d.error === "Habit not tracked"
          ? `Add the ${label} habit to your dashboard first.`
          : "Couldn't apply target."
      );
    } finally {
      setBusy(false);
    }
  }

  async function addMed(med) {
    setBusy(true);
    try {
      const res = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: med.name,
          dosage: med.dosage || "",
          times: Array.isArray(med.times) ? med.times : [],
        }),
      });
      setMsg(res.ok ? `Added ${med.name} to your medications.` : "Couldn't add medication.");
    } finally {
      setBusy(false);
    }
  }

  if (plan === undefined) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">
          🩺 Health plan from your report{" "}
          <span className="text-sm font-medium text-ink/40">— AI summary &amp; suggestions</span>
        </h2>
        {plan && (
          <button onClick={clearPlan} className="text-xs font-semibold text-bad hover:underline">
            Remove plan
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onPick}
      />

      {!plan ? (
        <div className="card flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-ink/70">
            Upload a recent medical report (PDF or photo). The AI extracts your conditions and
            prescribed medications, and suggests a daily water / calorie / sleep target and
            foods to eat or avoid.
          </p>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="btn-primary px-5 py-2.5"
          >
            {busy ? "Analyzing…" : "📄 Upload report"}
          </button>
          {msg && <p className="text-sm text-ink/70">{msg}</p>}
          <p className="text-xs text-ink/45">
            The raw report is never stored — only the structured plan the AI returns.
          </p>
        </div>
      ) : (
        <div className="card space-y-5 p-6">
          {plan.summary && <p className="text-sm font-medium text-ink/80">{plan.summary}</p>}

          {plan.conditions?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {plan.conditions.map((c, i) => (
                <span key={i} className="pill bg-accent-soft text-accent">
                  {c}
                </span>
              ))}
            </div>
          )}

          {plan.redFlags?.length > 0 && (
            <div className="rounded-2xl border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-bad">
              <div className="font-semibold">⚠️ Discuss with your doctor</div>
              <ul className="mt-1 list-disc pl-5">
                {plan.redFlags.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <PlanTile
              icon="💧"
              label="Water"
              value={plan.water?.litersPerDay}
              unit="L/day"
              note={plan.water?.rationale}
              applyLabel="Set water target"
              onApply={
                plan.water?.litersPerDay
                  ? () => applyHabit("water", plan.water.litersPerDay, "water")
                  : null
              }
              busy={busy}
            />
            <PlanTile
              icon="🍎"
              label="Calories"
              value={plan.calories?.kcalPerDay}
              unit="kcal/day"
              note={plan.calories?.rationale}
              // No direct "apply" — calorie budget is derived from weight goal.
            />
            <PlanTile
              icon="😴"
              label="Sleep"
              value={plan.sleep?.hoursPerDay}
              unit="hrs/day"
              note={plan.sleep?.rationale}
              applyLabel="Set sleep target"
              onApply={
                plan.sleep?.hoursPerDay
                  ? () => applyHabit("sleep", plan.sleep.hoursPerDay, "sleep")
                  : null
              }
              busy={busy}
            />
          </div>

          {(plan.food?.eat?.length > 0 || plan.food?.avoid?.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {plan.food?.eat?.length > 0 && (
                <FoodList title="✅ Eat" items={plan.food.eat} good />
              )}
              {plan.food?.avoid?.length > 0 && (
                <FoodList title="🚫 Avoid" items={plan.food.avoid} />
              )}
            </div>
          )}

          {plan.medications?.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold text-ink">💊 Medications from your report</div>
              <ul className="space-y-2">
                {plan.medications.map((m, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink">
                        {m.name}
                        {m.dosage && <span className="ml-1 text-ink/50">· {m.dosage}</span>}
                      </div>
                      <div className="text-xs text-ink/55">
                        {(m.times || []).join(", ") || "no times listed"}
                        {m.note && ` · ${m.note}`}
                      </div>
                    </div>
                    <button
                      onClick={() => addMed(m)}
                      disabled={busy}
                      className="btn-good px-3 py-1.5 text-xs"
                    >
                      + Add to my meds
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.lifestyle?.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold text-ink">🌱 Lifestyle tips</div>
              <ul className="space-y-1 text-sm text-ink/75">
                {plan.lifestyle.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 text-good">●</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl bg-sand/70 px-4 py-3 text-xs text-ink/65">
            ⚠️ {plan.disclaimer}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="btn-outline px-4 py-1.5"
            >
              {busy ? "Analyzing…" : "Upload a new report"}
            </button>
            {msg && <span className="text-sm text-accent">{msg}</span>}
          </div>
        </div>
      )}
    </section>
  );
}

function PlanTile({ icon, label, value, unit, note, applyLabel, onApply, busy }) {
  return (
    <div className="rounded-2xl bg-accent-soft/60 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-accent/80">
          {icon} {label}
        </div>
      </div>
      <div className="font-display text-2xl font-extrabold text-ink">
        {value ?? "—"} <span className="text-xs font-semibold text-ink/40">{unit}</span>
      </div>
      {note && <div className="mt-1 text-xs text-ink/55">{note}</div>}
      {onApply && (
        <button
          onClick={onApply}
          disabled={busy}
          className="mt-2 text-xs font-semibold text-accent hover:underline disabled:opacity-50"
        >
          {applyLabel} →
        </button>
      )}
    </div>
  );
}

function FoodList({ title, items, good }) {
  return (
    <div className={`rounded-2xl px-4 py-3 ${good ? "bg-good-soft" : "bg-bad-soft"}`}>
      <div className={`mb-1.5 text-xs font-semibold ${good ? "text-good" : "text-bad"}`}>
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span key={i} className="pill bg-white/70 text-ink/80">
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

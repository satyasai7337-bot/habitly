"use client";

import { useCallback, useEffect, useState } from "react";
import { WeightTrend } from "@/components/Charts";
import { prettyDate } from "@/lib/dates";

export default function WeightLoss() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/weight", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      /* keep last data */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveGoal(goalWeight, goalDate) {
    const res = await fetch("/api/weight", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalWeight, goalDate }),
    });
    if (res.ok) {
      setEditing(false);
      await load();
      return null;
    }
    return (await res.json().catch(() => ({}))).error || "Could not save goal.";
  }

  async function clearGoal() {
    await fetch("/api/weight", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalWeight: null, goalDate: null }),
    });
    setEditing(false);
    await load();
  }

  async function logWeight() {
    const w = Number(weightInput);
    if (!Number.isFinite(w) || w <= 0) return;
    setBusy(true);
    try {
      await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: w }),
      });
      setWeightInput("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;

  const { goalWeight, goalDate, current, startWeight, logs = [], plan, projection } = data;
  const hasGoal = goalWeight != null && goalDate;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">
          ⚖️ Weight goal{" "}
          <span className="text-sm font-medium text-ink/40">— track your progress</span>
        </h2>
        {hasGoal && !editing && (
          <button onClick={() => setEditing(true)} className="btn-outline px-3 py-1.5">
            Edit goal
          </button>
        )}
      </div>

      {!hasGoal || editing ? (
        <GoalForm
          initialWeight={goalWeight ?? ""}
          initialDate={goalDate ?? ""}
          today={data.today}
          onSave={saveGoal}
          onClear={hasGoal ? clearGoal : null}
          onCancel={hasGoal ? () => setEditing(false) : null}
        />
      ) : (
        <div className="card space-y-5 p-5">
          <Progress start={startWeight} current={current} goal={goalWeight} />

          <Budget plan={plan} profileComplete={data.profileComplete} activity={data.activity} />

          {plan?.mode === "loss" && !plan.safe && (
            <Warn>
              Reaching <b>{goalWeight} kg</b> by {prettyDate(goalDate)} needs{" "}
              <b>{plan.requiredPace} kg/week</b> — faster than the recommended{" "}
              {plan.safePace} kg/week. A realistic target is{" "}
              <b>{plan.feasibleDate ? prettyDate(plan.feasibleDate) : "later"}</b>.
              {plan.feasibleDate && (
                <button
                  onClick={() => saveGoal(goalWeight, plan.feasibleDate)}
                  className="ml-2 font-semibold text-accent hover:underline"
                >
                  Use that date
                </button>
              )}
            </Warn>
          )}

          <ProjectionLine projection={projection} goalDate={goalDate} />

          {logs.length >= 2 && (
            <div>
              <div className="mb-1 text-xs font-medium text-ink/40">Your trend</div>
              <WeightTrend
                data={logs.map((l) => ({ ...l, label: prettyDate(l.date) }))}
                goal={goalWeight}
              />
            </div>
          )}

          <LogWeight value={weightInput} setValue={setWeightInput} onLog={logWeight} busy={busy} />
        </div>
      )}
    </section>
  );
}

function Progress({ start, current, goal }) {
  if (current == null || goal == null) return null;
  const total = (start ?? current) - goal;
  const lost = (start ?? current) - current;
  const pct = total > 0 ? Math.max(0, Math.min(100, (lost / total) * 100)) : 0;
  const toGo = Math.max(0, Math.round((current - goal) * 10) / 10);

  return (
    <div>
      <div className="mb-1 flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-ink">
            {current} <span className="text-base font-medium text-ink/50">kg now</span>
          </div>
          <div className="text-xs text-ink/50">
            start {start ?? "—"} kg · goal {goal} kg
          </div>
        </div>
        <div className="text-right">
          <div className="font-display font-bold text-good">
            {lost > 0 ? `${Math.round(lost * 10) / 10} kg lost` : "—"}
          </div>
          <div className="text-xs text-ink/50">{toGo} kg to go</div>
        </div>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-sand">
        <div className="bar-fill h-full rounded-full bg-good" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Budget({ plan, profileComplete, activity }) {
  if (!profileComplete) {
    return (
      <div className="rounded-2xl bg-sand/60 px-4 py-3 text-sm text-ink/60">
        Add your height, age and sex to your profile to get a personalized daily calorie budget.
      </div>
    );
  }
  if (!plan) return null;

  if (plan.mode === "not_loss") {
    return <Note>Your goal is at or above your current weight — set a lower goal to start a plan.</Note>;
  }
  if (plan.mode === "underweight") {
    return <Note>Your BMI is in the lower range, so we recommend maintenance (~{plan.tdee} kcal/day), not a deficit.</Note>;
  }
  if (plan.mode === "date_passed") {
    return <Note>Your target date has passed — edit your goal to pick a future date.</Note>;
  }

  return (
    <div className="rounded-2xl bg-good-soft px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-good/70">
        Daily calorie budget
      </div>
      <div className="font-display text-3xl font-extrabold text-good">
        {plan.calorieBudget}
        <span className="text-base font-medium text-good/60"> kcal/day</span>
      </div>
      <div className="mt-1 text-xs text-ink/55">
        ~{plan.tdee} kcal burned ({activity?.label}) − {plan.dailyDeficit} kcal deficit
        {plan.floorHit && " · capped at a safe minimum"}
      </div>
    </div>
  );
}

function ProjectionLine({ projection, goalDate }) {
  if (!projection) {
    return <p className="text-xs text-ink/50">Log your weight a few times to see a projection.</p>;
  }
  if (projection.trend !== "losing") {
    return (
      <p className="text-sm text-ink/70">
        📉 Your weight isn&apos;t trending down yet ({projection.weeklyChange >= 0 ? "+" : ""}
        {projection.weeklyChange} kg/wk). Stick with your budget and activity.
      </p>
    );
  }
  const onTrack = projection.projectedDate && projection.projectedDate <= goalDate;
  return (
    <p className="text-sm text-ink/70">
      📈 At your current pace ({projection.weeklyChange} kg/wk) you&apos;ll reach your goal around{" "}
      <b>{projection.projectedDate ? prettyDate(projection.projectedDate) : "—"}</b>
      {projection.projectedDate && (
        <span className={onTrack ? "text-good" : "text-accent"}>
          {onTrack ? " — on track! 🎯" : " — a bit behind your target date."}
        </span>
      )}
    </p>
  );
}

function LogWeight({ value, setValue, onLog, busy }) {
  return (
    <div className="flex items-center gap-2 border-t border-line pt-4">
      <input
        type="number"
        step="0.1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="today's weight (kg)"
        className="input flex-1 py-2"
      />
      <button onClick={onLog} disabled={busy || value === ""} className="btn-primary px-4 py-2">
        {busy ? "Saving…" : "Log weight"}
      </button>
    </div>
  );
}

function GoalForm({ initialWeight, initialDate, today, onSave, onClear, onCancel }) {
  const [weight, setWeight] = useState(initialWeight);
  const [date, setDate] = useState(initialDate);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    const w = Number(weight);
    if (!Number.isFinite(w) || w <= 0) {
      setErr("Enter a valid goal weight.");
      return;
    }
    if (!date || date <= today) {
      setErr("Pick a target date in the future.");
      return;
    }
    setSaving(true);
    const error = await onSave(w, date);
    setSaving(false);
    if (error) setErr(error);
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <p className="text-sm text-ink/60">
        Set a target weight and date — we&apos;ll work out a safe daily calorie budget and track
        your progress.
      </p>
      {err && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{err}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Goal weight (kg)</label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 70"
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Target date</label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="input"
            required
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {onClear && (
          <button type="button" onClick={onClear} className="mr-auto px-3 py-1.5 text-sm font-semibold text-bad hover:underline">
            Remove goal
          </button>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-outline px-4 py-1.5">
            Cancel
          </button>
        )}
        <button type="submit" disabled={saving} className="btn-primary px-4 py-1.5">
          {saving ? "Saving…" : "Save goal"}
        </button>
      </div>
    </form>
  );
}

function Warn({ children }) {
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
      ⚠️ {children}
    </div>
  );
}

function Note({ children }) {
  return <div className="rounded-2xl bg-sand/60 px-4 py-3 text-sm text-ink/60">{children}</div>;
}

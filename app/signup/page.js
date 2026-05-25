"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import { GOOD_HABITS, BAD_HABITS } from "@/lib/habits";
import { predictTarget, MODELED_HABITS } from "@/lib/ml/targetModel";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    bodyWeight: "",
    height: "",
    age: "",
    sex: "",
  });
  const [selected, setSelected] = useState([]);
  const [reminders, setReminders] = useState({}); // { habitKey: ["HH:MM", ...] }
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function toggleHabit(key) {
    if (selected.includes(key)) {
      setSelected((s) => s.filter((k) => k !== key));
      setReminders((r) => {
        const next = { ...r };
        delete next[key];
        return next;
      });
    } else {
      setSelected((s) => [...s, key]);
      // Seed smart default times for good habits; user can edit below.
      const g = GOOD_HABITS.find((h) => h.key === key);
      if (g) setReminders((r) => ({ ...r, [key]: [...g.reminderTimes] }));
    }
  }

  function addTime(key, t) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return;
    setReminders((r) => {
      const cur = r[key] || [];
      if (cur.includes(t)) return r;
      return { ...r, [key]: [...cur, t].sort() };
    });
  }

  function removeTime(key, t) {
    setReminders((r) => ({ ...r, [key]: (r[key] || []).filter((x) => x !== t) }));
  }

  const selectedGoodHabits = GOOD_HABITS.filter((h) => selected.includes(h.key));

  // Once the profile is complete, the trained models personalize each good
  // habit's goal live (the model is pure JS, so it runs right here in the form).
  const profileComplete =
    form.age !== "" && form.sex !== "" && form.bodyWeight !== "" && form.height !== "";
  const recommended = useMemo(() => {
    if (!profileComplete) return {};
    const profile = {
      age: form.age,
      sex: form.sex,
      bodyWeight: form.bodyWeight,
      height: form.height,
    };
    return Object.fromEntries(MODELED_HABITS.map((k) => [k, predictTarget(profile, k)]));
  }, [profileComplete, form.age, form.sex, form.bodyWeight, form.height]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (selected.length === 0) {
      setError("Pick at least one habit to track.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, habits: selected, reminders }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create account.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <Link href="/">
            <Brand size="lg" />
          </Link>
          <h1 className="mt-5 font-display text-2xl font-bold text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-ink/60">A minute now, a healthier you later.</p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {error && (
            <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">
              {error}
            </p>
          )}

          {/* Details */}
          <section className="card p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-ink">Your details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" name="name" value={form.name} onChange={update} required />
              <Field label="Phone number" name="phone" value={form.phone} onChange={update} type="tel" />
              <Field label="Email" name="email" value={form.email} onChange={update} type="email" required />
              <Field label="Password" name="password" value={form.password} onChange={update} type="password" required hint="min 6 characters" />
              <Field label="Body weight (kg)" name="bodyWeight" value={form.bodyWeight} onChange={update} type="number" />
              <Field label="Height (cm)" name="height" value={form.height} onChange={update} type="number" />
              <Field label="Age" name="age" value={form.age} onChange={update} type="number" />
              <div>
                <label className="label">Sex</label>
                <select name="sex" value={form.sex} onChange={update} className="input">
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </section>

          {/* Habit selection */}
          <section className="card p-6">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Choose your habits</h2>
              <span className="chip-good">{selected.length} selected</span>
            </div>
            <p className="mb-4 text-sm text-ink/60">
              These appear on your dashboard. You can fine-tune targets later.
            </p>

            <h3 className="mb-2 mt-2 text-sm font-semibold text-good">Good habits — to build</h3>
            {profileComplete && (
              <p className="mb-2 text-xs font-medium text-accent">
                ✨ Goals below are personalized to your details.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {GOOD_HABITS.map((h) => (
                <HabitToggle
                  key={h.key}
                  habit={h}
                  active={selected.includes(h.key)}
                  onClick={() => toggleHabit(h.key)}
                  good
                  recommended={recommended[h.key]}
                />
              ))}
            </div>

            <h3 className="mb-2 mt-5 text-sm font-semibold text-bad">Habits to prevent</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {BAD_HABITS.map((h) => (
                <HabitToggle key={h.key} habit={h} active={selected.includes(h.key)} onClick={() => toggleHabit(h.key)} />
              ))}
            </div>
          </section>

          {/* Reminder times — manual entry for good habits */}
          {selectedGoodHabits.length > 0 && (
            <section className="card p-6">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-lg">⏰</span>
                <h2 className="font-display text-lg font-bold text-ink">Set your reminder times</h2>
              </div>
              <p className="mb-4 text-sm text-ink/60">
                We pre-filled smart times for each good habit. Add or remove any to
                fit your day — reminders pop up in the app at these times. (Bad
                habits get no reminders.)
              </p>
              <div className="divide-y divide-line">
                {selectedGoodHabits.map((h) => (
                  <ReminderRow
                    key={h.key}
                    habit={h}
                    times={reminders[h.key] || []}
                    onAdd={addTime}
                    onRemove={removeTime}
                  />
                ))}
              </div>
            </section>
          )}

          <button className="btn-primary w-full py-3.5 text-base" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink/60">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-good hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({ label, hint, ...props }) {
  return (
    <div>
      <label className="label">
        {label} {hint && <span className="font-normal text-ink/40">· {hint}</span>}
      </label>
      <input className="input" {...props} />
    </div>
  );
}

function ReminderRow({ habit, times, onAdd, onRemove }) {
  const [newTime, setNewTime] = useState("");

  function add() {
    onAdd(habit.key, newTime);
    setNewTime("");
  }

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="text-base">{habit.emoji}</span>
        {habit.label}
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {times.length === 0 && (
          <span className="text-xs text-ink/40">No reminders — add one →</span>
        )}
        {times.map((t) => (
          <span key={t} className="pill bg-good-soft text-good">
            {t}
            <button
              type="button"
              onClick={() => onRemove(habit.key, t)}
              className="ml-1 text-good/60 hover:text-bad"
              aria-label={`Remove ${t}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="time"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
          className="input max-w-[160px] py-2"
        />
        <button type="button" onClick={add} className="btn-ghost px-3 py-2">
          Add time
        </button>
      </div>
    </div>
  );
}

function HabitToggle({ habit, active, onClick, good, recommended }) {
  const personalized = good && recommended != null;
  const goal = personalized ? recommended : habit.target;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-start rounded-2xl border p-3 text-left transition ${
        active
          ? good
            ? "border-good bg-good-soft ring-2 ring-good/30"
            : "border-bad bg-bad-soft ring-2 ring-bad/30"
          : "border-line bg-white hover:border-ink/20"
      }`}
    >
      <span className="text-xl">{habit.emoji}</span>
      <span className="mt-1 text-sm font-semibold text-ink">{habit.label}</span>
      <span className="text-xs text-ink/50">
        {habit.type === "good"
          ? `${personalized ? "✨ " : ""}goal ${goal} ${habit.unit}`
          : `aim for 0 ${habit.unit}`}
      </span>
      {active && (
        <span
          className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white ${
            good ? "bg-good" : "bg-bad"
          }`}
        >
          ✓
        </span>
      )}
    </button>
  );
}

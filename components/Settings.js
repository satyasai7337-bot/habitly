"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Settings({ initialUser }) {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Settings</h1>
        <p className="text-sm text-ink/60">Profile, password, custom habits, and account.</p>
      </div>

      <ProfileForm user={initialUser} onSaved={() => router.refresh()} />
      <PasswordForm />
      <HabitsManager initialHabits={initialUser.habits} onChanged={() => router.refresh()} />
      <DangerZone />
    </div>
  );
}

// ---------- Profile ----------
function ProfileForm({ user, onSaved }) {
  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    age: user.age ?? "",
    sex: user.sex || "",
    bodyWeight: user.bodyWeight ?? "",
    height: user.height ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function up(e) { setForm((f) => ({ ...f, [e.target.name]: e.target.value })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      setMsg(res.ok ? "Saved ✓" : d.error || "Could not save.");
      if (res.ok) onSaved?.();
    } finally { setSaving(false); }
  }

  return (
    <section className="card p-6">
      <h2 className="mb-4 font-display text-lg font-bold text-ink">Profile</h2>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="name" value={form.name} onChange={up} required />
        <Field label="Phone" name="phone" value={form.phone} onChange={up} type="tel" />
        <Field label="Age" name="age" value={form.age} onChange={up} type="number" />
        <div>
          <label className="label">Sex</label>
          <select name="sex" value={form.sex} onChange={up} className="input">
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <Field label="Body weight (kg)" name="bodyWeight" value={form.bodyWeight} onChange={up} type="number" />
        <Field label="Height (cm)" name="height" value={form.height} onChange={up} type="number" />
        <div className="sm:col-span-2 flex items-center justify-end gap-3">
          {msg && <span className="text-sm text-ink/65">{msg}</span>}
          <button disabled={saving} className="btn-primary px-5 py-2">{saving ? "Saving…" : "Save profile"}</button>
        </div>
      </form>
    </section>
  );
}

// ---------- Password ----------
function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const d = await res.json();
      if (res.ok) { setMsg("Password changed ✓"); setCurrent(""); setNext(""); }
      else setMsg(d.error || "Could not change password.");
    } finally { setSaving(false); }
  }

  return (
    <section className="card p-6">
      <h2 className="mb-4 font-display text-lg font-bold text-ink">Change password</h2>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Current password</label>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="input" required autoComplete="current-password" />
        </div>
        <div>
          <label className="label">New password <span className="font-normal text-ink/40">· min 6 characters</span></label>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="input" required minLength={6} autoComplete="new-password" />
        </div>
        <div className="sm:col-span-2 flex items-center justify-end gap-3">
          {msg && <span className="text-sm text-ink/65">{msg}</span>}
          <button disabled={saving} className="btn-primary px-5 py-2">{saving ? "Saving…" : "Change password"}</button>
        </div>
      </form>
    </section>
  );
}

// ---------- Habits (custom add + delete) ----------
function HabitsManager({ initialHabits, onChanged }) {
  const [habits, setHabits] = useState(initialHabits || []);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);

  async function deleteHabit(h) {
    if (!window.confirm(`Remove "${h.label}" from your dashboard?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/habits/settings?habitKey=${encodeURIComponent(h.key)}`, { method: "DELETE" });
      const d = await res.json();
      if (res.ok) { setHabits(d.user.habits); onChanged?.(); }
    } finally { setBusy(false); }
  }

  async function addHabit(payload) {
    const res = await fetch("/api/habits/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (res.ok) { setHabits(d.user.habits); setShowAdd(false); onChanged?.(); return null; }
    return d.error || "Could not add habit.";
  }

  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">Habits</h2>
        <button onClick={() => setShowAdd((s) => !s)} className="btn-outline px-3 py-1.5">
          {showAdd ? "Close" : "+ Add custom habit"}
        </button>
      </div>

      {showAdd && <AddHabitForm onAdd={addHabit} onCancel={() => setShowAdd(false)} />}

      <ul className="mt-2 space-y-2">
        {habits.map((h) => (
          <li key={h.key} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
            <span className="text-xl">{h.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink">
                {h.label}
                <span className={`ml-2 ${h.type === "good" ? "chip-good" : "chip-bad"}`}>
                  {h.type === "good" ? `goal ${h.target} ${h.unit}` : `avoid ${h.unit}`}
                </span>
              </div>
              {h.type === "good" && (
                <div className="truncate text-xs text-ink/50">
                  reminders: {(h.reminderTimes || []).join(", ") || "none"}
                </div>
              )}
            </div>
            <button
              onClick={() => deleteHabit(h)}
              disabled={busy}
              className="text-xs font-semibold text-bad hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function AddHabitForm({ onAdd, onCancel }) {
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("⭐");
  const [type, setType] = useState("good");
  const [unit, setUnit] = useState("");
  const [target, setTarget] = useState("");
  const [step, setStep] = useState("1");
  const [times, setTimes] = useState([]);
  const [newTime, setNewTime] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  function addTime() {
    if (TIME_RE.test(newTime) && !times.includes(newTime)) {
      setTimes((t) => [...t, newTime].sort());
      setNewTime("");
    }
  }
  async function submit(e) {
    e.preventDefault();
    setErr("");
    const key = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30);
    if (!key) { setErr("Label is required."); return; }
    setSaving(true);
    const error = await onAdd({
      key,
      label: label.trim(),
      type,
      emoji,
      unit: unit.trim() || "units",
      target: Number(target) || 0,
      step: Number(step) || 1,
      reminderTimes: times,
    });
    setSaving(false);
    if (error) setErr(error);
  }
  return (
    <form onSubmit={submit} className="mb-4 space-y-4 rounded-2xl border border-line bg-sand/40 p-4">
      {err && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{err}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Meditation" required />
        <Field label="Emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="e.g. 🧘" />
        <div>
          <label className="label">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="input">
            <option value="good">Good (build it)</option>
            <option value="bad">Bad (prevent it)</option>
          </select>
        </div>
        <Field label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="min / cups / sessions" />
        {type === "good" && (
          <>
            <Field label="Daily target" value={target} onChange={(e) => setTarget(e.target.value)} type="number" required />
            <Field label="Quick-add step" value={step} onChange={(e) => setStep(e.target.value)} type="number" />
          </>
        )}
      </div>

      {type === "good" && (
        <div>
          <label className="label">Reminder times</label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {times.length === 0 && <span className="text-xs text-ink/40">No reminders — add one →</span>}
            {times.map((t) => (
              <span key={t} className="pill bg-accent-soft text-accent">
                {t}
                <button type="button" onClick={() => setTimes((x) => x.filter((y) => y !== t))} className="ml-1 text-accent/60 hover:text-bad">✕</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="input max-w-[160px] py-2" />
            <button type="button" onClick={addTime} className="btn-ghost px-3 py-2">Add time</button>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-outline px-4 py-1.5">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary px-4 py-1.5">{saving ? "Adding…" : "Add habit"}</button>
      </div>
    </form>
  );
}

// ---------- Danger zone ----------
function DangerZone() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function del() {
    const confirm1 = window.prompt('This permanently deletes your account and all data. Type DELETE to confirm.');
    if (confirm1 !== "DELETE") return;
    setBusy(true);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (res.ok) { router.push("/login"); router.refresh(); }
    } finally { setBusy(false); }
  }
  return (
    <section className="card border border-bad/30 p-6">
      <h2 className="mb-2 font-display text-lg font-bold text-bad">Danger zone</h2>
      <p className="mb-3 text-sm text-ink/65">
        Permanently delete your account, habit logs, medications, weight logs, calorie entries,
        vitals and health plan. This can&apos;t be undone.
      </p>
      <button onClick={del} disabled={busy} className="rounded-full bg-bad px-5 py-2 text-sm font-bold text-white hover:brightness-95">
        {busy ? "Deleting…" : "Delete my account"}
      </button>
    </section>
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

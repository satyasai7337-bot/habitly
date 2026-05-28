"use client";

import { useState } from "react";
import { MiniArea } from "@/components/Charts";

const GOOD_COLOR = "#3f8f5c";
const BAD_COLOR = "#c2554d";

export default function HabitCard({ habit, onChanged, recommended }) {
  const good = habit.type === "good";
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const p = habit.progress;
  const color = good ? GOOD_COLOR : BAD_COLOR;

  async function log(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) return;
    setBusy(true);
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitKey: habit.key, value: num }),
      });
      setCustom("");
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  const next = good ? nextSlot(habit.reminderEnabled ? habit.reminderTimes : []) : null;

  return (
    <div className="card flex flex-col p-5">
      {/* header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{habit.emoji}</span>
          <div>
            <h3 className="font-display font-bold leading-tight text-ink">{habit.label}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              <span className={good ? "chip-good" : "chip-bad"}>
                {good ? "good habit" : "prevent"}
              </span>
              {habit.streak > 0 && (
                <span className="pill bg-accent-soft text-accent">🔥 {habit.streak}-day</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="rounded-full p-1.5 text-ink/40 transition hover:bg-sand hover:text-ink"
          title="Settings"
          aria-label="Habit settings"
        >
          ⚙️
        </button>
      </div>

      {/* today number */}
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-ink">
            {round(p.today)}
            <span className="text-base font-medium text-ink/50">
              {good ? ` / ${habit.target} ${habit.unit}` : ` ${habit.unit}`}
            </span>
          </div>
          <div className="text-xs text-ink/50">
            {good
              ? p.met
                ? "Target reached 🎉"
                : `${round(p.remaining)} ${habit.unit} to go`
              : p.met
              ? "Clean today ✅"
              : `aim for ${habit.target} · over by ${round(p.over)}`}
          </div>
        </div>
        {good && p.met && <span className="chip-good">done</span>}
        {!good && p.met && <span className="chip-good">clean ✅</span>}
      </div>

      {/* progress bar */}
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-sand">
        <div
          className="bar-fill h-full rounded-full"
          style={{ width: `${Math.min(100, p.percent)}%`, backgroundColor: color }}
        />
      </div>

      {/* quick log */}
      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => log(habit.step)} disabled={busy} className={good ? "btn-good px-3 py-2" : "btn px-3 py-2 bg-bad text-white hover:brightness-95"}>
          + {habit.step} {good ? habit.unit : ""}
        </button>
        <input
          type="number"
          step="any"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder={`add ${habit.unit}`}
          className="input flex-1 py-2"
        />
        <button onClick={() => log(custom)} disabled={busy || custom === ""} className="btn-outline px-3 py-2">
          Log
        </button>
      </div>

      {/* mini chart */}
      <div className="mt-4">
        <div className="mb-1 text-xs font-medium text-ink/40">Last 7 days</div>
        <MiniArea data={habit.series7} color={color} />
      </div>

      {/* reminders (good only) */}
      {good && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-accent-soft px-3 py-2 text-sm text-accent">
          <span>
            🔔{" "}
            {next
              ? `Next reminder ${next.slot} · ${relative(next.when)}`
              : "Reminders off"}
          </span>
          <span className="font-semibold">{habit.remindersSent ?? 0} today</span>
        </div>
      )}

      {/* consequence */}
      <div className="mt-3 rounded-2xl bg-bad-soft px-3 py-2 text-xs text-bad/90">
        ⚠️ {good ? "If you skip: " : "Why prevent: "}
        {habit.consequence}
      </div>

      {showSettings && (
        <Settings
          habit={habit}
          good={good}
          recommended={recommended}
          onChanged={onChanged}
          close={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function Settings({ habit, good, recommended, onChanged, close }) {
  const [target, setTarget] = useState(habit.target);
  const [enabled, setEnabled] = useState(habit.reminderEnabled !== false);
  const [times, setTimes] = useState(habit.reminderTimes || []);
  const [newTime, setNewTime] = useState("");
  const [saving, setSaving] = useState(false);

  // Backfill: log an amount for a previous day.
  const [bfDate, setBfDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [bfValue, setBfValue] = useState("");
  const [bfMsg, setBfMsg] = useState("");
  async function backfill() {
    const v = Number(bfValue);
    if (!Number.isFinite(v) || v === 0) return;
    setBfMsg("");
    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitKey: habit.key, value: v, date: bfDate }),
    });
    if (res.ok) {
      setBfMsg(`Logged ${v} ${habit.unit} for ${bfDate}.`);
      setBfValue("");
      onChanged?.();
    } else {
      const d = await res.json().catch(() => ({}));
      setBfMsg(d.error || "Couldn't log.");
    }
  }

  function addTime() {
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(newTime) && !times.includes(newTime)) {
      setTimes((t) => [...t, newTime].sort());
      setNewTime("");
    }
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/habits/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habitKey: habit.key,
          target: Number(target),
          reminderTimes: times,
          reminderEnabled: enabled,
        }),
      });
      onChanged?.();
      close();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-line bg-sand/50 p-3">
      <div>
        <label className="label">Daily target ({habit.unit})</label>
        <input
          type="number"
          step="any"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="input py-2"
        />
        {recommended != null && (
          <div className="mt-2 flex items-center justify-between rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">
            <span>
              ✨ Suggested for you: <b>{recommended} {habit.unit}</b>
            </span>
            <button
              type="button"
              onClick={() => setTarget(recommended)}
              disabled={Number(target) === recommended}
              className="btn-ghost px-2 py-1 text-xs disabled:opacity-50"
            >
              {Number(target) === recommended ? "In use" : "Use"}
            </button>
          </div>
        )}
      </div>

      {good && (
        <>
          <label className="flex items-center gap-2 text-sm font-medium text-ink/70">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            In-app reminders on
          </label>
          <div>
            <label className="label">Reminder times</label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {times.length === 0 && <span className="text-xs text-ink/40">none set</span>}
              {times.map((t) => (
                <span key={t} className="pill bg-white text-ink">
                  {t}
                  <button onClick={() => setTimes((x) => x.filter((y) => y !== t))} className="ml-1 text-ink/40 hover:text-bad">
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="input py-2" />
              <button onClick={addTime} className="btn-ghost px-3 py-2">
                Add
              </button>
            </div>
          </div>
        </>
      )}

      <div className="rounded-2xl bg-white px-3 py-2">
        <div className="mb-1 text-xs font-semibold text-ink/55">📅 Log a past day</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={bfDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setBfDate(e.target.value)}
            className="input py-1.5 text-sm"
          />
          <input
            type="number"
            step="any"
            value={bfValue}
            onChange={(e) => setBfValue(e.target.value)}
            placeholder={habit.unit}
            className="input w-24 py-1.5 text-sm"
          />
          <button type="button" onClick={backfill} disabled={!bfValue} className="btn-ghost px-3 py-1.5 text-sm">
            Log
          </button>
        </div>
        {bfMsg && <div className="mt-1 text-xs text-ink/55">{bfMsg}</div>}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={close} className="btn-outline px-4 py-1.5">
          Cancel
        </button>
        <button onClick={save} disabled={saving} className="btn-primary px-4 py-1.5">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function nextSlot(times) {
  if (!times || times.length === 0) return null;
  const now = new Date();
  let best = null;
  for (const s of times) {
    const [h, m] = s.split(":").map(Number);
    const w = new Date(now);
    w.setHours(h, m, 0, 0);
    if (w <= now) w.setDate(w.getDate() + 1);
    if (!best || w < best.when) best = { slot: s, when: w };
  }
  return best;
}

function relative(when) {
  const ms = when - new Date();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `in ${h}h ${m}m` : `in ${h}h`;
}

function round(n) {
  return Math.round((n || 0) * 100) / 100;
}

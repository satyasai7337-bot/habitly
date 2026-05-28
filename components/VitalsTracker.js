"use client";

import { useCallback, useEffect, useState } from "react";
import { GlucoseChart, BPChart } from "@/components/Charts";
import { glucoseZone, bpZone, moodZone, zoneColor, zoneLabel, MOOD_EMOJI, GLUCOSE_CONTEXTS } from "@/lib/vitals";
import { prettyDate } from "@/lib/dates";

export default function VitalsTracker() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/vitals", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(body) {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) await load(); else setMsg(d.error || "Could not save.");
    } finally { setBusy(false); }
  }
  async function del(id) {
    await fetch(`/api/vitals?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  if (!data) return null;

  const glucose = (data.vitals?.glucose || []).slice().reverse(); // oldest first for chart
  const bp = (data.vitals?.bp || []).slice().reverse();
  const mood = data.vitals?.mood || [];

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Vitals</h1>
        <p className="text-sm text-ink/60">Track glucose, blood pressure and mood over time.</p>
      </div>

      {msg && (
        <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{msg}</p>
      )}

      <GlucoseCard entries={glucose} onAdd={add} onDelete={del} busy={busy} />
      <BPCard entries={bp} onAdd={add} onDelete={del} busy={busy} />
      <MoodCard entries={mood} onAdd={add} onDelete={del} busy={busy} />
    </div>
  );
}

// ---------- Glucose ----------
function GlucoseCard({ entries, onAdd, onDelete, busy }) {
  const [value, setValue] = useState("");
  const [context, setContext] = useState("fasting");
  const latest = entries[entries.length - 1];
  const latestZone = latest && glucoseZone(latest.value, latest.context);

  function submit(e) {
    e.preventDefault();
    const v = Number(value);
    if (!Number.isFinite(v)) return;
    onAdd({ type: "glucose", value: v, context });
    setValue("");
  }

  const chartData = entries.map((e) => ({
    label: prettyDate(e.date) + (e.time ? ` ${e.time}` : ""),
    value: e.value,
  }));

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">🩸 Blood glucose</h2>
        {latest && (
          <span
            className="pill font-bold text-white"
            style={{ backgroundColor: zoneColor(latestZone) }}
            title={`${latest.context || "random"} · ${latest.date}${latest.time ? ` ${latest.time}` : ""}`}
          >
            {latest.value} mg/dL · {zoneLabel(latestZone)}
          </span>
        )}
      </div>

      {chartData.length > 0 && <GlucoseChart data={chartData} />}

      <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="mg/dL"
          className="input w-28 py-2"
          min="20" max="600"
        />
        <select value={context} onChange={(e) => setContext(e.target.value)} className="input w-36 py-2 text-sm">
          {GLUCOSE_CONTEXTS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button disabled={busy || value === ""} className="btn-primary px-4 py-2">+ Log glucose</button>
      </form>

      {entries.length > 0 && <RecentList entries={entries.slice().reverse()} onDelete={onDelete} render={(e) => `${e.value} mg/dL · ${e.context || "random"}`} />}
    </section>
  );
}

// ---------- Blood pressure ----------
function BPCard({ entries, onAdd, onDelete, busy }) {
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const latest = entries[entries.length - 1];
  const latestZone = latest && bpZone(latest.systolic, latest.diastolic);

  function submit(e) {
    e.preventDefault();
    const s = Number(sys), d = Number(dia);
    if (!Number.isFinite(s) || !Number.isFinite(d)) return;
    onAdd({ type: "bp", systolic: s, diastolic: d });
    setSys(""); setDia("");
  }

  const chartData = entries.map((e) => ({
    label: prettyDate(e.date) + (e.time ? ` ${e.time}` : ""),
    systolic: e.systolic,
    diastolic: e.diastolic,
  }));

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">❤️ Blood pressure</h2>
        {latest && (
          <span className="pill font-bold text-white" style={{ backgroundColor: zoneColor(latestZone) }}>
            {latest.systolic}/{latest.diastolic} · {zoneLabel(latestZone)}
          </span>
        )}
      </div>

      {chartData.length > 0 && <BPChart data={chartData} />}

      <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <input type="number" value={sys} onChange={(e) => setSys(e.target.value)} placeholder="systolic" className="input w-28 py-2" min="60" max="260" />
        <span className="text-ink/40">/</span>
        <input type="number" value={dia} onChange={(e) => setDia(e.target.value)} placeholder="diastolic" className="input w-28 py-2" min="30" max="180" />
        <button disabled={busy || !sys || !dia} className="btn-primary px-4 py-2">+ Log BP</button>
      </form>

      {entries.length > 0 && <RecentList entries={entries.slice().reverse()} onDelete={onDelete} render={(e) => `${e.systolic}/${e.diastolic} mmHg`} />}
    </section>
  );
}

// ---------- Mood ----------
function MoodCard({ entries, onAdd, onDelete, busy }) {
  const latest = entries[0]; // entries are newest-first from API
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">🙂 Mood</h2>
        {latest && (
          <span className="pill font-bold text-white" style={{ backgroundColor: zoneColor(moodZone(latest.value)) }}>
            {MOOD_EMOJI[latest.value]} {zoneLabel(moodZone(latest.value)) || "—"}
          </span>
        )}
      </div>

      <p className="mb-3 text-sm text-ink/60">How are you feeling today?</p>
      <div className="flex justify-around gap-2">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            onClick={() => onAdd({ type: "mood", value: v })}
            disabled={busy}
            className="flex-1 rounded-2xl bg-sand/70 px-3 py-3 text-2xl transition hover:bg-accent-soft"
            title={`Log mood ${v}/5`}
          >
            {MOOD_EMOJI[v]}
          </button>
        ))}
      </div>

      {entries.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <div className="mb-1 text-xs font-medium text-ink/45">Recent</div>
          <div className="flex flex-wrap gap-1.5">
            {entries.slice(0, 14).map((e) => (
              <span
                key={e.id}
                title={`${e.date}${e.time ? " " + e.time : ""}`}
                className="rounded-full px-2 py-1 text-lg"
                style={{ backgroundColor: zoneColor(moodZone(e.value)) + "33" }}
              >
                {MOOD_EMOJI[e.value]}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function RecentList({ entries, onDelete, render }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-semibold text-ink/55 hover:text-ink">
        Recent entries ({entries.length})
      </summary>
      <ul className="mt-2 space-y-1">
        {entries.slice(0, 10).map((e) => (
          <li key={e.id} className="flex items-center gap-2 text-sm">
            <span className="w-28 shrink-0 text-xs text-ink/45">
              {prettyDate(e.date)}{e.time ? ` · ${e.time}` : ""}
            </span>
            <span className="flex-1 truncate text-ink/80">{render(e)}</span>
            <button onClick={() => onDelete(e.id)} className="text-xs text-ink/35 hover:text-bad" aria-label="Delete">
              ✕
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

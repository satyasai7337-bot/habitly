"use client";

import { useCallback, useEffect, useState } from "react";
import { TIME_RE } from "@/lib/medications";

export default function Medications() {
  const [data, setData] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(null); // "<medId>|<slot>" currently updating

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/medications", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      /* keep last data on transient errors */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000); // re-check due doses every minute
    return () => clearInterval(id);
  }, [load]);

  async function markDose(medicationId, slot, status) {
    const key = `${medicationId}|${slot}`;
    setBusy(key);
    try {
      await fetch("/api/medications/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicationId, slot, status }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function addMed(payload) {
    const res = await fetch("/api/medications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowAdd(false);
      await load();
      return true;
    }
    return false;
  }

  async function deleteMed(med) {
    if (!window.confirm(`Delete "${med.name}"? This removes its schedule and history.`)) return;
    await fetch(`/api/medications?id=${encodeURIComponent(med.id)}`, { method: "DELETE" });
    await load();
  }

  async function toggleActive(med) {
    await fetch("/api/medications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: med.id, active: !med.active }),
    });
    await load();
  }

  if (!data) return null;

  const { schedule = [], medications = [], serverSlot = "00:00" } = data;
  const dueCount = schedule.filter((d) => d.status === "pending" && d.slot <= serverSlot).length;
  const takenCount = schedule.filter((d) => d.status === "taken").length;

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">
          💊 Medications{" "}
          <span className="text-sm font-medium text-ink/40">— stay on schedule</span>
        </h2>
        <button onClick={() => setShowAdd((s) => !s)} className="btn-outline px-3 py-1.5">
          {showAdd ? "Close" : "+ Add medication"}
        </button>
      </div>

      {showAdd && <AddForm onAdd={addMed} onCancel={() => setShowAdd(false)} />}

      {medications.length === 0 && !showAdd && (
        <div className="card p-5 text-sm text-ink/60">
          No medications yet. Add one to get dose reminders right here on your dashboard. 💊
        </div>
      )}

      {schedule.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-accent-soft/60 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔔</span>
              <h3 className="font-display font-bold text-ink">Today&apos;s doses</h3>
            </div>
            <div className="flex items-center gap-2">
              {dueCount > 0 && <span className="pill bg-accent text-white">{dueCount} due now</span>}
              <span className="pill bg-white text-ink/50">
                {takenCount}/{schedule.length} taken
              </span>
            </div>
          </div>
          <ul className="divide-y divide-line">
            {schedule.map((d) => (
              <DoseRow
                key={`${d.medicationId}|${d.slot}`}
                d={d}
                due={d.status === "pending" && d.slot <= serverSlot}
                busy={busy === `${d.medicationId}|${d.slot}`}
                onMark={markDose}
              />
            ))}
          </ul>
        </div>
      )}

      {medications.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink/60 hover:text-ink">
            Manage medications ({medications.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {medications.map((m) => (
              <ManageRow key={m.id} med={m} onToggle={toggleActive} onDelete={deleteMed} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function DoseRow({ d, due, busy, onMark }) {
  return (
    <li className={`flex items-center gap-3 px-5 py-3 ${due ? "bg-accent-soft/40" : ""}`}>
      <span className="w-12 shrink-0 text-sm font-semibold text-ink/70">{d.slot}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">
          {d.name}
          {d.dosage && <span className="font-normal text-ink/50"> · {d.dosage}</span>}
        </div>
        {due && <div className="text-xs font-medium text-accent">Due now</div>}
      </div>

      {d.status === "pending" ? (
        <div className="flex shrink-0 gap-2">
          <button
            disabled={busy}
            onClick={() => onMark(d.medicationId, d.slot, "taken")}
            className="btn-good px-3 py-1.5 text-sm"
          >
            Take
          </button>
          <button
            disabled={busy}
            onClick={() => onMark(d.medicationId, d.slot, "skipped")}
            className="btn-outline px-3 py-1.5 text-sm"
          >
            Skip
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <span className={d.status === "taken" ? "chip-good" : "chip-bad"}>
            {d.status === "taken" ? "✓ Taken" : "Skipped"}
          </span>
          <button
            disabled={busy}
            onClick={() => onMark(d.medicationId, d.slot, "pending")}
            className="text-xs text-ink/40 hover:text-ink"
          >
            undo
          </button>
        </div>
      )}
    </li>
  );
}

function ManageRow({ med, onToggle, onDelete }) {
  const times = (med.times || []).join(", ") || "no set times";
  const course =
    med.startDate || med.endDate
      ? ` · ${med.startDate || "…"} → ${med.endDate || "ongoing"}`
      : "";
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink">
          {med.name}
          {med.dosage && <span className="font-normal text-ink/50"> · {med.dosage}</span>}
          {!med.active && <span className="ml-2 pill bg-sand text-ink/50">paused</span>}
        </div>
        <div className="truncate text-xs text-ink/50">
          {times}
          {course}
        </div>
      </div>
      <button onClick={() => onToggle(med)} className="btn-ghost px-2 py-1 text-xs">
        {med.active ? "Pause" : "Resume"}
      </button>
      <button
        onClick={() => onDelete(med)}
        className="px-2 py-1 text-xs font-semibold text-bad hover:underline"
      >
        Delete
      </button>
    </li>
  );
}

function AddForm({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [times, setTimes] = useState([]);
  const [newTime, setNewTime] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function addTime() {
    if (TIME_RE.test(newTime) && !times.includes(newTime)) {
      setTimes((t) => [...t, newTime].sort());
      setNewTime("");
    }
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!name.trim()) {
      setErr("Medication name is required.");
      return;
    }
    setSaving(true);
    const ok = await onAdd({
      name,
      dosage,
      times,
      startDate: startDate || null,
      endDate: endDate || null,
      notes,
    });
    setSaving(false);
    if (!ok) setErr("Couldn't add medication. Please try again.");
  }

  return (
    <form onSubmit={submit} className="card mb-4 space-y-4 p-5">
      {err && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{err}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vitamin D"
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Dosage <span className="font-normal text-ink/40">· optional</span></label>
          <input
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="e.g. 500 mg / 1 tablet"
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label">Dose times</label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {times.length === 0 && <span className="text-xs text-ink/40">No times yet — add one →</span>}
          {times.map((t) => (
            <span key={t} className="pill bg-accent-soft text-accent">
              {t}
              <button
                type="button"
                onClick={() => setTimes((x) => x.filter((y) => y !== t))}
                className="ml-1 text-accent/60 hover:text-bad"
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
          <button type="button" onClick={addTime} className="btn-ghost px-3 py-2">
            Add time
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Start date <span className="font-normal text-ink/40">· optional</span></label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input py-2" />
        </div>
        <div>
          <label className="label">End date <span className="font-normal text-ink/40">· for a course</span></label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input py-2" />
        </div>
      </div>

      <div>
        <label className="label">Notes <span className="font-normal text-ink/40">· optional</span></label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. take with food"
          className="input"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-outline px-4 py-1.5">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary px-4 py-1.5">
          {saving ? "Adding…" : "Add medication"}
        </button>
      </div>
    </form>
  );
}

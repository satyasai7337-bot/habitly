"use client";

import { useCallback, useEffect, useState } from "react";

export default function Reminders({ onChanged }) {
  const [pending, setPending] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders/due", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPending(data.pending || []);
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000); // check every minute
    return () => clearInterval(id);
  }, [load]);

  async function quickLog(r) {
    setBusyKey(r.habitKey);
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitKey: r.habitKey, value: r.step }),
      });
      await load();
      onChanged?.();
    } finally {
      setBusyKey(null);
    }
  }

  if (!loaded) return null;

  // All caught up.
  if (pending.length === 0) {
    return (
      <div className="card mb-6 flex items-center gap-3 p-4">
        <span className="text-xl">🔔</span>
        <p className="text-sm text-ink/60">
          No reminders right now — you&apos;re all caught up. ✅
        </p>
      </div>
    );
  }

  return (
    <div className="card mb-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-accent-soft/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <h2 className="font-display font-bold text-ink">Reminders</h2>
        </div>
        <span className="pill bg-accent text-white">{pending.length} due</span>
      </div>

      <ul className="divide-y divide-line">
        {pending.map((r) => (
          <li key={r.habitKey} className="flex items-center gap-3 px-5 py-3">
            <span className="text-2xl">{r.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">
                Time for your {r.label.toLowerCase()}
                <span className="ml-2 text-xs font-normal text-ink/40">
                  since {r.lastSlot}
                </span>
              </div>
              <div className="text-xs text-ink/55">
                {round(r.todayTotal)}/{r.target} {r.unit} today · {r.consequence}
              </div>
            </div>
            <button
              onClick={() => quickLog(r)}
              disabled={busyKey === r.habitKey}
              className="btn-good shrink-0 px-3 py-2"
            >
              + {r.step} {r.unit}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function round(n) {
  return Math.round((n || 0) * 100) / 100;
}

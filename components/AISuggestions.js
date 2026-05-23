"use client";

import { useEffect, useState } from "react";

export default function AISuggestions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/suggestions", { method: "POST" });
      const json = await res.json();
      setData(json);
    } catch {
      setData({ overview: "", tips: ["Couldn't load suggestions right now."], source: "rules" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-accent-soft/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h2 className="font-display font-bold text-ink">AI coach</h2>
          {data && (
            <span className="pill bg-white text-ink/50">
              {data.source === "gemini" ? "Gemini" : "built-in"}
            </span>
          )}
        </div>
        <button onClick={load} disabled={loading} className="btn-outline px-3 py-1.5">
          {loading ? "Thinking…" : "Refresh"}
        </button>
      </div>

      <div className="p-5">
        {loading && !data && <p className="text-sm text-ink/50">Analyzing your week…</p>}
        {data && (
          <>
            {data.overview && <p className="mb-3 text-sm font-medium text-ink/80">{data.overview}</p>}
            <ul className="space-y-2">
              {data.tips?.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink/80">
                  <span className="mt-0.5 text-good">●</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

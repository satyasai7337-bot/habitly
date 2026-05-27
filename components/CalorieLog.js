"use client";

import { useCallback, useEffect, useState } from "react";

const MEALS = ["breakfast", "lunch", "dinner", "snack"];
const DIETS = [
  ["any", "Any"],
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["non-veg", "Non-veg"],
  ["high-protein", "High-protein"],
];

export default function CalorieLog() {
  const [data, setData] = useState(null);
  const [name, setName] = useState("");
  const [cals, setCals] = useState("");
  const [meal, setMeal] = useState("");
  const [busy, setBusy] = useState(false);

  // AI suggestion controls
  const [diet, setDiet] = useState("any");
  const [suggestMeal, setSuggestMeal] = useState("");
  const [suggestions, setSuggestions] = useState(null);
  const [suggesting, setSuggesting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/food", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      /* keep last data */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addEntry(entry) {
    setBusy(true);
    try {
      await fetch("/api/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function submitAdd(e) {
    e.preventDefault();
    const c = Number(cals);
    if (!Number.isFinite(c) || c <= 0) return;
    await addEntry({ name, calories: c, meal });
    setName("");
    setCals("");
    setMeal("");
  }

  async function del(id) {
    await fetch(`/api/food?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  async function suggest() {
    setSuggesting(true);
    setSuggestions(null);
    try {
      const res = await fetch("/api/ai/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diet, meal: suggestMeal }),
      });
      if (res.ok) setSuggestions(await res.json());
    } finally {
      setSuggesting(false);
    }
  }

  if (!data) return null;

  const { entries = [], total = 0, budget, remaining } = data;
  const over = budget != null && remaining < 0;
  const pct = budget ? Math.min(100, (total / budget) * 100) : 0;

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-xl font-bold text-ink">
        🍎 Calories today <span className="text-sm font-medium text-ink/40">— log what you eat</span>
      </h2>

      <div className="card space-y-4 p-5">
        {/* total vs budget */}
        <div>
          <div className="mb-1 flex items-end justify-between">
            <div className="text-2xl font-bold text-ink">
              {Math.round(total)}
              {budget != null && <span className="text-base font-medium text-ink/50"> / {budget} kcal</span>}
            </div>
            {budget != null ? (
              <div className={`font-display font-bold ${over ? "text-bad" : "text-good"}`}>
                {over ? `${Math.abs(remaining)} over` : `${remaining} left`}
              </div>
            ) : (
              <span className="text-xs text-ink/40">{Math.round(total)} kcal logged</span>
            )}
          </div>
          {budget != null && (
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-sand">
              <div
                className="bar-fill h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: over ? "#c2554d" : "#3f8f5c" }}
              />
            </div>
          )}
          {budget == null && (
            <p className="text-xs text-ink/50">
              Set a weight goal (or complete your profile) to see a daily calorie budget here.
            </p>
          )}
        </div>

        {/* entries */}
        {entries.length > 0 && (
          <ul className="divide-y divide-line">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">
                    {e.name || "Food"}
                    {e.meal && <span className="ml-2 pill bg-sand text-ink/50">{e.meal}</span>}
                  </div>
                </div>
                <span className="text-sm font-semibold text-ink/70">{e.calories} kcal</span>
                <button onClick={() => del(e.id)} className="text-xs text-ink/40 hover:text-bad" aria-label="Delete">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* add form */}
        <form onSubmit={submitAdd} className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="food (optional)"
            className="input min-w-[120px] flex-1 py-2"
          />
          <select value={meal} onChange={(e) => setMeal(e.target.value)} className="input w-32 py-2">
            <option value="">meal…</option>
            {MEALS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={cals}
            onChange={(e) => setCals(e.target.value)}
            placeholder="kcal"
            className="input w-24 py-2"
          />
          <button disabled={busy || cals === ""} className="btn-primary px-4 py-2">
            Add
          </button>
        </form>

        {/* AI meal suggestions */}
        <div className="rounded-2xl bg-accent-soft/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">🍽️ Need an idea?</span>
            <select value={suggestMeal} onChange={(e) => setSuggestMeal(e.target.value)} className="input w-32 py-1.5 text-sm">
              <option value="">any meal</option>
              {MEALS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select value={diet} onChange={(e) => setDiet(e.target.value)} className="input w-36 py-1.5 text-sm">
              {DIETS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button onClick={suggest} disabled={suggesting} className="btn-outline px-3 py-1.5 text-sm">
              {suggesting ? "Thinking…" : "Suggest a meal"}
            </button>
          </div>

          {suggestions && (
            <div className="mt-3">
              <div className="mb-1 text-xs text-ink/50">
                For your ~{suggestions.remaining} kcal left ·{" "}
                {suggestions.source === "gemini" ? "AI" : "built-in"}
              </div>
              <ul className="space-y-1.5">
                {suggestions.meals?.map((m, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">
                        {m.name} <span className="text-ink/50">· {m.calories} kcal</span>
                      </div>
                      {m.note && <div className="truncate text-xs text-ink/40">{m.note}</div>}
                    </div>
                    <button
                      onClick={() => addEntry({ name: m.name, calories: m.calories, meal: suggestMeal })}
                      disabled={busy}
                      className="btn-good shrink-0 px-2.5 py-1 text-xs"
                    >
                      + Log
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

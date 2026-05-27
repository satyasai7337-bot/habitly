"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReportBars } from "@/components/Charts";
import { overallScore, gradeFor, habitScore, PASS_THRESHOLD } from "@/lib/stats";

export default function Reports() {
  const [period, setPeriod] = useState("week");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/reports?period=${period}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => active && setData(json))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [period]);

  const habits = data?.habits || [];
  const good = habits.filter((h) => h.type === "good");
  const bad = habits.filter((h) => h.type === "bad");
  const meds = data?.meds;
  const medList = meds?.perMed || [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Reports</h1>
          <p className="text-sm text-ink/60">
            Your habits over the last {period === "month" ? "30 days" : "7 days"}.
          </p>
        </div>
        <div className="flex rounded-full border border-line bg-white p-1">
          {["week", "month"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
                period === p ? "bg-ink text-cream" : "text-ink/60 hover:bg-sand"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-ink/50">Crunching the numbers…</p>}

      {!loading && period === "month" && habits.length > 0 && (
        <MonthlyScore habits={habits} />
      )}

      {!loading && good.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-xl font-bold text-ink">✅ Good habits</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {good.map((h) => (
              <ReportCard key={h.key} habit={h} />
            ))}
          </div>
        </section>
      )}

      {!loading && bad.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-xl font-bold text-ink">🛑 Habits to prevent</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {bad.map((h) => (
              <ReportCard key={h.key} habit={h} />
            ))}
          </div>
        </section>
      )}

      {!loading && medList.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-ink">💊 Medication adherence</h2>
            {meds.rate != null && (
              <span
                className={`pill ${meds.rate >= 80 ? "bg-good-soft text-good" : "bg-sand text-ink/60"}`}
              >
                {meds.taken}/{meds.scheduled} doses · {meds.rate}%
              </span>
            )}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {medList.map((m) => (
              <MedReportCard key={m.id} med={m} />
            ))}
          </div>
        </section>
      )}

      {!loading && habits.length === 0 && (
        <p className="text-sm text-ink/50">No habits to report yet.</p>
      )}
    </main>
  );
}

function MedReportCard({ med }) {
  const good = med.rate >= 80;
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">💊</span>
          <h3 className="font-display font-bold text-ink">
            {med.name}
            {med.dosage && <span className="ml-1 text-sm font-normal text-ink/50">· {med.dosage}</span>}
          </h3>
        </div>
        <span className={`font-display text-2xl font-extrabold ${good ? "text-good" : "text-ink"}`}>
          {med.rate}%
        </span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-sand">
        <div
          className="bar-fill h-full rounded-full"
          style={{ width: `${med.rate}%`, backgroundColor: good ? "#3f8f5c" : "#c2554d" }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Taken" value={`${med.taken}/${med.scheduled}`} accent="good" />
        <Stat label="Skipped" value={String(med.skipped)} />
        <Stat label="Missed" value={String(med.missed)} accent={med.missed > 0 ? "bad" : "muted"} />
      </div>
    </div>
  );
}

function MonthlyScore({ habits }) {
  const score = overallScore(habits);
  const grade = gradeFor(score);
  const completed = score >= PASS_THRESHOLD;
  const monthLabel = new Date().toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="card mb-10 overflow-hidden">
      <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex items-center gap-5">
          <ScoreRing score={score} tier={grade.tier} />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-ink/40">
              Monthly score · {monthLabel}
            </div>
            <div className="font-display text-3xl font-extrabold text-ink">
              {score}
              <span className="text-lg text-ink/40">/100</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-ink">
              {grade.emoji} {grade.label}
            </div>
          </div>
        </div>

        <div className="md:border-l md:border-line md:pl-6">
          {completed ? (
            <>
              <p className="text-sm text-ink/70">
                🎉 You hit your monthly target! Your certificate is ready.
              </p>
              <Link href="/certificate" className="btn-good mt-3 px-5 py-2.5">
                View your certificate →
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-ink/70">
                Reach <b>{PASS_THRESHOLD}%</b> to complete your monthly target and earn a
                certificate — you&apos;re <b>{PASS_THRESHOLD - score}%</b> away.
              </p>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-sand">
                <div className="bar-fill h-full rounded-full bg-good" style={{ width: `${score}%` }} />
              </div>
            </>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {habits.map((h) => (
              <span key={h.key} className="pill bg-sand text-ink/70">
                {h.emoji} {habitScore(h, h.stats)}%
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ScoreRing({ score, tier }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, score) / 100);
  const color =
    { platinum: "#6b7280", gold: "#b8860b", silver: "#8a8f98", bronze: "#a97142" }[tier] ||
    "#3f8f5c";
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0">
      <circle cx="42" cy="42" r={r} fill="none" stroke="#f1ede4" strokeWidth="8" />
      <circle
        cx="42"
        cy="42"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 42 42)"
      />
      <text x="42" y="48" textAnchor="middle" fill="#1c1b1a" fontSize="20" fontWeight="800">
        {score}
      </text>
    </svg>
  );
}

function ReportCard({ habit }) {
  const good = habit.type === "good";
  const s = habit.stats;
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{habit.emoji}</span>
          <h3 className="font-display font-bold text-ink">{habit.label}</h3>
        </div>
        <span className={good ? "chip-good" : "chip-bad"}>
          {good ? `target ${habit.target} ${habit.unit}` : `aim 0 ${habit.unit}`}
        </span>
      </div>

      <ReportBars
        data={habit.series}
        target={habit.target}
        direction={habit.targetDirection}
        unit={habit.unit}
      />

      <div className="mt-4 grid grid-cols-3 gap-3">
        {good ? (
          <>
            <Stat label="Total" value={`${s.total} ${habit.unit}`} />
            <Stat label="Daily avg" value={`${s.avg} ${habit.unit}`} />
            <Stat label="On target" value={`${s.metDays}/${s.days} days`} accent={s.rate >= 70 ? "good" : "muted"} />
          </>
        ) : (
          <>
            <Stat label="Total" value={`${s.total} ${habit.unit}`} accent="bad" />
            <Stat label="Daily avg" value={`${s.avg} ${habit.unit}`} />
            <Stat label="Clean days" value={`${s.cleanDays}/${s.days}`} accent="good" />
          </>
        )}
      </div>

      <p className="mt-4 rounded-2xl bg-bad-soft px-3 py-2 text-xs text-bad/90">
        ⚠️ {good ? "If you skip: " : "Why prevent: "}
        {habit.consequence}
      </p>
    </div>
  );
}

function Stat({ label, value, accent }) {
  const color =
    accent === "good" ? "text-good" : accent === "bad" ? "text-bad" : "text-ink";
  return (
    <div className="rounded-2xl bg-sand/60 px-3 py-2">
      <div className="text-xs text-ink/50">{label}</div>
      <div className={`font-display font-bold ${color}`}>{value}</div>
    </div>
  );
}

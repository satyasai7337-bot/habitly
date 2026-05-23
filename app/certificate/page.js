import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getLogsByDates } from "@/lib/store";
import { rangeForPeriod } from "@/lib/dates";
import {
  aggregateByDate,
  adherence,
  overallScore,
  gradeFor,
  habitScore,
  PASS_THRESHOLD,
} from "@/lib/stats";
import PrintButton from "@/components/PrintButton";
import Brand from "@/components/Brand";

export const dynamic = "force-dynamic";

const TIER_COLOR = {
  platinum: "#6b7280",
  gold: "#b8860b",
  silver: "#8a8f98",
  bronze: "#a97142",
  none: "#3f8f5c",
};

export default async function CertificatePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const dayKeys = rangeForPeriod("month");
  const logs = await getLogsByDates(user.id, dayKeys);

  const byHabit = {};
  for (const l of logs) (byHabit[l.habitKey] ||= []).push(l);

  const items = user.habits.map((h) => {
    const map = aggregateByDate(byHabit[h.key] || []);
    return {
      key: h.key,
      label: h.label,
      emoji: h.emoji,
      type: h.type,
      targetDirection: h.targetDirection,
      stats: adherence(h, dayKeys, map),
    };
  });

  const score = overallScore(items);
  const grade = gradeFor(score);
  const completed = score >= PASS_THRESHOLD;
  const accent = TIER_COLOR[grade.tier] || TIER_COLOR.none;

  const monthLabel = new Date().toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const issued = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const highlights = [...items]
    .sort((a, b) => habitScore(b, b.stats) - habitScore(a, a.stats))
    .slice(0, 3);

  // ---- Not earned yet ----
  if (!completed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-4">
        <div className="card max-w-md p-8 text-center">
          <div className="text-4xl">🌱</div>
          <h1 className="mt-3 font-display text-2xl font-bold text-ink">
            Almost there!
          </h1>
          <p className="mt-2 text-sm text-ink/70">
            Your monthly score is <b>{score}/100</b>. Reach{" "}
            <b>{PASS_THRESHOLD}%</b> to complete your monthly target and unlock your
            certificate — you&apos;re <b>{PASS_THRESHOLD - score}%</b> away.
          </p>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-sand">
            <div className="h-full rounded-full bg-good" style={{ width: `${score}%` }} />
          </div>
          <Link href="/reports" className="btn-primary mt-6 px-5 py-2.5">
            Back to reports
          </Link>
        </div>
      </main>
    );
  }

  // ---- Certificate ----
  return (
    <main className="min-h-screen bg-cream px-4 py-8">
      {/* Toolbar (hidden when printing) */}
      <div className="no-print mx-auto mb-6 flex max-w-3xl items-center justify-between">
        <Link href="/reports" className="btn-outline px-4 py-2">
          ← Back to reports
        </Link>
        <PrintButton />
      </div>

      {/* Certificate */}
      <div
        className="cert-print mx-auto max-w-3xl rounded-3xl bg-white p-3 shadow-soft"
        style={{ border: `2px solid ${accent}` }}
      >
        <div
          className="rounded-2xl px-8 py-12 text-center"
          style={{ border: `1px solid ${accent}55` }}
        >
          <div className="flex justify-center">
            <Brand size="lg" />
          </div>

          <div
            className="mt-6 font-display text-sm font-bold uppercase tracking-[0.3em]"
            style={{ color: accent }}
          >
            Certificate of Achievement
          </div>

          <p className="mt-8 text-sm text-ink/60">This certifies that</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold text-ink">{user.name}</h1>

          <div
            className="mx-auto mt-4 h-px w-24"
            style={{ backgroundColor: accent }}
          />

          <p className="mx-auto mt-6 max-w-xl text-ink/75">
            successfully completed their monthly habit goals for{" "}
            <b>{monthLabel}</b>, maintaining healthy routines and staying on track —
            earning a <b>{grade.label}</b> grade.
          </p>

          {/* Score seal */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <div
              className="flex h-28 w-28 flex-col items-center justify-center rounded-full text-white"
              style={{ backgroundColor: accent }}
            >
              <span className="font-display text-3xl font-extrabold leading-none">{score}</span>
              <span className="text-xs opacity-80">/ 100</span>
            </div>
            <div className="text-left">
              <div className="text-4xl">{grade.emoji}</div>
              <div className="font-display text-xl font-bold text-ink">{grade.label}</div>
              <div className="text-xs text-ink/50">Monthly grade</div>
            </div>
          </div>

          {/* Highlights */}
          <div className="mx-auto mt-8 flex max-w-lg flex-wrap justify-center gap-2">
            {highlights.map((h) => (
              <span key={h.key} className="pill bg-sand text-ink/70">
                {h.emoji} {h.label} · {habitScore(h, h.stats)}%
              </span>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-10 flex items-center justify-between border-t border-line pt-5 text-left text-xs text-ink/50">
            <div>
              <div className="font-semibold text-ink/70">Issued</div>
              <div>{issued}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-ink/70">Awarded by</div>
              <div>Habitly · Habit Tracker</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

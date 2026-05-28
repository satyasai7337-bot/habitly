import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  getLogsByDates,
  getMedications,
  getMedicationLogsByDates,
  getVitalLogs,
} from "@/lib/store";
import { lastNDays, todayKey, prettyDate } from "@/lib/dates";
import { aggregateByDate, adherence, streak } from "@/lib/stats";
import { medicationAdherence } from "@/lib/medications";
import { glucoseZone, bpZone, zoneLabel } from "@/lib/vitals";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

// Printable summary patients can show / share with their doctor.
export default async function ExportPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const today = todayKey();
  const days30 = lastNDays(30);

  // Pull everything in parallel — wrap each in catch so a missing optional
  // table (e.g. brand-new install) never breaks the page.
  const [habitLogs, medications, medLogs, glucose, bp] = await Promise.all([
    getLogsByDates(user.id, days30).catch(() => []),
    getMedications(user.id).catch(() => []),
    getMedicationLogsByDates(user.id, days30).catch(() => []),
    getVitalLogs(user.id, { type: "glucose", limit: 30 }).catch(() => []),
    getVitalLogs(user.id, { type: "bp", limit: 30 }).catch(() => []),
  ]);

  const byHabit = {};
  for (const l of habitLogs) (byHabit[l.habitKey] ||= []).push(l);
  const habits = user.habits.map((h) => {
    const map = aggregateByDate(byHabit[h.key] || []);
    return { ...h, stats: adherence(h, days30, map), streak: streak(h, days30, map) };
  });

  const now = new Date();
  const curSlot = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const medAdherence = medicationAdherence(medications, medLogs, days30, today, curSlot);

  const latestGlucose = glucose[0];
  const latestBp = bp[0];
  const plan = user.healthPlan;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8 print:px-0 print:py-0">
      {/* Action bar — hidden on print */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="btn-outline px-4 py-2">← Back</Link>
        <PrintButton />
      </div>

      <article className="cert-print rounded-3xl border border-line bg-white p-8 shadow-soft print:rounded-none print:border-0 print:shadow-none">
        <header className="mb-6 border-b border-line pb-4">
          <h1 className="font-display text-3xl font-extrabold text-ink">Health summary</h1>
          <p className="text-sm text-ink/65">
            For <b>{user.name}</b> · {today} · last 30 days
          </p>
        </header>

        <Section title="Profile">
          <Grid>
            <Fact label="Age" v={user.age ?? "—"} />
            <Fact label="Sex" v={user.sex || "—"} />
            <Fact label="Weight" v={user.bodyWeight ? `${user.bodyWeight} kg` : "—"} />
            <Fact label="Height" v={user.height ? `${user.height} cm` : "—"} />
            {user.goalWeight && <Fact label="Goal weight" v={`${user.goalWeight} kg by ${prettyDate(user.goalDate)}`} />}
          </Grid>
        </Section>

        {(latestGlucose || latestBp) && (
          <Section title="Latest vitals">
            <Grid cols={2}>
              {latestGlucose && (
                <Fact
                  label="Blood glucose"
                  v={`${latestGlucose.value} mg/dL · ${latestGlucose.context || "random"} · ${zoneLabel(glucoseZone(latestGlucose.value, latestGlucose.context))}`}
                  sub={`${latestGlucose.date}${latestGlucose.time ? ` ${latestGlucose.time}` : ""}`}
                />
              )}
              {latestBp && (
                <Fact
                  label="Blood pressure"
                  v={`${latestBp.systolic}/${latestBp.diastolic} mmHg · ${zoneLabel(bpZone(latestBp.systolic, latestBp.diastolic))}`}
                  sub={`${latestBp.date}${latestBp.time ? ` ${latestBp.time}` : ""}`}
                />
              )}
            </Grid>
            {glucose.length > 1 && (
              <MiniTable
                head={["Date", "Reading", "Context"]}
                rows={glucose.slice(0, 10).map((g) => [
                  g.date + (g.time ? ` ${g.time}` : ""),
                  `${g.value} mg/dL (${zoneLabel(glucoseZone(g.value, g.context))})`,
                  g.context || "random",
                ])}
              />
            )}
          </Section>
        )}

        {medications.length > 0 && (
          <Section title="Medications">
            <MiniTable
              head={["Name", "Dosage", "Times", "30-day adherence"]}
              rows={medications.map((m) => {
                const a = medAdherence.perMed.find((x) => x.id === m.id);
                return [
                  m.name + (m.active ? "" : " (paused)"),
                  m.dosage || "—",
                  (m.times || []).join(", ") || "—",
                  a ? `${a.taken}/${a.scheduled} (${a.rate}%)` : "—",
                ];
              })}
            />
          </Section>
        )}

        {habits.length > 0 && (
          <Section title="Habit adherence (last 30 days)">
            <MiniTable
              head={["Habit", "Target", "Total", "Avg/day", "On target", "Streak"]}
              rows={habits.map((h) => {
                const s = h.stats;
                const on =
                  h.type === "good"
                    ? `${s.metDays}/${s.days} (${s.rate}%)`
                    : `${s.cleanDays}/${s.days} clean`;
                return [
                  `${h.emoji} ${h.label}`,
                  h.type === "good" ? `${h.target} ${h.unit}` : `≤ ${h.target} ${h.unit}`,
                  `${s.total} ${h.unit}`,
                  `${s.avg} ${h.unit}`,
                  on,
                  h.streak ? `🔥 ${h.streak}d` : "—",
                ];
              })}
            />
          </Section>
        )}

        {plan && (
          <Section title="AI health-plan summary">
            {plan.summary && <p className="text-sm text-ink/80">{plan.summary}</p>}
            {plan.conditions?.length > 0 && (
              <p className="mt-2 text-sm text-ink/80">
                <b>Conditions:</b> {plan.conditions.join(", ")}
              </p>
            )}
            {plan.redFlags?.length > 0 && (
              <div className="mt-2 text-sm text-ink/80">
                <b>Flagged:</b>
                <ul className="ml-5 list-disc">
                  {plan.redFlags.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
            <p className="mt-3 text-xs italic text-ink/55">
              {plan.disclaimer || "Educational only — generated by AI from a patient-uploaded report."}
            </p>
          </Section>
        )}

        <footer className="mt-8 border-t border-line pt-4 text-xs text-ink/55">
          Generated by Habitly · This document summarizes self-tracked data and AI suggestions.
          Not a substitute for medical advice.
        </footer>
      </article>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 font-display text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}
function Grid({ children, cols = 4 }) {
  // Literal class strings so Tailwind picks them up at build.
  const cls = cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-4";
  return <div className={`grid gap-3 ${cls}`}>{children}</div>;
}
function Fact({ label, v, sub }) {
  return (
    <div className="rounded-2xl border border-line bg-sand/40 px-4 py-3">
      <div className="text-xs font-medium text-ink/55">{label}</div>
      <div className="font-display text-base font-bold text-ink">{v}</div>
      {sub && <div className="text-xs text-ink/45">{sub}</div>}
    </div>
  );
}
function MiniTable({ head, rows }) {
  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-sand/60 text-left text-xs uppercase tracking-wide text-ink/55">
          <tr>{head.map((h, i) => <th key={i} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line/60">
              {r.map((c, j) => <td key={j} className="px-3 py-2 text-ink/80">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

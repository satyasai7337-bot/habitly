import Link from "next/link";
import Brand from "@/components/Brand";
import Hero3DClient from "@/components/Hero3DClient";
import { GOOD_HABITS, BAD_HABITS } from "@/lib/habits";

// Marketing landing page. The site root (/) goes straight to login; this page
// is kept reachable at /welcome.
export default function WelcomePage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Brand size="lg" />
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-8 sm:pt-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="chip-good mb-4">🌱 Build a healthier you</span>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
              Track your habits.
              <br />
              Feel the difference.
            </h1>
            <p className="mt-4 max-w-md text-lg text-ink/70">
              Log water, food, gym, sleep, walking, study and work. Cut down on
              alcohol, smoking, vaping and drugs. Get reports, reminders and AI
              coaching — all in one calm place.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary px-6 py-3 text-base">
                Create your account
              </Link>
              <Link href="/login" className="btn-outline px-6 py-3 text-base">
                I already have one
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink/50">
              No fluff. Just the habits that move the needle.
            </p>
          </div>

          {/* Animated 3D hero */}
          <Hero3DClient />
        </div>
      </section>

      {/* Habits */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-ink">
          Everything you can track
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="card p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl">✅</span>
              <h3 className="font-display text-lg font-bold text-ink">Good habits</h3>
            </div>
            <p className="mb-4 text-sm text-ink/60">
              Daily targets + email reminders keep you on track.
            </p>
            <div className="flex flex-wrap gap-2">
              {GOOD_HABITS.map((h) => (
                <span key={h.key} className="chip-good">
                  {h.emoji} {h.label}
                </span>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl">🛑</span>
              <h3 className="font-display text-lg font-bold text-ink">Habits to prevent</h3>
            </div>
            <p className="mb-4 text-sm text-ink/60">
              Track usage, see the trend, and watch it drop. No nagging.
            </p>
            <div className="flex flex-wrap gap-2">
              {BAD_HABITS.map((h) => (
                <span key={h.key} className="chip-bad">
                  {h.emoji} {h.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Feature emoji="📊" title="Reports & graphs" body="Weekly and monthly breakdowns with clean charts." />
          <Feature emoji="📧" title="Email reminders" body="Gentle nudges for your good habits, on your schedule." />
          <Feature emoji="🤖" title="AI coaching" body="Personalized tips powered by Google Gemini." />
          <Feature emoji="🎯" title="Daily targets" body="6 L water, 3 meals, 8 h sleep — set and hit your goals." />
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-4 py-10 text-sm text-ink/50">
        <div className="flex items-center justify-between border-t border-line pt-6">
          <Brand />
          <span>Built to help you stay healthy.</span>
        </div>
      </footer>
    </main>
  );
}

function Feature({ emoji, title, body }) {
  return (
    <div className="card p-5">
      <div className="text-2xl">{emoji}</div>
      <h3 className="mt-3 font-display font-bold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink/60">{body}</p>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink/60">Today</span>
        <span className="chip-good">on track 🔥</span>
      </div>
      <div className="space-y-3">
        <PreviewRow emoji="💧" label="Water" now="4.5 / 6 L" pct={75} color="bg-good" />
        <PreviewRow emoji="😴" label="Sleep" now="7 / 8 hrs" pct={88} color="bg-good" />
        <PreviewRow emoji="🚶" label="Walking" now="6k / 8k steps" pct={75} color="bg-good" />
        <PreviewRow emoji="🚬" label="Smoking" now="1 today · aim 0" pct={20} color="bg-bad" />
      </div>
      <div className="mt-4 rounded-2xl bg-accent-soft p-3 text-sm text-accent">
        🤖 “Nice hydration today — one more glass hits your goal.”
      </div>
    </div>
  );
}

function PreviewRow({ emoji, label, now, pct, color }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-ink">
          {emoji} {label}
        </span>
        <span className="text-ink/50">{now}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-sand">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

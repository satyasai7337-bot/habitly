"use client";

import Link from "next/link";
import Brand from "@/components/Brand";

export default function Topbar({ name, avatar }) {
  const first = (name || "there").split(" ")[0];
  const initial = (name || "U").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="md:hidden">
          <Brand />
        </Link>

        <div className="flex flex-1 items-center gap-2 rounded-3xl border border-white/70 bg-white/70 px-4 py-2.5 shadow-soft backdrop-blur">
          <span className="text-lg">☀️</span>
          <p className="truncate text-sm font-medium text-ink/70">
            Hey {first} — small steps today, a healthier you later.
          </p>
        </div>

        <span
          className="hidden h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/70 text-lg shadow-soft sm:flex"
          aria-hidden
        >
          🔔
        </span>
        {avatar ? (
          <img src={avatar} alt="" className="h-11 w-11 rounded-full object-cover shadow-soft" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-sm font-bold text-white shadow-soft">
            {initial}
          </div>
        )}
      </div>

      {/* Mobile nav lives in the BottomNav now; nothing extra here. */}
    </header>
  );
}

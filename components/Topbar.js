"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Brand from "@/components/Brand";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vitals", label: "Vitals" },
  { href: "/reports", label: "Reports" },
  { href: "/export", label: "Summary" },
  { href: "/settings", label: "Settings" },
];

export default function Topbar({ name, avatar }) {
  const pathname = usePathname();
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

      {/* Mobile nav (sidebar is hidden below md) */}
      <nav className="mt-3 flex gap-2 overflow-x-auto md:hidden">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                active ? "bg-accent text-white" : "bg-white/70 text-ink/70"
              }`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

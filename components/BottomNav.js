"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/vitals", label: "Vitals", icon: "🩸" },
  { href: "/reports", label: "Reports", icon: "📈" },
  { href: "/export", label: "Summary", icon: "🩺" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

// Native-app-style bottom navigation, mobile only (hidden on md+).
// Uses safe-area-inset-bottom so it sits above iPhone home indicator.
export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/70 bg-white/85 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 py-1.5">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[10px] font-semibold transition ${
                active ? "text-accent" : "text-ink/60 hover:text-ink"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className="text-xl leading-none">{n.icon}</span>
              <span className="truncate">{n.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

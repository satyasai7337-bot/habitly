"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import AvatarUpload from "@/components/AvatarUpload";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/reports", label: "Reports", icon: "📈" },
  { href: "/certificate", label: "Certificate", icon: "🏆" },
];

export default function Sidebar({ name, avatar }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/50 bg-white/40 px-4 py-6 backdrop-blur-md md:flex">
      <Link href="/dashboard" className="px-2">
        <Brand />
      </Link>

      <nav className="mt-8 flex flex-col gap-1.5">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-accent text-white shadow-soft"
                  : "text-ink/70 hover:bg-white/70"
              }`}
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-3xl bg-gradient-to-br from-accent to-[#c4a3f7] p-4 text-white shadow-soft">
          <div className="text-sm font-bold">Keep it up! 🌱</div>
          <p className="mt-1 text-xs text-white/85">
            Check your weekly report and earn your certificate.
          </p>
          <Link
            href="/reports"
            className="mt-3 inline-block rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-accent"
          >
            View report
          </Link>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/60 px-3 py-2">
          <AvatarUpload name={name} avatar={avatar} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">{name || "You"}</div>
            <div className="text-xs text-ink/45">Tap photo to change</div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="rounded-full px-2 py-1 text-ink/40 transition hover:text-bad"
            aria-label="Log out"
          >
            ⎋
          </button>
        </div>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Brand from "@/components/Brand";

export default function TopNav({ name }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/reports", label: "Reports" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center">
          <Brand />
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  active ? "bg-ink text-cream" : "text-ink/70 hover:bg-sand"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {name && (
            <span className="hidden text-sm font-medium text-ink/60 sm:block">
              Hi, {name.split(" ")[0]}
            </span>
          )}
          <button onClick={logout} className="btn-outline px-4 py-1.5">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function update(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not log in.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/">
            <Brand size="lg" />
          </Link>
          <h1 className="mt-6 font-display text-2xl font-bold text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-ink/60">Log in to keep your streak going.</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          {error && (
            <p className="rounded-2xl bg-bad-soft px-4 py-2.5 text-sm text-bad">{error}</p>
          )}
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={update}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                className="input pr-16"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={update}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-sm font-semibold text-ink/50 hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <button className="btn-primary w-full py-3" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink/60">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-good hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

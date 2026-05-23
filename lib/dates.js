// Date helpers. We key daily logs by a local "YYYY-MM-DD" string so that
// grouping by day/week/month is timezone-stable on a single machine.

export function dateKey(d = new Date()) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey() {
  return dateKey(new Date());
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Returns array of "YYYY-MM-DD" keys for the last `n` days ending today (oldest first).
export function lastNDays(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    out.push(dateKey(addDays(now, -i)));
  }
  return out;
}

export function rangeForPeriod(period) {
  // period: "week" (last 7 days) or "month" (last 30 days)
  const days = period === "month" ? 30 : 7;
  return lastNDays(days);
}

export function prettyDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

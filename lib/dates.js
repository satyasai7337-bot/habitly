// Date helpers. We key daily logs by a local "YYYY-MM-DD" string so that
// grouping by day/week/month is timezone-stable on a single machine.

export function dateKey(d = new Date()) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// "YYYY-MM-DD" for "today" in the given IANA timezone (e.g. "Asia/Kolkata").
// Falls back to the server's local day if the tz is unknown.
export function todayKey(tz) {
  if (!tz) return dateKey(new Date());
  try {
    // en-CA gives ISO "YYYY-MM-DD" output.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return dateKey(new Date());
  }
}

// Current "HH:MM" in the given timezone (24-hour).
export function currentSlot(tz) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz || undefined,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value || "00";
    return `${get("hour")}:${get("minute")}`;
  } catch {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// `n` consecutive day keys ending on `endKey` (oldest first). If `endKey` is
// omitted, ends on today in the optional tz.
export function lastNDays(n, tz) {
  const endKey = todayKey(tz);
  const [y, m, d] = endKey.split("-").map(Number);
  // UTC arithmetic so DST doesn't shift the count.
  const endDays = Math.round(Date.UTC(y, m - 1, d) / 86400000);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date((endDays - i) * 86400000);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    out.push(`${yy}-${mm}-${dd}`);
  }
  return out;
}

export function rangeForPeriod(period, tz) {
  // period: "week" (last 7 days) or "month" (last 30 days)
  const days = period === "month" ? 30 : 7;
  return lastNDays(days, tz);
}

export function prettyDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { setMedicationDose, clearMedicationDose } from "@/lib/store";
import { todayKey } from "@/lib/dates";
import { TIME_RE, DATE_RE } from "@/lib/medications";

export const runtime = "nodejs";

// Mark a dose taken/skipped (or clear it back to pending).
// Body: { medicationId, slot, status: "taken" | "skipped" | "pending", date? }
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { medicationId, slot, status, date } = await req.json();
    if (!medicationId || !TIME_RE.test(String(slot))) {
      return NextResponse.json({ error: "Missing medication or invalid time." }, { status: 400 });
    }
    const day = DATE_RE.test(String(date)) ? date : todayKey(user.timezone);

    if (status === "pending") {
      await clearMedicationDose({ userId: user.id, medicationId, slot, date: day });
    } else {
      const s = status === "skipped" ? "skipped" : "taken";
      await setMedicationDose({ userId: user.id, medicationId, slot, date: day, status: s });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("medication log error:", err);
    return NextResponse.json({ error: "Could not record dose." }, { status: 500 });
  }
}

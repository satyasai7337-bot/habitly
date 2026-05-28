import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createVitalLog, getVitalLogs, deleteVitalLog } from "@/lib/store";
import { todayKey } from "@/lib/dates";
import { TYPES, GLUCOSE_CONTEXTS } from "@/lib/vitals";

export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// GET: recent vital logs, grouped by type for the UI.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const all = await getVitalLogs(user.id, { limit: 200 });
  const byType = { glucose: [], bp: [], mood: [] };
  for (const v of all) (byType[v.type] ||= []).push(v);
  return NextResponse.json({ vitals: byType, today: todayKey(user.timezone) });
}

// POST: add a vital reading.
// Body: { type, value?, systolic?, diastolic?, context?, time?, date?, note? }
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    if (!TYPES.includes(body.type)) {
      return NextResponse.json({ error: "Unknown vital type." }, { status: 400 });
    }
    const date = DATE_RE.test(String(body.date)) ? body.date : todayKey(user.timezone);
    const time = TIME_RE.test(String(body.time)) ? body.time : "";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 280) : "";

    let payload = { userId: user.id, type: body.type, date, time, note };

    if (body.type === "glucose") {
      const v = Number(body.value);
      if (!Number.isFinite(v) || v < 20 || v > 600) {
        return NextResponse.json({ error: "Enter glucose between 20 and 600 mg/dL." }, { status: 400 });
      }
      payload.value = Math.round(v);
      payload.context = GLUCOSE_CONTEXTS.includes(body.context) ? body.context : "random";
    } else if (body.type === "bp") {
      const s = Number(body.systolic);
      const d = Number(body.diastolic);
      if (!Number.isFinite(s) || s < 60 || s > 260 || !Number.isFinite(d) || d < 30 || d > 180) {
        return NextResponse.json({ error: "Enter realistic BP values." }, { status: 400 });
      }
      payload.systolic = Math.round(s);
      payload.diastolic = Math.round(d);
    } else if (body.type === "mood") {
      const m = Number(body.value);
      if (!Number.isFinite(m) || m < 1 || m > 5) {
        return NextResponse.json({ error: "Mood is 1–5." }, { status: 400 });
      }
      payload.value = Math.round(m);
    }

    const entry = await createVitalLog(payload);
    return NextResponse.json({ entry });
  } catch (err) {
    console.error("vitals POST error:", err?.message || err);
    return NextResponse.json({ error: "Could not log reading." }, { status: 500 });
  }
}

// DELETE: /api/vitals?id=<uuid>
export async function DELETE(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  try {
    await deleteVitalLog(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("vitals DELETE error:", err?.message || err);
    return NextResponse.json({ error: "Could not delete reading." }, { status: 500 });
  }
}

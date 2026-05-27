import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  getMedicationLogsForDate,
} from "@/lib/store";
import { todayKey } from "@/lib/dates";
import { buildSchedule, normalizeTimes, DATE_RE } from "@/lib/medications";

export const runtime = "nodejs";

function currentSlot() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function str(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function dateOrNull(v) {
  return typeof v === "string" && DATE_RE.test(v) ? v : null;
}

// List medications + today's dose schedule.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const today = todayKey();
  const [meds, logs] = await Promise.all([
    getMedications(user.id),
    getMedicationLogsForDate(user.id, today),
  ]);

  return NextResponse.json({
    medications: meds,
    schedule: buildSchedule(meds, logs, today),
    date: today,
    serverSlot: currentSlot(),
  });
}

// Add a medication.
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const name = str(body.name, 120);
    if (!name) return NextResponse.json({ error: "Medication name is required." }, { status: 400 });

    const med = await createMedication(user.id, {
      name,
      dosage: str(body.dosage, 60),
      times: normalizeTimes(body.times),
      startDate: dateOrNull(body.startDate),
      endDate: dateOrNull(body.endDate),
      notes: str(body.notes, 280),
    });
    return NextResponse.json({ medication: med });
  } catch (err) {
    console.error("medications POST error:", err);
    return NextResponse.json({ error: "Could not add medication." }, { status: 500 });
  }
}

// Edit a medication (only the fields provided).
export async function PATCH(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing medication id." }, { status: 400 });

    const fields = {};
    if (body.name !== undefined) {
      const name = str(body.name, 120);
      if (!name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
      fields.name = name;
    }
    if (body.dosage !== undefined) fields.dosage = str(body.dosage, 60);
    if (body.times !== undefined) fields.times = normalizeTimes(body.times);
    if (body.startDate !== undefined) fields.startDate = dateOrNull(body.startDate);
    if (body.endDate !== undefined) fields.endDate = dateOrNull(body.endDate);
    if (body.notes !== undefined) fields.notes = str(body.notes, 280);
    if (body.active !== undefined) fields.active = !!body.active;

    const med = await updateMedication(user.id, body.id, fields);
    if (!med) return NextResponse.json({ error: "Medication not found." }, { status: 404 });
    return NextResponse.json({ medication: med });
  } catch (err) {
    console.error("medications PATCH error:", err);
    return NextResponse.json({ error: "Could not update medication." }, { status: 500 });
  }
}

// Delete a medication: /api/medications?id=<uuid>
export async function DELETE(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing medication id." }, { status: 400 });

  try {
    await deleteMedication(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("medications DELETE error:", err);
    return NextResponse.json({ error: "Could not delete medication." }, { status: 500 });
  }
}

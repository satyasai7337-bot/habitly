import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { setUserHealthPlan, insertHealthPlanHistory } from "@/lib/store";
import { analyzeMedicalReport } from "@/lib/ai";

export const runtime = "nodejs";

const ALLOWED = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Return the stored health plan (if any).
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json({ plan: user.healthPlan || null });
}

// Upload a medical report (PDF or image), analyze it with the AI, persist the
// structured plan, and return it. The raw file is NEVER stored.
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let form;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart upload." }, { status: 400 });
  }
  const file = form.get("report");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Attach a 'report' file." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Upload a PDF or image (PNG/JPEG/WEBP)." },
      { status: 415 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (max 8 MB)." }, { status: 413 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await analyzeMedicalReport({
      fileBuffer: buf,
      mimeType: file.type,
      profile: { age: user.age, sex: user.sex, bodyWeight: user.bodyWeight, height: user.height },
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 502 });

    await setUserHealthPlan(user.id, result.plan);
    // Append to history for lab trends. Don't fail the request if history insert
    // throws (e.g. table not migrated yet).
    try {
      await insertHealthPlanHistory({
        userId: user.id,
        plan: result.plan,
        labs: result.plan.labs || null,
        reportDate: result.plan.reportDate || null,
      });
    } catch (e) {
      console.error("health_plan_history insert skipped:", e?.message || e);
    }
    return NextResponse.json({ plan: result.plan });
  } catch (err) {
    console.error("health-plan POST error:", err?.message || err);
    return NextResponse.json({ error: "Could not analyze the report." }, { status: 500 });
  }
}

// Remove the stored plan.
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    await setUserHealthPlan(user.id, null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("health-plan DELETE error:", err?.message || err);
    return NextResponse.json({ error: "Could not clear plan." }, { status: 500 });
  }
}

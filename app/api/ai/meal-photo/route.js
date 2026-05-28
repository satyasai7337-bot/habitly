import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { estimateMealFromPhoto } from "@/lib/ai";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

// Upload a meal photo -> AI returns { name, calories, confidence, note }.
// The user reviews and confirms before logging (photo is never stored).
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let form;
  try { form = await req.formData(); } catch {
    return NextResponse.json({ error: "Expected a multipart upload." }, { status: 400 });
  }
  const file = form.get("photo");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Attach a 'photo' file." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Upload a JPG/PNG/WEBP image." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo too large (max 6 MB)." }, { status: 413 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await estimateMealFromPhoto({ fileBuffer: buf, mimeType: file.type });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 502 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("meal-photo POST error:", err?.message || err);
    return NextResponse.json({ error: "Could not analyze the photo." }, { status: 500 });
  }
}

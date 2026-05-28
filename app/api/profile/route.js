import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser, sanitizeUser, cookieOptions, COOKIE_NAME } from "@/lib/auth";
import { updateUserProfile, deleteUser } from "@/lib/store";

export const runtime = "nodejs";

function num(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function str(v, max = 120) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// PATCH: update editable profile fields.
export async function PATCH(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const fields = {};
    if (body.name !== undefined) {
      const name = str(body.name, 120);
      if (!name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
      fields.name = name;
    }
    if (body.phone !== undefined) fields.phone = str(body.phone, 30);
    if (body.age !== undefined) fields.age = num(body.age);
    if (body.bodyWeight !== undefined) fields.bodyWeight = num(body.bodyWeight);
    if (body.height !== undefined) fields.height = num(body.height);
    if (body.sex !== undefined) {
      fields.sex = ["male", "female", "other"].includes(body.sex) ? body.sex : null;
    }
    if (body.timezone !== undefined) {
      const tz = String(body.timezone || "UTC");
      try {
        new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
        fields.timezone = tz;
      } catch {
        return NextResponse.json({ error: "Unknown timezone." }, { status: 400 });
      }
    }

    const updated = await updateUserProfile(user.id, fields);
    return NextResponse.json({ user: sanitizeUser(updated) });
  } catch (err) {
    console.error("profile PATCH error:", err);
    return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
  }
}

// DELETE: delete the user's account (cascades to logs, meds, etc.).
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await deleteUser(user.id);
    cookies().set(COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("profile DELETE error:", err);
    return NextResponse.json({ error: "Could not delete account." }, { status: 500 });
  }
}

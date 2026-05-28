import { NextResponse } from "next/server";
import { getSessionUser, hashPassword, comparePassword } from "@/lib/auth";
import { getUserPasswordHash, updateUserPasswordHash } from "@/lib/store";

export const runtime = "nodejs";

// POST: change password. Body: { currentPassword, newPassword }
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await req.json();
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
    }
    const hash = await getUserPasswordHash(user.id);
    if (!hash) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    const ok = await comparePassword(String(currentPassword || ""), hash);
    if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

    const newHash = await hashPassword(newPassword);
    await updateUserPasswordHash(user.id, newHash);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("password POST error:", err);
    return NextResponse.json({ error: "Could not change password." }, { status: 500 });
  }
}

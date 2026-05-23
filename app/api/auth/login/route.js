import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/store";
import { comparePassword, signToken, cookieOptions, COOKIE_NAME, sanitizeUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await getUserByEmail(String(email).toLowerCase());
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = signToken(user.id);
    const res = NextResponse.json({ user: sanitizeUser(user) });
    res.cookies.set(COOKIE_NAME, token, cookieOptions);
    return res;
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json({ error: "Could not log in." }, { status: 500 });
  }
}

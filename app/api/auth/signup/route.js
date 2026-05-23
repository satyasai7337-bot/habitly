import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { hashPassword, signToken, cookieOptions, COOKIE_NAME, sanitizeUser } from "@/lib/auth";
import { snapshotHabit } from "@/lib/habits";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      name,
      phone,
      email,
      password,
      bodyWeight,
      height,
      age,
      sex,
      habits, // array of habit keys
      reminders, // optional { habitKey: ["HH:MM", ...] } for good habits
    } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required." },
        { status: 400 }
      );
    }
    if (String(password).length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }
    if (!Array.isArray(habits) || habits.length === 0) {
      return NextResponse.json(
        { error: "Pick at least one habit to track." },
        { status: 400 }
      );
    }

    await connectDB();

    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const habitConfigs = habits
      .map((k) => snapshotHabit(k))
      .filter(Boolean);

    // Apply user-entered reminder times for good habits (override defaults).
    const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (reminders && typeof reminders === "object") {
      for (const cfg of habitConfigs) {
        if (cfg.type === "good" && Array.isArray(reminders[cfg.key])) {
          cfg.reminderTimes = [
            ...new Set(reminders[cfg.key].filter((t) => TIME_RE.test(t))),
          ].sort();
        }
      }
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name,
      phone,
      email: String(email).toLowerCase(),
      passwordHash,
      bodyWeight: numOrNull(bodyWeight),
      height: numOrNull(height),
      age: numOrNull(age),
      sex: ["male", "female", "other"].includes(sex) ? sex : undefined,
      habits: habitConfigs,
    });

    const token = signToken(user._id);
    const res = NextResponse.json({ user: sanitizeUser(user.toObject()) });
    res.cookies.set(COOKIE_NAME, token, cookieOptions);
    return res;
  } catch (err) {
    console.error("signup error:", err);
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}

function numOrNull(v) {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

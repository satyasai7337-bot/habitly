import { NextResponse } from "next/server";
import { getUserByEmail, createUser } from "@/lib/store";
import { hashPassword, signToken, cookieOptions, COOKIE_NAME, sanitizeUser } from "@/lib/auth";
import { snapshotHabit } from "@/lib/habits";
import { predictTarget } from "@/lib/ml/targetModel";

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
      tz, // IANA timezone from the browser (e.g. "Asia/Kolkata")
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

    const exists = await getUserByEmail(String(email).toLowerCase());
    if (exists) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const habitConfigs = habits.map((k) => snapshotHabit(k)).filter(Boolean);

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

    const bodyWeightNum = numOrNull(bodyWeight);
    const heightNum = numOrNull(height);
    const ageNum = numOrNull(age);
    const sexVal = ["male", "female", "other"].includes(sex) ? sex : null;

    // Personalize good-habit targets from the profile via the trained models.
    // Only when the full profile is present, otherwise keep catalog defaults.
    if (bodyWeightNum != null && heightNum != null && ageNum != null && sexVal) {
      const profile = { age: ageNum, sex: sexVal, bodyWeight: bodyWeightNum, height: heightNum };
      for (const cfg of habitConfigs) {
        const t = predictTarget(profile, cfg.key); // null for unmodeled habits
        if (t != null) cfg.target = t;
      }
    }

    const passwordHash = await hashPassword(password);

    // Validate the timezone string by attempting to format with it.
    let timezone = "UTC";
    if (typeof tz === "string" && tz.length <= 64) {
      try { new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date()); timezone = tz; } catch {}
    }

    const user = await createUser({
      name,
      phone,
      email: String(email).toLowerCase(),
      passwordHash,
      bodyWeight: bodyWeightNum,
      height: heightNum,
      age: ageNum,
      sex: sexVal,
      timezone,
      habits: habitConfigs,
    });

    const token = signToken(user.id);
    const res = NextResponse.json({ user: sanitizeUser(user) });
    res.cookies.set(COOKIE_NAME, token, cookieOptions);
    return res;
  } catch (err) {
    console.error("signup error:", err);
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}

function numOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

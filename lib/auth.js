import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "dev_insecure_secret_change_me";
export const COOKIE_NAME = "ht_token";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(userId) {
  return jwt.sign({ uid: String(userId) }, JWT_SECRET, { expiresIn: MAX_AGE });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  // Only mark Secure when explicitly served over HTTPS. Defaulting to true in
  // production would break login over plain http://localhost. Set
  // COOKIE_SECURE=true in your env when deploying behind HTTPS.
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
  maxAge: MAX_AGE,
};

// Returns a plain (sanitized) user object for the logged-in user, or null.
export async function getSessionUser() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload?.uid) return null;

  await connectDB();
  const user = await User.findById(payload.uid).lean();
  if (!user) return null;

  return sanitizeUser(user);
}

export function sanitizeUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    bodyWeight: user.bodyWeight ?? null,
    height: user.height ?? null,
    age: user.age ?? null,
    sex: user.sex || null,
    habits: (user.habits || []).map((h) => ({
      key: h.key,
      label: h.label,
      type: h.type,
      emoji: h.emoji,
      unit: h.unit,
      target: h.target,
      targetDirection: h.targetDirection,
      step: h.step,
      consequence: h.consequence,
      reminderTimes: h.reminderTimes || [],
      reminderEnabled: h.reminderEnabled !== false,
    })),
  };
}

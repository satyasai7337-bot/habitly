import { getSupabase } from "@/lib/supabase";

// Data-access layer. Keeps all Supabase/Postgres specifics in one place and
// exposes camelCase objects to the rest of the app (mirroring the old models).

function rowToUser(r) {
  if (!r) return null;
  return {
    id: r.id,
    _id: r.id, // back-compat with sanitizeUser
    name: r.name,
    phone: r.phone,
    email: r.email,
    passwordHash: r.password_hash,
    bodyWeight: r.body_weight,
    height: r.height,
    age: r.age,
    sex: r.sex,
    habits: r.habits || [],
    createdAt: r.created_at,
  };
}

// ---------- Users ----------
export async function getUserByEmail(email) {
  const { data, error } = await getSupabase()
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return rowToUser(data);
}

export async function getUserById(id) {
  const { data, error } = await getSupabase()
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return rowToUser(data);
}

export async function createUser(u) {
  const row = {
    name: u.name,
    phone: u.phone ?? null,
    email: u.email,
    password_hash: u.passwordHash,
    body_weight: u.bodyWeight ?? null,
    height: u.height ?? null,
    age: u.age ?? null,
    sex: u.sex ?? null,
    habits: u.habits || [],
  };
  const { data, error } = await getSupabase()
    .from("users")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return rowToUser(data);
}

export async function updateUserHabits(id, habits) {
  const { data, error } = await getSupabase()
    .from("users")
    .update({ habits })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToUser(data);
}

// ---------- Habit logs ----------
export async function createLog({ userId, habitKey, date, value, note }) {
  const { error } = await getSupabase().from("habit_logs").insert({
    user_id: userId,
    habit_key: habitKey,
    date,
    value,
    note: note || "",
  });
  if (error) throw error;
}

export async function sumForHabitDate(userId, habitKey, date) {
  const { data, error } = await getSupabase()
    .from("habit_logs")
    .select("value")
    .eq("user_id", userId)
    .eq("habit_key", habitKey)
    .eq("date", date);
  if (error) throw error;
  return (data || []).reduce((s, r) => s + Number(r.value || 0), 0);
}

// Returns logs for a set of date keys as [{habitKey, date, value}].
export async function getLogsByDates(userId, dates) {
  const { data, error } = await getSupabase()
    .from("habit_logs")
    .select("habit_key,date,value")
    .eq("user_id", userId)
    .in("date", dates);
  if (error) throw error;
  return (data || []).map((r) => ({
    habitKey: r.habit_key,
    date: r.date,
    value: Number(r.value),
  }));
}

export async function getRecentLogs(userId, habitKey, limit = 50) {
  let q = getSupabase()
    .from("habit_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (habitKey) q = q.eq("habit_key", habitKey);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    habitKey: r.habit_key,
    date: r.date,
    value: Number(r.value),
    note: r.note,
    createdAt: r.created_at,
  }));
}

// ---------- Reminder logs ----------
export async function getReminderLogsForDate(userId, date) {
  const { data, error } = await getSupabase()
    .from("reminder_logs")
    .select("habit_key,slot")
    .eq("user_id", userId)
    .eq("date", date);
  if (error) throw error;
  return (data || []).map((r) => ({ habitKey: r.habit_key, slot: r.slot }));
}

export async function insertReminderLogs(rows) {
  if (!rows.length) return;
  const mapped = rows.map((r) => ({
    user_id: r.user,
    habit_key: r.habitKey,
    slot: r.slot,
    date: r.date,
    channel: r.channel || "app",
    status: r.status || "shown",
    sent_at: new Date().toISOString(),
  }));
  const { error } = await getSupabase()
    .from("reminder_logs")
    .upsert(mapped, { onConflict: "user_id,habit_key,slot,date", ignoreDuplicates: true });
  if (error) throw error;
}

// Count today's reminders per habit -> { habitKey: n }
export async function countRemindersByHabitForDate(userId, date) {
  const { data, error } = await getSupabase()
    .from("reminder_logs")
    .select("habit_key")
    .eq("user_id", userId)
    .eq("date", date);
  if (error) throw error;
  const counts = {};
  for (const r of data || []) counts[r.habit_key] = (counts[r.habit_key] || 0) + 1;
  return counts;
}

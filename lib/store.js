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
    goalWeight: r.goal_weight ?? null,
    goalDate: r.goal_date ?? null,
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

export async function updateUserGoal(id, { goalWeight, goalDate }) {
  const { data, error } = await getSupabase()
    .from("users")
    .update({ goal_weight: goalWeight, goal_date: goalDate })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToUser(data);
}

export async function setUserBodyWeight(id, weight) {
  const { error } = await getSupabase()
    .from("users")
    .update({ body_weight: weight })
    .eq("id", id);
  if (error) throw error;
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

// ---------- Medications ----------
function rowToMed(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    dosage: r.dosage || "",
    times: r.times || [],
    startDate: r.start_date || null,
    endDate: r.end_date || null,
    notes: r.notes || "",
    active: r.active !== false,
    createdAt: r.created_at,
  };
}

export async function getMedications(userId) {
  const { data, error } = await getSupabase()
    .from("medications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToMed);
}

export async function createMedication(userId, m) {
  const { data, error } = await getSupabase()
    .from("medications")
    .insert({
      user_id: userId,
      name: m.name,
      dosage: m.dosage ?? "",
      times: m.times || [],
      start_date: m.startDate ?? null,
      end_date: m.endDate ?? null,
      notes: m.notes ?? "",
      active: m.active ?? true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToMed(data);
}

// Patch only the provided fields; scoped to the owner so users can't touch
// someone else's rows.
export async function updateMedication(userId, id, fields) {
  const patch = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.dosage !== undefined) patch.dosage = fields.dosage;
  if (fields.times !== undefined) patch.times = fields.times;
  if (fields.startDate !== undefined) patch.start_date = fields.startDate;
  if (fields.endDate !== undefined) patch.end_date = fields.endDate;
  if (fields.notes !== undefined) patch.notes = fields.notes;
  if (fields.active !== undefined) patch.active = fields.active;

  const { data, error } = await getSupabase()
    .from("medications")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return rowToMed(data);
}

export async function deleteMedication(userId, id) {
  const { error } = await getSupabase()
    .from("medications")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

export async function getMedicationLogsForDate(userId, date) {
  const { data, error } = await getSupabase()
    .from("medication_logs")
    .select("medication_id,slot,status")
    .eq("user_id", userId)
    .eq("date", date);
  if (error) throw error;
  return (data || []).map((r) => ({
    medicationId: r.medication_id,
    slot: r.slot,
    status: r.status,
  }));
}

// Dose logs across a set of day keys (for adherence reporting).
export async function getMedicationLogsByDates(userId, dates) {
  const { data, error } = await getSupabase()
    .from("medication_logs")
    .select("medication_id,date,slot,status")
    .eq("user_id", userId)
    .in("date", dates);
  if (error) throw error;
  return (data || []).map((r) => ({
    medicationId: r.medication_id,
    date: r.date,
    slot: r.slot,
    status: r.status,
  }));
}

// Record (or change) a dose's status for a day. Upserts on the unique key.
export async function setMedicationDose({ userId, medicationId, slot, date, status }) {
  const { error } = await getSupabase()
    .from("medication_logs")
    .upsert(
      {
        user_id: userId,
        medication_id: medicationId,
        slot,
        date,
        status,
        taken_at: new Date().toISOString(),
      },
      { onConflict: "user_id,medication_id,slot,date" }
    );
  if (error) throw error;
}

// Revert a dose back to "pending" by removing its log row.
export async function clearMedicationDose({ userId, medicationId, slot, date }) {
  const { error } = await getSupabase()
    .from("medication_logs")
    .delete()
    .eq("user_id", userId)
    .eq("medication_id", medicationId)
    .eq("slot", slot)
    .eq("date", date);
  if (error) throw error;
}

// ---------- Weight logs ----------
export async function getWeightLogs(userId) {
  const { data, error } = await getSupabase()
    .from("weight_logs")
    .select("date,weight")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({ date: r.date, weight: Number(r.weight) }));
}

// One entry per day; logging again the same day overwrites it.
export async function upsertWeightLog({ userId, date, weight }) {
  const { error } = await getSupabase()
    .from("weight_logs")
    .upsert(
      { user_id: userId, date, weight, created_at: new Date().toISOString() },
      { onConflict: "user_id,date" }
    );
  if (error) throw error;
}

export async function deleteWeightLog(userId, date) {
  const { error } = await getSupabase()
    .from("weight_logs")
    .delete()
    .eq("user_id", userId)
    .eq("date", date);
  if (error) throw error;
}

// ---------- Food / calorie logs ----------
export async function getFoodLogsForDate(userId, date) {
  const { data, error } = await getSupabase()
    .from("food_logs")
    .select("id,name,calories,meal,created_at")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    name: r.name || "",
    calories: Number(r.calories),
    meal: r.meal || "",
  }));
}

export async function createFoodLog({ userId, date, name, calories, meal }) {
  const { data, error } = await getSupabase()
    .from("food_logs")
    .insert({ user_id: userId, date, name: name || "", calories, meal: meal || "" })
    .select("id,name,calories,meal")
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name || "", calories: Number(data.calories), meal: data.meal || "" };
}

export async function deleteFoodLog(userId, id) {
  const { error } = await getSupabase()
    .from("food_logs")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
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

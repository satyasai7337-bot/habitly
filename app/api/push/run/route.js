import { NextResponse } from "next/server";
import {
  getAllPushSubscriptions,
  getUserById,
  getMedications,
  getMedicationLogsForDate,
  claimPushTag,
} from "@/lib/store";
import { buildSchedule } from "@/lib/medications";
import { todayKey, currentSlot } from "@/lib/dates";
import { sendToAll, pushConfigured } from "@/lib/push";

export const runtime = "nodejs";

const WINDOW_MIN = 12; // push a reminder if its time fell within the last N minutes

// Scheduler: scan due good-habit reminders + medication doses for every user
// with a push subscription and send notifications. Guarded by CRON_SECRET.
// Intended to be hit every few minutes by a cron job.
export async function POST(req) {
  const secret =
    req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }
  if (!pushConfigured()) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }

  const byUser = await getAllPushSubscriptions();
  let users = 0;
  let sent = 0;

  for (const [userId, subs] of Object.entries(byUser)) {
    const user = await getUserById(userId);
    if (!user) continue;
    users++;

    // Compute today/now in *this user's* timezone so push fires when their
    // 09:00 lands locally, not when the server's 09:00 does.
    const today = todayKey(user.timezone);
    const slotNow = currentSlot(user.timezone);
    const [nh, nm] = slotNow.split(":").map(Number);
    const curMin = nh * 60 + nm;
    const freshlyDue = (slot) => {
      const [h, m] = slot.split(":").map(Number);
      const diff = curMin - (h * 60 + m);
      return diff >= 0 && diff <= WINDOW_MIN;
    };

    // Good-habit reminders.
    for (const h of user.habits || []) {
      if (h.type !== "good" || h.reminderEnabled === false) continue;
      for (const slot of h.reminderTimes || []) {
        if (!freshlyDue(slot)) continue;
        if (!(await claimPushTag(userId, `habit:${h.key}:${slot}`, today))) continue;
        sent += await sendToAll(subs, {
          title: `${h.emoji || "⏰"} ${h.label}`,
          body: `Time for your ${String(h.label).toLowerCase()} — log it in Habitly.`,
          url: "/dashboard",
          tag: `habit-${h.key}-${slot}`,
        });
      }
    }

    // Medication doses.
    try {
      const [meds, logs] = await Promise.all([
        getMedications(userId),
        getMedicationLogsForDate(userId, today),
      ]);
      for (const d of buildSchedule(meds, logs, today)) {
        if (d.status !== "pending" || !freshlyDue(d.slot)) continue;
        if (!(await claimPushTag(userId, `med:${d.medicationId}:${d.slot}`, today))) continue;
        sent += await sendToAll(subs, {
          title: `💊 ${d.name}`,
          body: `Time to take ${d.name}${d.dosage ? ` (${d.dosage})` : ""}.`,
          url: "/dashboard",
          tag: `med-${d.medicationId}-${d.slot}`,
        });
      }
    } catch (e) {
      console.error("push run meds error:", e?.message || e);
    }
  }

  return NextResponse.json({ ok: true, users, sent });
}

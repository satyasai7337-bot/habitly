import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPushSubscriptions } from "@/lib/store";
import { sendToAll, pushConfigured } from "@/lib/push";

export const runtime = "nodejs";

// Send a test notification to all of the current user's devices.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!pushConfigured()) {
    return NextResponse.json({ error: "Push is not configured on the server." }, { status: 503 });
  }

  const subs = await getPushSubscriptions(user.id);
  if (subs.length === 0) {
    return NextResponse.json({ error: "No subscriptions — enable notifications first." }, { status: 400 });
  }

  const sent = await sendToAll(subs, {
    title: "Habitly 🔔",
    body: "Notifications are working! You'll get reminders here.",
    url: "/dashboard",
    tag: "habitly-test",
  });
  return NextResponse.json({ ok: true, sent, devices: subs.length });
}

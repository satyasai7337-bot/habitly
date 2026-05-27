import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { savePushSubscription, deletePushSubscription } from "@/lib/store";

export const runtime = "nodejs";

// Save a browser's push subscription for the logged-in user.
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const sub = await req.json();
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
    }
    await savePushSubscription(user.id, sub);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("push subscribe error:", err);
    return NextResponse.json({ error: "Could not save subscription." }, { status: 500 });
  }
}

// Remove a subscription (when the user disables notifications).
export async function DELETE(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });
    await deletePushSubscription(user.id, endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("push unsubscribe error:", err);
    return NextResponse.json({ error: "Could not remove subscription." }, { status: 500 });
  }
}

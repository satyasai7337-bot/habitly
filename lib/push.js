// Web Push sending. Configures web-push with the VAPID keys and exposes a
// helper that sends a payload to a subscription and cleans up dead ones.
import webpush from "web-push";
import { deletePushSubscriptionByEndpoint } from "@/lib/store";

let configured = false;

export function pushConfigured() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureConfigured() {
  if (configured) return;
  if (!pushConfigured()) throw new Error("VAPID keys are not set");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
}

// Send one notification. payload: { title, body, url?, tag? }.
// Returns true on success; on 404/410 the subscription is gone -> removed.
export async function sendPush(subscription, payload) {
  ensureConfigured();
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      await deletePushSubscriptionByEndpoint(subscription.endpoint).catch(() => {});
    } else {
      console.error("push send error:", err?.statusCode, err?.body || err?.message);
    }
    return false;
  }
}

// Send the same payload to every subscription of a user; returns count sent.
export async function sendToAll(subscriptions, payload) {
  let sent = 0;
  for (const sub of subscriptions) {
    if (await sendPush(sub, payload)) sent++;
  }
  return sent;
}

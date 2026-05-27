// Generate a VAPID key pair for Web Push. Paste the output into your env
// (.env.local locally, and the Render service's Environment in production).
//
//   node scripts/gen-vapid.mjs
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + keys.privateKey);
console.log("VAPID_SUBJECT=mailto:you@example.com  # change to your contact email");

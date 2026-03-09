/**
 * VAPID Key Generator
 *
 * Run ONCE and copy the output into your .env file:
 *   node scripts/generate-vapid-keys.js
 *
 * Then add to .env:
 *   VAPID_PUBLIC_KEY=<publicKey>
 *   VAPID_PRIVATE_KEY=<privateKey>
 *   VAPID_SUBJECT=mailto:admin@yourapp.com
 */

import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("\n✅  VAPID keys generated — add these to your .env:\n");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@vami.app\n`);

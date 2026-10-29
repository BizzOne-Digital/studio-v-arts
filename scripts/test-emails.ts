// Email content checks (no real email is sent). Run on a scratch database seeded with --demo:
//   EMAIL_TEST_JSON=1 SMTP_USER=x SMTP_PASS=y npm run test:emails
import { col } from "../src/lib/db";
import { createRentalBooking, daySlots, setBookingStatus } from "../src/lib/booking";
import { testOutbox } from "../src/lib/mail";
import { notifyNewBooking, notifyStatus } from "../src/lib/notify";
import { addDays, dateStrIn } from "../src/lib/time";

let failed = 0;
const check = (n: string, ok: boolean, x = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${n}${x ? "  " + x : ""}`); if (!ok) failed++; };

async function main() {
  const settings = await col("settings");
  await settings.updateOne({ _id: "site" } as any, { $set: { "value.address": { street: "1 Test Street", city: "Toronto", region: "ON", postal: "A1A 1A1", country: "Canada", verified: true }, "value.payment.confirmInstructions": "Parking is free behind the building. Please wear clean indoor shoes.", "value.payment.notifyEmail": "owner@example.com" } });
  const main = (await (await col("rooms")).find({}).sort({ sort_order: 1 }).limit(1).toArray())[0];
  const date = addDays(dateStrIn(new Date(), "America/Toronto"), 9);
  const start = (await daySlots(main.id, date)).slots.find((s) => s.state === "free")!.start;
  const r = await createRentalBooking({ name: "Email Tester", email: "customer@example.com", phone: "5145550100", notes: "" }, [{ date, start, minutes: 120 }], 5, "Dance rehearsal", main.id, "Rehearsal", true);
  if (!r.ok) throw new Error("booking failed: " + r.error);

  const n = await notifyNewBooking(r.id);
  check("request: customer email sent", n.customerEmailed);
  const toCustomer = testOutbox.find((m) => m.to === "customer@example.com")!;
  const toAdmin = testOutbox.find((m) => m.to === "owner@example.com")!;
  check("request: studio notification goes to the admin notification address", !!toAdmin);
  check("request: customer email has reference, room, duration and Interac details", [r.reference, "Main Studio", "2 hours", "yourstudiovm@gmail.com", "Interac"].every((x) => toCustomer.text.includes(x)));
  check("request: HTML email is branded", !!toCustomer.html && toCustomer.html.includes("STUDIO VM Arts, Wellness &amp; Learning Centre Inc."));
  check("request: admin email says to confirm after the e-transfer", !!toAdmin?.text.includes("Interac"));

  testOutbox.length = 0;
  await setBookingStatus(r.id, "confirmed");
  check("confirmed: email sent", await notifyStatus(r.id, "confirmed"));
  const c = testOutbox[0];
  check("confirmed: goes to the customer", c?.to === "customer@example.com");
  check("confirmed: has reference, room, date/time, duration, payment, address", [r.reference, "Main Studio", "Duration: 2 hour", "Payment: received", "1 Test Street"].every((x) => c.text.includes(x)));
  check("confirmed: includes the admin's instructions (parking, rules)", c.text.includes("Parking is free behind the building"));
  check("confirmed: includes the cancellation policy", c.text.includes("Cancellation policy"));
  check("confirmed: HTML version includes the instructions block", !!c.html?.includes("Please note"));

  console.log(failed ? `\n${failed} FAILED` : "\nAll email checks passed");
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });

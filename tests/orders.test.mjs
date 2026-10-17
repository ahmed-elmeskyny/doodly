import { test } from "node:test";
import assert from "node:assert/strict";
import { getTotals, bundleSavings, PRODUCT, resolveLanguage } from "../src/lib/product.ts";
import { getOrderAttribution, normalizePhone, validateOrder, submitOrder, OrderError } from "../src/lib/orders.ts";

const fields = { fullName: "Test Doodly", phone: "06 12 34 56 78", city: "Casablanca", address: "Adresse de test 123", notes: "" };

test("single and bundle totals include free shipping", () => {
  assert.deepEqual(getTotals(1), { productSubtotal: 350, shippingCost: 0, orderTotal: 350 });
  assert.deepEqual(getTotals(2), { productSubtotal: 600, shippingCost: 0, orderTotal: 600 });
  assert.equal(bundleSavings, 100);
  assert.equal(PRODUCT.backingColor, "black");
});
test("language preference prioritizes ad URL, saved choice, then device language", () => {
  assert.equal(resolveLanguage("ar", "fr", "fr-FR"), "ar");
  assert.equal(resolveLanguage(null, "fr", "ar-MA"), "fr");
  assert.equal(resolveLanguage(null, null, "ar-MA"), "ar");
  assert.equal(resolveLanguage(null, null, "en-US"), "fr");
});
test("Moroccan mobile validation accepts local, international, and Arabic numerals", () => {
  for (const phone of ["0612345678", "07 12 34 56 78", "+212612345678", "00212 712345678", "٠٦١٢٣٤٥٦٧٨", "۰۶۱۲۳۴۵۶۷۸"]) {
    assert.deepEqual(validateOrder({ ...fields, phone }), {});
  }
  assert.equal(normalizePhone("٠٠٢١٢ ٦١٢٣٤٥٦٧٨"), "+212612345678");
  for (const phone of ["123", "0512345678", "+33612345678", "06123456789", "abc"]) {
    assert.equal(validateOrder({ ...fields, phone }).phone, "phone");
  }
});
test("required fields, short address, and oversized notes are rejected", () => {
  assert.deepEqual(Object.keys(validateOrder({ fullName: " ", phone: "", city: "", address: "", notes: "" })), ["fullName", "phone", "city", "address"]);
  assert.equal(validateOrder({ ...fields, address: "abc" }).address, "short");
  assert.equal(validateOrder({ ...fields, notes: "x".repeat(1001) }).notes, "long");
});
test("UTM attribution is read from ad links and bounded", () => {
  assert.deepEqual(getOrderAttribution("?utm_source=meta&utm_medium=paid-social&utm_campaign=kids&utm_content=video-a"), {
    utmSource: "meta", utmMedium: "paid-social", utmCampaign: "kids", utmContent: "video-a"
  });
  assert.equal(getOrderAttribution(`?utm_source=${"x".repeat(250)}`).utmSource.length, 200);
});
test("submission only succeeds with explicit server acknowledgment", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const order = { ...fields, submissionId: "00000000-0000-4000-8000-000000000000", timestamp: new Date().toISOString(), quantity: 2, ...getTotals(2), language: "ar", source: "doodly-web" };
  let captured;
  globalThis.fetch = async (url, options) => { captured = { url, options }; return Response.json({ success: true, orderNumber: "S892" }); };
  assert.equal(await submitOrder(order), "S892");
  assert.equal(captured.url, "/api/orders");
  assert.equal(JSON.parse(captured.options.body).orderTotal, 600);
  assert.equal(JSON.parse(captured.options.body).language, "ar");
  globalThis.fetch = async () => Response.json({ code: "not_configured" }, { status: 503 });
  await assert.rejects(submitOrder(order), error => error instanceof OrderError && error.code === "not_configured");
  globalThis.fetch = async () => Response.json({ success: false });
  await assert.rejects(submitOrder(order), { code: "failed" });
  globalThis.fetch = async () => Response.json({ success: true, orderNumber: "invalid" });
  await assert.rejects(submitOrder(order), { code: "failed" });
  globalThis.fetch = async () => new Response("<html>Login required</html>");
  await assert.rejects(submitOrder(order), { code: "failed" });
  globalThis.fetch = async () => { throw new Error("Offline"); };
  await assert.rejects(submitOrder(order), { code: "network" });
});

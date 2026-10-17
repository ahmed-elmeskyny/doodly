import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000" });
Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
Object.defineProperty(globalThis, "CustomEvent", { value: dom.window.CustomEvent, configurable: true });
Object.assign(globalThis, { HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const { render, fireEvent, cleanup, act, waitFor } = await import("@testing-library/react");
const { OrderForm } = await import("../src/components/order-form");
const { translations } = await import("../src/lib/translations");
const { POST } = await import("../src/app/api/orders/route");
const realFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = realFetch; delete process.env.GOOGLE_SHEETS_WEBHOOK_URL; delete process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL; delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_CHAT_ID; delete process.env.META_PIXEL_ID; delete process.env.META_CAPI_ACCESS_TOKEN; delete process.env.META_CAPI_TEST_EVENT_CODE; delete process.env.META_GRAPH_API_VERSION; });

function fillValidForm(container: HTMLElement) {
  for (const [key, value] of Object.entries({ fullName: "Test Doodly", phone: "0612345678", city: "Casablanca", address: "Adresse fictive de test" })) {
    fireEvent.change(container.querySelector(`#order-${key}`)!, { target: { value } });
  }
}

test("checkout exposes validation, focuses first invalid field, and sends no request", () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ success: true, orderNumber: "S892" }); };
  const ui = render(<OrderForm quantity={1} setQuantity={() => {}} language="fr" t={translations.fr}/>);
  fireEvent.submit(ui.container.querySelector("form")!);
  assert.equal(ui.container.querySelectorAll('[role="alert"]').length, 4);
  assert.equal(document.activeElement?.id, "order-fullName");
  assert.equal(calls, 0);
});

test("loading disables controls and prevents duplicates; success keeps the confirmed total", async () => {
  let calls = 0;
  let acknowledge!: (response: Response) => void;
  globalThis.fetch = async () => { calls++; return new Promise(resolve => { acknowledge = resolve; }); };
  const ui = render(<OrderForm quantity={2} setQuantity={() => {}} language="fr" t={translations.fr}/>);
  fillValidForm(ui.container);
  const form = ui.container.querySelector("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  assert.equal(calls, 1);
  assert.equal(ui.container.querySelector("button")?.disabled, true);
  assert.match(ui.container.textContent!, /Envoi en cours/);
  assert.equal(ui.container.querySelectorAll("fieldset[disabled]").length, 2);
  await act(async () => { acknowledge(Response.json({ success: true, orderNumber: "S892" })); });
  assert.match(ui.container.textContent!, /a bien été reçue/);
  assert.match(ui.container.textContent!, /S892/);
  assert.match(ui.container.textContent!, /600 MAD/);
  assert.match(ui.container.textContent!, /Gratuite/);
  assert.match(ui.container.textContent!, /Paiement à la livraison/);
  assert.equal(document.activeElement?.getAttribute("role"), "status");
  assert.equal(ui.container.querySelector("form"), null);
});

test("Arabic unavailable state preserves entered values without claiming success", async () => {
  globalThis.fetch = async () => Response.json({ code: "not_configured" }, { status: 503 });
  const ui = render(<OrderForm quantity={1} setQuantity={() => {}} language="ar" t={translations.ar}/>);
  fillValidForm(ui.container);
  fireEvent.submit(ui.container.querySelector("form")!);
  await waitFor(() => assert.ok(ui.container.querySelector(".form-error")));
  assert.match(ui.container.textContent!, /لم يُسجّل أي طلب/);
  assert.equal((ui.container.querySelector("#order-fullName") as HTMLInputElement).value, "Test Doodly");
  assert.equal(ui.container.querySelector(".success-panel"), null);
  assert.equal(ui.container.querySelector("button")?.disabled, false);
});

test("failed retry reuses the same submission ID", async () => {
  const ids: string[] = [];
  globalThis.fetch = async (_url, options) => { ids.push(JSON.parse(options!.body as string).submissionId); return Response.json({ code: "failed" }, { status: 502 }); };
  const ui = render(<OrderForm quantity={1} setQuantity={() => {}} language="fr" t={translations.fr}/>);
  fillValidForm(ui.container);
  fireEvent.submit(ui.container.querySelector("form")!);
  await waitFor(() => assert.ok(ui.container.querySelector(".form-error")));
  fireEvent.submit(ui.container.querySelector("form")!);
  await waitFor(() => assert.equal(ids.length, 2));
  assert.equal(ids[0], ids[1]);
});

const order = { fullName: "Test Doodly", phone: "0612345678", city: "Casablanca", address: "Adresse fictive de test", notes: "", submissionId: "00000000-0000-4000-8000-000000000000", quantity: 2, language: "fr", orderTotal: 1, productSubtotal: 1, shippingCost: 0 };
const request = (body: unknown, origin = "http://localhost:3000") => new Request("http://0.0.0.0:3000/api/orders", { method: "POST", headers: { host: "localhost:3000", origin, "content-type": "application/json" }, body: JSON.stringify(body) });
test("API accepts the request host, rejects cross-origin requests, and handles missing configuration", async () => {
  assert.equal((await POST(request(order))).status, 503);
  assert.equal((await POST(request(order, "https://another.example"))).status, 403);
  assert.equal((await POST(request({ ...order, quantity: 3 }))).status, 400);
});
test("API recalculates tampered prices and requires a Sheets acknowledgment", async () => {
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/TEST_ONLY/exec";
  let sent: Record<string, unknown> = {};
  globalThis.fetch = async (_url, options) => { sent = JSON.parse(options!.body as string); return Response.json({ success: true, orderNumber: "S892" }); };
  assert.equal((await POST(request(order))).status, 200);
  assert.equal(sent.orderTotal, 600);
  assert.equal(sent.productSubtotal, 600);
  assert.equal(sent.shippingCost, 0);
  globalThis.fetch = async () => Response.json({ success: false });
  assert.equal((await POST(request(order))).status, 502);
});

test("API sends Telegram details after Sheets confirms the order", async () => {
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/TEST_ONLY/exec";
  process.env.TELEGRAM_BOT_TOKEN = "123456789:test_token";
  process.env.TELEGRAM_CHAT_ID = "987654321";
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = async (url, options) => {
    const href = String(url);
    calls.push({ url: href, body: JSON.parse(options!.body as string) });
    if (href.includes("script.google.com")) return Response.json({ success: true, orderNumber: "S892" });
    return Response.json({ ok: true });
  };
  const response = await POST(request(order));
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /^https:\/\/api\.telegram\.org\/bot/);
  assert.equal(calls[1].body.chat_id, "987654321");
  assert.match(String(calls[1].body.text), /S892/);
  assert.match(String(calls[1].body.text), /Test Doodly/);
  assert.match(String(calls[1].body.text), /600 MAD/);
});

test("API sends a deduplicated, hashed Purchase event through Meta CAPI", async () => {
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/TEST_ONLY/exec";
  process.env.META_PIXEL_ID = "1814304463101443";
  process.env.META_CAPI_ACCESS_TOKEN = "test-access-token";
  process.env.META_GRAPH_API_VERSION = "v26.0";
  const calls: Array<{ url: string; headers: Headers; body: Record<string, unknown> }> = [];
  globalThis.fetch = async (url, options) => {
    const href = String(url);
    calls.push({ url: href, headers: new Headers(options?.headers), body: JSON.parse(options!.body as string) });
    if (href.includes("script.google.com")) return Response.json({ success: true, orderNumber: "S892" });
    return Response.json({ events_received: 1 });
  };
  const metaOrder = { ...order, fbp: "fb.1.123.456", fbc: "fb.1.123.click", eventSourceUrl: "http://localhost:3000/?fbclid=click" };
  const metaRequest = new Request("http://0.0.0.0:3000/api/orders", {
    method: "POST",
    headers: { host: "localhost:3000", origin: "http://localhost:3000", "content-type": "application/json", "user-agent": "Doodly test browser", "x-forwarded-for": "203.0.113.10" },
    body: JSON.stringify(metaOrder),
  });
  assert.equal((await POST(metaRequest)).status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, "https://graph.facebook.com/v26.0/1814304463101443/events");
  assert.equal(calls[1].headers.get("authorization"), "Bearer test-access-token");
  const event = (calls[1].body.data as Array<Record<string, unknown>>)[0];
  assert.equal(event.event_name, "Purchase");
  assert.equal(event.event_id, order.submissionId);
  assert.equal(event.event_source_url, metaOrder.eventSourceUrl);
  const userData = event.user_data as Record<string, unknown>;
  assert.match((userData.ph as string[])[0], /^[a-f0-9]{64}$/);
  assert.notEqual((userData.ph as string[])[0], order.phone);
  assert.equal(userData.fbp, metaOrder.fbp);
  assert.equal(userData.fbc, metaOrder.fbc);
  assert.equal(userData.client_ip_address, "203.0.113.10");
  assert.equal((event.custom_data as Record<string, unknown>).value, 600);
  assert.equal("address" in userData, false);
  assert.equal("notes" in userData, false);
});

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
afterEach(() => { cleanup(); globalThis.fetch = realFetch; delete process.env.GOOGLE_SHEETS_WEBHOOK_URL; delete process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL; });

function fillValidForm(container: HTMLElement) {
  for (const [key, value] of Object.entries({ fullName: "Test Doodly", phone: "0612345678", city: "Casablanca", address: "Adresse fictive de test" })) {
    fireEvent.change(container.querySelector(`#order-${key}`)!, { target: { value } });
  }
}

test("checkout exposes validation, focuses first invalid field, and sends no request", () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ success: true }); };
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
  await act(async () => { acknowledge(Response.json({ success: true })); });
  assert.match(ui.container.textContent!, /a bien été reçue/);
  assert.match(ui.container.textContent!, /635 MAD/);
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

test("failed retry reuses the same order ID", async () => {
  const ids: string[] = [];
  globalThis.fetch = async (_url, options) => { ids.push(JSON.parse(options!.body as string).orderId); return Response.json({ code: "failed" }, { status: 502 }); };
  const ui = render(<OrderForm quantity={1} setQuantity={() => {}} language="fr" t={translations.fr}/>);
  fillValidForm(ui.container);
  fireEvent.submit(ui.container.querySelector("form")!);
  await waitFor(() => assert.ok(ui.container.querySelector(".form-error")));
  fireEvent.submit(ui.container.querySelector("form")!);
  await waitFor(() => assert.equal(ids.length, 2));
  assert.equal(ids[0], ids[1]);
});

const order = { fullName: "Test Doodly", phone: "0612345678", city: "Casablanca", address: "Adresse fictive de test", notes: "", orderId: "00000000-0000-4000-8000-000000000000", quantity: 2, language: "fr", orderTotal: 1, productSubtotal: 1, shippingCost: 0 };
const request = (body: unknown, origin = "http://localhost:3000") => new Request("http://0.0.0.0:3000/api/orders", { method: "POST", headers: { host: "localhost:3000", origin, "content-type": "application/json" }, body: JSON.stringify(body) });
test("API accepts the request host, rejects cross-origin requests, and handles missing configuration", async () => {
  assert.equal((await POST(request(order))).status, 503);
  assert.equal((await POST(request(order, "https://another.example"))).status, 403);
  assert.equal((await POST(request({ ...order, quantity: 3 }))).status, 400);
});
test("API recalculates tampered prices and requires a Sheets acknowledgment", async () => {
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/TEST_ONLY/exec";
  let sent: Record<string, unknown> = {};
  globalThis.fetch = async (_url, options) => { sent = JSON.parse(options!.body as string); return Response.json({ success: true }); };
  assert.equal((await POST(request(order))).status, 200);
  assert.equal(sent.orderTotal, 635);
  assert.equal(sent.productSubtotal, 600);
  assert.equal(sent.shippingCost, 35);
  globalThis.fetch = async () => Response.json({ success: false });
  assert.equal((await POST(request(order))).status, 502);
});

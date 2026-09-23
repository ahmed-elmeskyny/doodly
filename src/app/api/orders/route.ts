import { NextResponse } from "next/server";
import { getTotals } from "@/lib/product";
import { normalizePhone, validateOrder } from "@/lib/orders";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || new URL(request.url).host;
  try {
    if (origin && new URL(origin).host !== host) return NextResponse.json({ code: "forbidden" }, { status: 403 });
  } catch { return NextResponse.json({ code: "forbidden" }, { status: 403 }); }
  if (Number(request.headers.get("content-length") ?? 0) > 12000) return NextResponse.json({ code: "invalid" }, { status: 413 });
  let data;
  try {
    const raw = await request.text();
    if (raw.length > 12000) return NextResponse.json({ code: "invalid" }, { status: 413 });
    data = JSON.parse(raw);
  } catch { return NextResponse.json({ code: "invalid" }, { status: 400 }); }
  if (!data || ![1, 2].includes(data.quantity) || !["fr", "ar"].includes(data.language) ||
      typeof data.orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(data.orderId) ||
      !["fullName", "phone", "city", "address", "notes"].every(key => typeof data[key] === "string")) {
    return NextResponse.json({ code: "invalid" }, { status: 400 });
  }
  const fields = { fullName: data.fullName.trim(), phone: normalizePhone(data.phone), city: data.city.trim(), address: data.address.trim(), notes: data.notes.trim() };
  if (Object.keys(validateOrder(fields)).length) return NextResponse.json({ code: "invalid" }, { status: 400 });
  const endpoint = process.env.GOOGLE_SHEETS_WEBHOOK_URL || process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL;
  if (!endpoint) {
    if (process.env.NODE_ENV !== "production") console.warn("[Doodly] Orders are not connected. Set GOOGLE_SHEETS_WEBHOOK_URL or NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL. No order has been saved.");
    return NextResponse.json({ code: "not_configured" }, { status: 503 });
  }
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.hostname !== "script.google.com") throw new Error("Invalid webhook configuration");
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...fields, orderId: data.orderId, timestamp: new Date().toISOString(), quantity: data.quantity, ...getTotals(data.quantity), language: data.language, source: "doodly-web" }),
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
      cache: "no-store",
    });
    const result = await upstream.json();
    if (!upstream.ok || result?.success !== true) throw new Error("Order not acknowledged");
    return NextResponse.json({ success: true, orderId: data.orderId });
  } catch {
    return NextResponse.json({ code: "failed" }, { status: 502 });
  }
}

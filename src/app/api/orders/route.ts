import { NextResponse } from "next/server";
import { getTotals } from "@/lib/product";
import { normalizePhone, validateOrder } from "@/lib/orders";
import { sendMetaPurchase } from "@/lib/meta-capi";

type TelegramOrder = {
  orderNumber: string;
  fullName: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
  quantity: 1 | 2;
  orderTotal: number;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
};

function telegramMessage(order: TelegramOrder) {
  const attribution = [order.utmSource, order.utmMedium, order.utmCampaign, order.utmContent].filter(Boolean).join(" · ") || "Direct";
  return [
    "🎨 Nouvelle commande Doodly",
    "",
    `Commande : ${order.orderNumber}`,
    `Client : ${order.fullName}`,
    `Téléphone : ${order.phone}`,
    `Ville : ${order.city}`,
    `Adresse : ${order.address}`,
    `Quantité : ${order.quantity}`,
    `Total : ${order.orderTotal} MAD`,
    "Paiement : À la livraison",
    `Notes : ${order.notes || "Aucune"}`,
    `Source : ${attribution}`,
  ].join("\n");
}

async function notifyTelegram(order: TelegramOrder) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token) || !/^-?\d+$/.test(chatId)) return;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: telegramMessage(order) }),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok && process.env.NODE_ENV !== "production") console.warn("[Doodly] Telegram notification was not delivered.");
  } catch {
    if (process.env.NODE_ENV !== "production") console.warn("[Doodly] Telegram notification was not delivered.");
  }
}

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
      typeof data.submissionId !== "string" || !/^[0-9a-f-]{36}$/i.test(data.submissionId) ||
      !["fullName", "phone", "city", "address", "notes"].every(key => typeof data[key] === "string")) {
    return NextResponse.json({ code: "invalid" }, { status: 400 });
  }
  const fields = { fullName: data.fullName.trim(), phone: normalizePhone(data.phone), city: data.city.trim(), address: data.address.trim(), notes: data.notes.trim() };
  if (Object.keys(validateOrder(fields)).length) return NextResponse.json({ code: "invalid" }, { status: 400 });
  const attribution = Object.fromEntries(["utmSource", "utmMedium", "utmCampaign", "utmContent"].map(key => [key, typeof data[key] === "string" ? data[key].trim().slice(0, 200) : ""]));
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
      body: JSON.stringify({ ...fields, ...attribution, submissionId: data.submissionId, timestamp: new Date().toISOString(), quantity: data.quantity, ...getTotals(data.quantity), language: data.language, source: "doodly-web" }),
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
      cache: "no-store",
    });
    const result = await upstream.json();
    if (!upstream.ok || result?.success !== true || typeof result.orderNumber !== "string" || !/^S\d{3,}$/.test(result.orderNumber)) throw new Error("Order not acknowledged");
    const totals = getTotals(data.quantity);
    const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const sourceCandidate = typeof data.eventSourceUrl === "string" ? data.eventSourceUrl : request.headers.get("referer") || process.env.SITE_URL || request.url;
    let eventSourceUrl = process.env.SITE_URL || request.url;
    try {
      const source = new URL(sourceCandidate);
      if (["http:", "https:"].includes(source.protocol) && (!origin || source.host === new URL(origin).host)) eventSourceUrl = source.href.slice(0, 2048);
    } catch { /* Use the configured site URL fallback. */ }
    await Promise.all([
      notifyTelegram({ orderNumber: result.orderNumber, ...fields, quantity: data.quantity, orderTotal: totals.orderTotal, ...attribution } as TelegramOrder),
      sendMetaPurchase({
        eventId: data.submissionId,
        eventSourceUrl,
        orderNumber: result.orderNumber,
        fullName: fields.fullName,
        phone: fields.phone,
        city: fields.city,
        quantity: data.quantity,
        value: totals.orderTotal,
        fbp: typeof data.fbp === "string" ? data.fbp.slice(0, 200) : "",
        fbc: typeof data.fbc === "string" ? data.fbc.slice(0, 500) : "",
        clientIp: forwardedIp,
        clientUserAgent: request.headers.get("user-agent")?.slice(0, 1000),
      }),
    ]);
    return NextResponse.json({ success: true, orderNumber: result.orderNumber });
  } catch {
    return NextResponse.json({ code: "failed" }, { status: 502 });
  }
}

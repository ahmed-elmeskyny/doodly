import { createHash } from "node:crypto";

type MetaPurchase = {
  eventId: string;
  eventSourceUrl: string;
  orderNumber: string;
  fullName: string;
  phone: string;
  city: string;
  quantity: 1 | 2;
  value: number;
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  clientUserAgent?: string;
};

const GRAPH_API_VERSION = "v26.0";

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("fr").normalize("NFKC");
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hashed(value: string | undefined) {
  return value ? [sha256(normalized(value))] : undefined;
}

function metaPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `212${digits.slice(1)}` : digits;
}

export async function sendMetaPurchase(purchase: MetaPurchase) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken || !/^\d+$/.test(pixelId)) return;

  const nameParts = normalized(purchase.fullName).split(/\s+/).filter(Boolean);
  const firstName = nameParts.shift() || "";
  const lastName = nameParts.join(" ");
  const userData = {
    ph: hashed(metaPhone(purchase.phone)),
    fn: hashed(firstName),
    ln: hashed(lastName),
    ct: hashed(purchase.city),
    country: hashed("ma"),
    external_id: hashed(purchase.eventId),
    client_ip_address: purchase.clientIp || undefined,
    client_user_agent: purchase.clientUserAgent || undefined,
    fbp: purchase.fbp || undefined,
    fbc: purchase.fbc || undefined,
  };
  const payload: Record<string, unknown> = {
    data: [{
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: purchase.eventId,
      event_source_url: purchase.eventSourceUrl,
      action_source: "website",
      user_data: userData,
      custom_data: {
        currency: "MAD",
        value: purchase.value,
        order_id: purchase.orderNumber,
        content_ids: ["DOODLY-BLANKET"],
        content_type: "product",
        contents: [{ id: "DOODLY-BLANKET", quantity: purchase.quantity }],
        num_items: purchase.quantity,
      },
    }],
  };
  if (process.env.META_CAPI_TEST_EVENT_CODE) payload.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE;

  try {
    const response = await fetch(`https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION || GRAPH_API_VERSION}/${pixelId}/events`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok && process.env.NODE_ENV !== "production") console.warn("[Doodly] Meta CAPI event was not delivered.");
  } catch {
    if (process.env.NODE_ENV !== "production") console.warn("[Doodly] Meta CAPI event was not delivered.");
  }
}

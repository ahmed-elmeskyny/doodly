type EventName = "hero_cta_click" | "select_single_blanket" | "select_two_blankets" | "begin_order" | "order_success" | "language_change";

type EventDetail = Record<string, string | number> & { eventId?: string };

function trackMeta(name: EventName, detail: EventDetail) {
  if (!window.fbq) return;
  if (name === "begin_order") {
    window.fbq("track", "InitiateCheckout", { content_ids: ["DOODLY-BLANKET"], content_type: "product" });
  } else if (name === "order_success") {
    const parameters = { currency: "MAD", value: detail.total, num_items: detail.quantity, content_ids: ["DOODLY-BLANKET"], content_type: "product" };
    window.fbq("track", "Purchase", parameters, detail.eventId ? { eventID: detail.eventId } : undefined);
  } else if (name === "select_single_blanket" || name === "select_two_blankets") {
    window.fbq("trackCustom", "SelectOffer", { quantity: detail.quantity });
  }
}

export function trackEvent(name: EventName, detail: EventDetail = {}) {
  if (typeof window !== "undefined") {
    trackMeta(name, detail);
    window.dispatchEvent(new CustomEvent("doodly:analytics", { detail: { event: name, ...detail } }));
  }
}

function readCookie(name: string) {
  return document.cookie.split(";").map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1) || "";
}

export function getMetaBrowserData() {
  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get("fbclid") || "";
  return {
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc") || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : ""),
    eventSourceUrl: window.location.href.slice(0, 2048),
  };
}

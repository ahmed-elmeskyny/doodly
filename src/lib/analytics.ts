type EventName = "hero_cta_click" | "select_single_blanket" | "select_two_blankets" | "begin_order" | "order_success" | "language_change";

// Listen for doodly:analytics to connect a future analytics provider. No personal data.
export function trackEvent(name: EventName, detail: Record<string, string | number> = {}) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("doodly:analytics", { detail: { event: name, ...detail } }));
  }
}

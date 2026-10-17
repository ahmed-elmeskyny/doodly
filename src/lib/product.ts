export const PRODUCT = {
  name: "Doodly Coloring Blanket",
  singlePrice: 350,
  bundlePrice: 600,
  shipping: 0,
  currency: "MAD",
  dimensions: "100 × 150 cm",
  markerCount: 12,
  backingColor: "black",
  deliveryDays: "2–3",
  returnDays: 7,
} as const;

export type Quantity = 1 | 2;
export type Language = "fr" | "ar";
export const resolveLanguage = (requested?: string | null, saved?: string | null, browser?: string | null): Language => {
  if (requested === "fr" || requested === "ar") return requested;
  if (saved === "fr" || saved === "ar") return saved;
  return browser?.toLowerCase().startsWith("ar") ? "ar" : "fr";
};
export const getTotals = (quantity: Quantity) => {
  const productSubtotal = quantity === 2 ? PRODUCT.bundlePrice : PRODUCT.singlePrice;
  return { productSubtotal, shippingCost: PRODUCT.shipping, orderTotal: productSubtotal + PRODUCT.shipping };
};
export const bundleSavings = PRODUCT.singlePrice * 2 - PRODUCT.bundlePrice;
export const money = (value: number) => `${value} ${PRODUCT.currency}`;

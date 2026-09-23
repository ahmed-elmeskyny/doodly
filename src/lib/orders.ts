export type OrderFields = {
  fullName: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
};
export type FieldErrors = Partial<Record<keyof OrderFields, "required" | "phone" | "short" | "long">>;

export function normalizePhone(phone: string) {
  const latin = phone.replace(/[٠-٩۰-۹]/g, c => String(c.charCodeAt(0) - (c >= "۰" ? 1776 : 1632)));
  const compact = latin.replace(/[\s().-]/g, "");
  return compact.replace(/^00212/, "+212");
}

export function validateOrder(fields: OrderFields): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of ["fullName", "phone", "city", "address"] as const) {
    if (!fields[field].trim()) errors[field] = "required";
  }
  if (fields.fullName.trim() && fields.fullName.trim().length < 2) errors.fullName = "short";
  if (fields.address.trim() && fields.address.trim().length < 8) errors.address = "short";
  if (fields.phone.trim() && !/^(?:0|\+212)[67]\d{8}$/.test(normalizePhone(fields.phone))) errors.phone = "phone";
  for (const field of ["fullName", "city", "address", "notes"] as const) {
    if (fields[field].length > (field === "notes" || field === "address" ? 1000 : 120)) errors[field] = "long";
  }
  return errors;
}

export type OrderPayload = OrderFields & {
  orderId: string;
  timestamp: string;
  quantity: 1 | 2;
  productSubtotal: number;
  shippingCost: number;
  orderTotal: number;
  language: "fr" | "ar";
  source: string;
};

export class OrderError extends Error {
  code: string;
  constructor(code: string) { super(code); this.code = code; }
}

export async function submitOrder(order: OrderPayload): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
      signal: AbortSignal.timeout(25000),
    });
  } catch { throw new OrderError("network"); }
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success !== true) throw new OrderError(result?.code ?? "failed");
}

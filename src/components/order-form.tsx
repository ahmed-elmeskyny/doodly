"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { PRODUCT, getTotals, money, type Quantity, type Language } from "@/lib/product";
import { normalizePhone, submitOrder, validateOrder, OrderError, type OrderFields, type FieldErrors, type OrderPayload } from "@/lib/orders";
import { trackEvent } from "@/lib/analytics";
import type { Copy } from "@/lib/translations";
import { Eyes, Icon } from "./ui";

export function OrderSummary({ quantity, t }: { quantity: Quantity; t: Copy }) {
  const totals = getTotals(quantity);
  return <div className="order-summary" aria-live="polite" aria-atomic="true"><h4>{t.summary}</h4><div><span>{t.subtotal} · {quantity === 1 ? t.single : t.double}</span><span dir="ltr">{money(totals.productSubtotal)}</span></div><div><span>{t.shippingLabel}</span><span dir="ltr">{money(totals.shippingCost)}</span></div><div className="summary-total"><strong>{t.total}</strong><strong dir="ltr">{money(totals.orderTotal)}</strong></div></div>;
}

export function OrderForm({ quantity, setQuantity, language, t }: { quantity: Quantity; setQuantity: (value: Quantity) => void; language: Language; t: Copy }) {
  const [fields, setFields] = useState<OrderFields>({ fullName: "", phone: "", city: "", address: "", notes: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorCode, setErrorCode] = useState("");
  const [submitted, setSubmitted] = useState<OrderPayload | null>(null);
  const started = useRef(false);
  const sending = useRef(false);
  const attempt = useRef<{ fingerprint: string; id: string } | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (status === "success") successRef.current?.focus(); }, [status]);

  function updateField(key: keyof OrderFields, value: string) {
    setFields(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
    if (status === "error") setStatus("idle");
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const nextErrors = validateOrder(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.getElementById(`order-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }
    sending.current = true;
    setStatus("submitting");
    const clean = { fullName: fields.fullName.trim(), phone: normalizePhone(fields.phone), city: fields.city.trim(), address: fields.address.trim(), notes: fields.notes.trim() };
    const fingerprint = JSON.stringify({ ...clean, quantity });
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, id: crypto.randomUUID() };
    const order: OrderPayload = { ...clean, orderId: attempt.current.id, timestamp: new Date().toISOString(), quantity, ...getTotals(quantity), language, source: "doodly-web" };
    try {
      await submitOrder(order);
      setSubmitted(order);
      setStatus("success");
      trackEvent("order_success", { quantity, total: order.orderTotal, language });
    } catch (error) {
      setErrorCode(error instanceof OrderError ? error.code : "failed");
      setStatus("error");
    } finally { sending.current = false; }
  }

  if (status === "success" && submitted) return <div className="order-form success-panel" ref={successRef} tabIndex={-1} role="status"><Eyes/><span className="success-check"><Icon name="check"/></span><h3>{t.successTitle}</h3><p>{t.successCopy}</p><p>{t.successDelivery}</p><OrderSummary quantity={submitted.quantity} t={t}/><p className="payment-note"><Icon name="box"/>{t.cod}</p><a href="#produit" className="text-link">{t.successBack}<Icon name="arrow"/></a></div>;

  return <form className="order-form" noValidate onSubmit={handleSubmit} onFocus={() => { if (!started.current) { started.current = true; trackEvent("begin_order", { language }); } }} aria-busy={status === "submitting"}>
    <div className="form-heading"><h3>{t.orderFormTitle}</h3><Icon name="pen"/></div><p className="required-note">{t.requiredNote}</p>
    <fieldset disabled={status === "submitting"} className="package-fieldset"><legend>{t.quantity}</legend><div className="quantity-options">{([1, 2] as const).map(value => <label key={value} className={`quantity-option ${quantity === value ? "active" : ""}`}><input type="radio" name="quantity" value={value} checked={quantity === value} onChange={() => setQuantity(value)}/><span><strong>{value === 1 ? t.single : t.double}</strong><span dir="ltr">{money(value === 1 ? PRODUCT.singlePrice : PRODUCT.bundlePrice)}</span></span>{value === 2 && <span className="mini-saving">−{money(PRODUCT.singlePrice * 2 - PRODUCT.bundlePrice)}</span>}</label>)}</div></fieldset>
    <fieldset disabled={status === "submitting"} className="fields-grid">{(["fullName", "phone", "city", "address", "notes"] as const).map(key => <div className={`form-field ${key === "address" || key === "notes" || key === "fullName" ? "full-width" : ""}`} key={key}>
      <label htmlFor={`order-${key}`}>{t.fields[key]} {key === "notes" ? <span className="optional">({t.optional})</span> : <span aria-hidden="true">*</span>}</label>
      {key === "notes" ? <textarea id={`order-${key}`} name={key} placeholder={t.placeholders[key]} value={fields[key]} onChange={e => updateField(key, e.target.value)} rows={2} maxLength={1000} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `error-${key}` : undefined}/> : <input id={`order-${key}`} name={key} type={key === "phone" ? "tel" : "text"} inputMode={key === "phone" ? "tel" : "text"} dir={key === "phone" ? "ltr" : undefined} autoComplete={key === "fullName" ? "name" : key === "phone" ? "tel" : key === "city" ? "address-level2" : "street-address"} required placeholder={t.placeholders[key]} value={fields[key]} onChange={e => updateField(key, e.target.value)} maxLength={key === "address" ? 1000 : 120} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `error-${key}` : undefined}/>}
      {errors[key] && <span className="field-error" id={`error-${key}`} role="alert">{t.errors[errors[key]]}</span>}
    </div>)}</fieldset>
    <OrderSummary quantity={quantity} t={t}/>
    {status === "error" && <div className="form-error" role="alert"><strong>{t.errorTitle}</strong><p>{errorCode === "not_configured" ? t.unavailable : t.errorMessage}</p></div>}
    <button className="button submit-button" type="submit" disabled={status === "submitting"}>{status === "submitting" ? <><span className="spinner"/>{t.submitting}</> : <>{t.submit}<Icon name="arrow"/></>}</button>
    <p className="payment-note"><Icon name="shield"/>{t.paymentNote}</p><p className="privacy-note">{t.privacyNote}</p>
  </form>;
}

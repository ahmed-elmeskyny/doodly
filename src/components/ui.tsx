import Image from "next/image";
import type { ReactNode } from "react";

export type IconName = "arrow" | "truck" | "check" | "wash" | "pen" | "heart" | "repeat" | "spark" | "people" | "shield" | "box" | "plus" | "close" | "menu" | "leaf" | "ruler";
const paths: Record<IconName, ReactNode> = {
  arrow: <><path d="M4 12h15M13 6l6 6-6 6" /></>,
  truck: <><path d="M3 5h11v12H3zM14 9h4l3 4v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  wash: <><rect x="4" y="3" width="16" height="19" rx="3"/><path d="M4 8h16M7 5.5h.01M10 5.5h.01"/><circle cx="12" cy="14.5" r="4"/><path d="M8 14c3 3 4-2 8 0"/></>,
  pen: <><path d="m5 14 10-10 5 5-10 10-6 1 1-6ZM13 6l5 5M5 14l5 5M3 22h18"/></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
  repeat: <><path d="m16 3 4 4-4 4M20 7H7a4 4 0 0 0-4 4m5 10-4-4 4-4M4 17h13a4 4 0 0 0 4-4"/></>,
  spark: <><path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z"/></>,
  people: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v2"/></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
  box: <><path d="m12 3 9 5v10l-9 4-9-4V8l9-5ZM3 8l9 5 9-5M12 13v9M8 5l9 5"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  leaf: <><path d="M20 3c0 12-2 16-9 16a7 7 0 0 1 0-14c3 0 6 0 9-2ZM4 21 15 10"/></>,
  ruler: <><path d="m3 16 13-13 5 5L8 21l-5-5ZM12 7l2 2M9 10l2 2M6 13l2 2"/></>,
};
export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function Eyes({ className = "" }: { className?: string }) {
  return <span className={`eyes ${className}`} aria-hidden="true"><img src="/images/brand/doodly-icon.svg" alt="" width={320} height={320}/></span>;
}
export function Logo({ full = false }: { full?: boolean }) {
  return <img className={`brand-logo ${full ? "brand-logo-full" : ""}`} src={`/images/brand/doodly-${full ? "full" : "wordmark"}.svg`} alt="Doodly" width={648} height={full ? 386 : 338}/>;
}
export function Star({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 80 80" fill="none" className={`doodle-star ${className}`} aria-hidden="true"><path d="m40 6 8 22 23-4-15 18 11 21-24-8-18 19 1-27L5 34l25-5L40 6Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/></svg>;
}
export function Photo({ name, alt, className = "", preload = false, contain = false, sizes = "(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 580px" }: { name: string; alt: string; className?: string; preload?: boolean; contain?: boolean; sizes?: string }) {
  return <div className={`photo ${contain ? "photo-contain" : ""} ${className}`}><Image src={`/images/product/${name}.png`} alt={alt} fill sizes={sizes} preload={preload} /></div>;
}
export function SectionHeading({ eyebrow, title, copy, centered = false }: { eyebrow: string; title: string; copy?: string; centered?: boolean }) {
  return <div className={`section-heading ${centered ? "centered" : ""}`}><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{copy && <p className="section-copy">{copy}</p>}</div>;
}
export function Cta({ children, className = "", onClick, href = "#commander" }: { children: ReactNode; className?: string; onClick?: () => void; href?: string }) {
  return <a className={`button ${className}`} href={href} onClick={onClick}>{children}<Icon name="arrow"/></a>;
}

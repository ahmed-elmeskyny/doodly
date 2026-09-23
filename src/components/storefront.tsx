"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PRODUCT, bundleSavings, money, type Language, type Quantity } from "@/lib/product";
import { translations, type Copy } from "@/lib/translations";
import { trackEvent } from "@/lib/analytics";
import { reviews } from "@/lib/reviews";
import { Cta, Eyes, Icon, Logo, Photo, SectionHeading, Star, type IconName } from "./ui";
import { OrderForm } from "./order-form";

const anchors = ["produit", "comment-ca-marche", "avis", "faq"];
const featureIcons: IconName[] = ["wash", "pen", "shield", "repeat"];

function Header({ language, changeLanguage, t }: { language: Language; changeLanguage: (value: Language) => void; t: Copy }) {
  const [menu, setMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  return <><div className="announcement"><Icon name="truck"/><span>{t.announcement}</span><span className="announcement-dot">✦</span><span className="announcement-payment">{t.cod}</span></div>
    <header className="site-header" onKeyDown={event => { if (event.key === "Escape") { setMenu(false); menuButton.current?.focus(); } }}><div className="container header-inner"><a href="#accueil" className="brand-link" aria-label="Doodly"><Logo/></a><nav className="desktop-nav" aria-label={language === "fr" ? "Navigation principale" : "القائمة الرئيسية"}>{t.nav.map((label, index) => <a key={label} href={`#${anchors[index]}`}>{label}</a>)}</nav><div className="header-actions"><div className="language-switcher" role="group" aria-label={t.language} dir="ltr"><button onClick={() => changeLanguage("fr")} className={language === "fr" ? "active" : ""} aria-pressed={language === "fr"} lang="fr">FR</button><span>|</span><button onClick={() => changeLanguage("ar")} className={language === "ar" ? "active" : ""} aria-pressed={language === "ar"} lang="ar">العربية</button></div><Cta className="header-cta">{t.order}</Cta><button className="menu-button" aria-label={menu ? t.closeMenu : t.menu} aria-expanded={menu} aria-controls="mobile-nav" ref={menuButton} onClick={() => setMenu(!menu)}><Icon name={menu ? "close" : "menu"}/></button></div></div>
      {menu && <nav id="mobile-nav" className="mobile-nav" aria-label={t.menu}>{t.nav.map((label, index) => <a key={label} href={`#${anchors[index]}`} onClick={() => setMenu(false)}>{label}<Icon name="arrow"/></a>)}<a href="#commander" onClick={() => setMenu(false)}>{t.order}<Icon name="arrow"/></a></nav>}
    </header></>;
}

function Hero({ t, selectQuantity }: { t: Copy; selectQuantity: (value: Quantity) => void }) {
  return <section className="hero container" id="accueil"><div className="hero-intro"><p className="eyebrow"><span className="tiny-spark">✦</span>{t.eyebrow}</p><h1><span>{t.heroLines[0]}</span><span>{t.heroLines[1]}<svg viewBox="0 0 310 18" aria-hidden="true"><path d="M4 12C89 0 176 4 302 8M18 17C106 8 180 9 287 13" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg></span><span>{t.heroLines[2]}</span></h1><p className="hero-description">{t.heroCopy}</p></div>
    <div className="hero-visual"><div className="hero-image-frame"><Photo name="doodly-hero-product-markers" alt={t.alt.hero} preload sizes="(max-width: 640px) 90vw, (max-width: 1024px) 46vw, 530px"/><div className="dimension-tag"><Icon name="ruler"/><span dir="ltr">{PRODUCT.dimensions}</span></div></div><div className="round-sticker"><Icon name="repeat"/>{t.heroSticker.map(line => <span key={line}>{line}</span>)}</div><Star className="hero-star"/><div className="image-annotation"><svg viewBox="0 0 75 40" aria-hidden="true"><path d="M70 30C45 42 11 31 10 5m0 0L2 15M10 5l13 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span>{t.imageNote}</span></div></div>
    <div className="hero-purchase"><div className="hero-price"><span className="main-price" dir="ltr">{PRODUCT.singlePrice}<span> {PRODUCT.currency}</span></span><span className="price-separator"/><button className="hero-bundle" onClick={() => { selectQuantity(2); document.getElementById("offres")?.scrollIntoView({ behavior: "smooth" }); }}><strong>{t.bundleShort}</strong><span>{t.savings}<Icon name="arrow"/></span></button></div><Cta className="hero-button" onClick={() => trackEvent("hero_cta_click")}>{t.order}</Cta><div className="hero-trust"><span><Icon name="truck"/>{t.shipping}</span><span><Icon name="box"/>{t.cod}</span></div><p className="hero-delivery"><span/>{t.delivery}</p></div>
    <div className="hero-bottom"><p>{t.heroNote}</p><div className="mini-eyes"><Eyes/></div></div>
  </section>;
}

function FeatureStrip({ t }: { t: Copy }) {
  return <div className="feature-strip"><div className="container">{t.features.map((feature, index) => <div key={feature}><Icon name={featureIcons[index]}/><span>{feature}</span>{index !== t.features.length - 1 && <span className="feature-spark" aria-hidden="true">✧</span>}</div>)}</div></div>;
}

function ProductDetails({ t }: { t: Copy }) {
  const [active, setActive] = useState(0);
  const photos = [{ name: "doodly-product-folded-clean", alt: t.alt.folded }, { name: "doodly-size-clean-100x150", alt: t.alt.size }, { name: "doodly-product-clean-standing", alt: t.alt.flatlay }];
  return <section className="section container product-details" id="produit"><div className="product-gallery"><div className="gallery-main"><Photo {...photos[active]} contain/><span className="gallery-label"><Icon name="heart"/>{t.detailsTabs[active]}</span></div><div className="gallery-thumbnails" role="group" aria-label={t.nav[0]}>{photos.map((photo, index) => <button key={photo.name} aria-pressed={index === active} className={active === index ? "active" : ""} onClick={() => setActive(index)} aria-label={t.detailsTabs[index]}><Image src={`/images/product/${photo.name}.png`} alt={photo.alt} width={80} height={88} sizes="80px"/><span>{t.detailsTabs[index]}</span></button>)}</div></div><div className="details-copy"><SectionHeading eyebrow={t.detailEyebrow} title={t.detailTitle} copy={t.detailCopy}/><div className="specs">{t.specs.map((spec, index) => <div className="spec" key={spec.label}><span className="spec-icon"><Icon name={(["ruler", "pen", "wash", "heart"] as const)[index]}/></span><div><strong>{spec.value}</strong><span>{spec.label}</span></div></div>)}</div><p className="safe-note"><Icon name="shield"/>{t.childFriendly}</p><Cta>{t.want}</Cta></div></section>;
}

function PricingSelector({ quantity, selectQuantity, t }: { quantity: Quantity; selectQuantity: (q: Quantity) => void; t: Copy }) {
  return <section className="offer-section section" id="offres"><div className="container"><SectionHeading eyebrow={t.offerEyebrow} title={t.offerTitle} copy={t.offerIntro} centered/><div className="pricing-grid">{([1, 2] as const).map(value => <article className={`pricing-card ${value === 2 ? "bundle-card" : ""} ${quantity === value ? "is-selected" : ""}`} key={value}>{value === 2 && <div className="popular-badge"><Icon name="spark"/>{t.popular}</div>}<div className={`pricing-illustration ${value === 2 ? "double-blanket" : ""}`} aria-hidden="true"><Image src="/images/product/doodly-product-clean-standing.png" width={140} height={170} sizes="140px" alt=""/>{value === 2 && <Image src="/images/product/doodly-product-clean-standing.png" width={140} height={170} sizes="140px" alt=""/>}</div><h3>{value === 1 ? t.single : t.double}</h3><p>{value === 1 ? t.singleDescription : t.doubleDescription}</p><div className="package-price"><strong dir="ltr">{value === 1 ? PRODUCT.singlePrice : PRODUCT.bundlePrice}<small> {PRODUCT.currency}</small></strong>{value === 2 && <s dir="ltr">{money(PRODUCT.singlePrice * 2)}</s>}</div><div className="saving-slot">{value === 2 && <span className="saving-badge">{t.savings}</span>}</div><div className="pricing-included"><Icon name="check"/>{t.included}</div><button className={`button ${value === 1 ? "button-outline" : ""}`} aria-pressed={quantity === value} onClick={() => { selectQuantity(value); document.getElementById("commander")?.scrollIntoView({ behavior: "smooth" }); }}>{quantity === value ? t.selected : t.choose}<Icon name={quantity === value ? "check" : "arrow"}/></button></article>)}</div><p className="offer-delivery"><Icon name="truck"/>{t.deliveryExtra}<span>·</span>{t.cod}</p></div></section>;
}

function Reviews({ language, t }: { language: Language; t: Copy }) {
  return <section className="section container reviews-section" id="avis"><SectionHeading eyebrow={t.reviewsEyebrow} title={t.reviewsTitle} copy={t.reviewsIntro} centered/><div className="reviews-grid">{(reviews.length ? reviews : [null, null, null]).map((review, index) => <article className={`review-card ${!review ? "placeholder-review" : ""}`} key={review?.id ?? index}>{review ? <><div className="review-rating" aria-label={`${review.rating}/5`}>{"★".repeat(Math.max(0, Math.min(5, review.rating)))}</div><p>{review.text[language]}</p><div className="review-author">{review.photo && <Image src={review.photo} width={40} height={40} alt={review.firstName}/>}<strong>{review.firstName}{review.city ? ` · ${review.city}` : ""}</strong></div></> : <><span className="quote-mark" aria-hidden="true">“</span><span className="review-status">{t.reviewStatus}</span><h3>{t.reviewPlaceholder}</h3><p>{t.reviewNote}</p><div className="review-author"><span className="avatar-placeholder"><Icon name="heart"/></span><span>{t.reviewName}</span></div></>}</article>)}</div></section>;
}

export function Storefront() {
  const [language, setLanguage] = useState<Language>("fr");
  const [quantity, setQuantity] = useState<Quantity>(1);
  const [orderVisible, setOrderVisible] = useState(false);
  const t = translations[language];
  useEffect(() => {
    try { const saved = localStorage.getItem("doodly-language"); if (saved === "fr" || saved === "ar") setLanguage(saved); } catch { /* Storage may be disabled. */ }
  }, []);
  useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = language === "ar" ? "rtl" : "ltr"; }, [language]);
  useEffect(() => {
    const orderSection = document.getElementById("commander");
    if (!orderSection) return;
    const observer = new IntersectionObserver(([entry]) => setOrderVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(orderSection);
    return () => observer.disconnect();
  }, []);
  function changeLanguage(value: Language) {
    setLanguage(value);
    try { localStorage.setItem("doodly-language", value); } catch { /* Optional persistence. */ }
    trackEvent("language_change", { language: value });
  }
  function selectQuantity(value: Quantity) { setQuantity(value); trackEvent(value === 1 ? "select_single_blanket" : "select_two_blankets", { quantity: value }); }

  return <div className="storefront" dir={language === "ar" ? "rtl" : "ltr"} lang={language}><a className="skip-link" href="#main">{t.skip}</a><Header language={language} changeLanguage={changeLanguage} t={t}/><main id="main"><Hero t={t} selectQuantity={selectQuantity}/><FeatureStrip t={t}/>
    <section className="section container benefits-section"><SectionHeading eyebrow={t.benefitEyebrow} title={t.benefitTitle} copy={t.benefitIntro} centered/><div className="benefits-grid">{t.benefits.map((benefit, index) => <article className={`benefit-card benefit-${index}`} key={benefit.title}><span className="benefit-icon"><Icon name={(["spark", "people", "repeat"] as const)[index]}/></span><h3>{benefit.title}</h3><p>{benefit.text}</p><span className="benefit-number" aria-hidden="true">0{index + 1}</span></article>)}</div></section>
    <section className="how-section section" id="comment-ca-marche"><div className="container"><div className="how-heading"><SectionHeading eyebrow={t.howEyebrow} title={t.howTitle} copy={t.howIntro}/><svg className="loop-arrow" viewBox="0 0 150 85" aria-hidden="true"><path d="M4 28c24 46 53 27 57 7S36 12 36 35s72 44 100-20m0 0-20 10m20-10 2 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg></div><div className="steps-grid">{t.steps.map((step, index) => <article className={`step-card step-${index}`} key={step.title}><div className="step-image"><Photo name={(["doodly-coloring-closeup", "doodly-machine-washable", "doodly-product-clean-standing"] as const)[index]} alt={([t.alt.closeup, t.alt.wash, t.alt.flatlay])[index]} contain={index === 2} sizes="(max-width: 640px) 90vw, 31vw"/><span className="step-number">0{index + 1}</span></div><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></div></section>
    <ProductDetails t={t}/>
    <section className="lifestyle-section"><div className="container lifestyle-grid"><Photo name="doodly-kids-coloring" alt={t.alt.kids}/><div className="lifestyle-copy"><Star/><SectionHeading eyebrow={t.lifestyleEyebrow} title={t.lifestyleTitle} copy={t.lifestyleCopy}/><p className="handwritten">{t.lifestyleNote}</p><Cta className="button-dark">{t.want}</Cta></div></div></section>
    <section className="section container cozy-section"><div className="cozy-copy"><p className="eyebrow">{t.cozyEyebrow}</p><h2>{t.cozyTitle}</h2><p className="section-copy">{t.cozyCopy}</p><span className="cozy-tag"><Icon name="heart"/>{t.cozyTag}</span></div><div className="cozy-image"><Photo name="doodly-cozy-blanket" alt={t.alt.cozy}/><div className="cozy-eye"><Eyes/></div><span className="cozy-doodle" aria-hidden="true">♡</span></div></section>
    <PricingSelector quantity={quantity} selectQuantity={selectQuantity} t={t}/><Reviews language={language} t={t}/>
    <section className="order-section section" id="commander"><div className="container order-grid"><div className="order-copy"><SectionHeading eyebrow={t.orderEyebrow} title={t.orderTitle} copy={t.orderIntro}/><div className="order-product-mini"><Photo name="doodly-product-folded-clean" alt={t.alt.folded} contain sizes="110px"/><div><strong>{PRODUCT.name}</strong><span>{PRODUCT.dimensions}</span><span>{t.included}</span></div></div><div className="order-trust">{[t.cod, t.country, t.returns, t.childFriendly].map((text, index) => <div key={text}><Icon name={(["box", "truck", "repeat", "shield"] as const)[index]}/><span>{text}</span></div>)}</div><p className="handwritten order-scribble">{t.heroNote}<span aria-hidden="true"> ✧</span></p></div><OrderForm t={t} language={language} quantity={quantity} setQuantity={selectQuantity}/></div></section>
    <section className="section container faq-section" id="faq"><div className="faq-intro"><Eyes/><SectionHeading eyebrow={t.faqEyebrow} title={t.faqTitle}/><Star/></div><div className="faq-list">{t.faqs.map((faq, index) => <details key={index} name="doodly-faq"><summary>{faq.q}<Icon name="plus"/></summary><p>{faq.a}</p></details>)}</div></section>
    <section className="final-section"><div className="container"><Star className="final-star"/><p className="eyebrow">{t.finalCopy}</p><h2>{t.finalTitle}</h2><Cta className="button-dark">{t.orderMine}</Cta><p className="final-prices"><b dir="ltr">{money(PRODUCT.singlePrice)}</b><span>·</span><b>{t.bundleShort}</b></p><p className="final-shipping">{t.deliveryExtra.replace("+ ", "")}<span>·</span>{t.cod}</p><div className="final-trust"><span><Icon name="repeat"/>{t.returns}</span><span><Icon name="wash"/>{t.features[0]}</span><span><Icon name="pen"/>{t.features[1]}</span></div><Eyes className="final-eyes"/></div></section>
    </main><footer className="site-footer"><div className="container"><div className="footer-top"><div><a href="#accueil" aria-label="Doodly"><Logo full/></a><p>{t.footerTagline}</p></div><div className="footer-info"><span>{t.country}</span><span>{t.returns}</span></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Doodly</span><div className="footer-placeholders">{t.footerPlaceholders.map(item => <span key={item}>{item}</span>)}</div><span>{t.footerEnd}</span></div></div></footer><div className={`mobile-sticky-cta ${orderVisible ? "is-hidden" : ""}`} inert={orderVisible}><div><strong dir="ltr">{money(PRODUCT.singlePrice)}</strong><small>{t.cod}</small></div><Cta>{t.order}</Cta></div></div>;
}

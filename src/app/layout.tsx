import type { Metadata } from "next";
import "@fontsource-variable/nunito";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/noto-sans-arabic";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: "Doodly — La couverture à colorier, laver et recommencer",
  description: "Une couverture à colorier lavable et réutilisable pour les enfants. 12 feutres inclus, un dos en coton doux et la livraison partout au Maroc. Paiement à la livraison.",
  openGraph: {
    title: "Doodly — Coloriez-le. Lavez-le. Recommencez.",
    description: "Une grande couverture. Une infinité d’aventures. Découvrez Doodly, la couverture à colorier lavable et réutilisable, livrée au Maroc.",
    locale: "fr_MA", alternateLocale: "ar_MA", type: "website", siteName: "Doodly",
    images: [{ url: "/images/product/doodly-kids-coloring.png", width: 1122, height: 1402, alt: "Des moments créatifs avec Doodly" }],
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr" dir="ltr" suppressHydrationWarning><body>{children}</body></html>;
}

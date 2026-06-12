import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteNav from "./components/SiteNav";
import SiteFooter from "./components/SiteFooter";

export const metadata: Metadata = {
  title: "TAPGOO — Covoiturage quotidien & bornes partagées",
  description:
    "TAPGOO connecte conducteurs, passagers et propriétaires de bornes. Covoiturage en partage de frais et recharge électrique près de chez vous.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c1f17",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteNav />
        <div className="pb-20 md:pb-0">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}

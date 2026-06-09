import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "TAPGOO - Mobilité partagée", description: "Covoiturage, recharge électrique et solutions entreprises." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}

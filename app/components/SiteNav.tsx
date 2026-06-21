"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BatteryCharging,
  Building2,
  Car,
  Home,
  MessageCircle,
  SquareParking,
  UserRound,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

const tabs = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/covoiturage", label: "Covoiturage", icon: Car },
  { href: "/bornes", label: "Bornes", icon: BatteryCharging },
  { href: "/parking", label: "Parking", icon: SquareParking },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/dashboard", label: "Espace", icon: UserRound },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const avatar = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <>
      {/* Barre haute */}
      <header className="sticky top-0 z-40 border-b border-[#0c1f17]/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2" aria-label="Accueil TAPGOO">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            <TopLink href="/covoiturage" active={pathname.startsWith("/covoiturage")}>Covoiturage</TopLink>
            <TopLink href="/bornes" active={pathname.startsWith("/bornes")}>Bornes</TopLink>
            <TopLink href="/parking" active={pathname.startsWith("/parking")}>Parking</TopLink>
            <TopLink href="/entreprises" active={pathname.startsWith("/entreprises")}>Entreprises</TopLink>
            <TopLink href="/messages" active={pathname.startsWith("/messages")}>Messages</TopLink>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-full bg-[#0c1f17] py-1.5 pl-1.5 pr-4 text-sm font-bold text-white"
              >
                {avatar ? (
                  <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00b868]">
                    <UserRound className="h-4 w-4" />
                  </span>
                )}
                Mon espace
              </Link>
            ) : (
              <Link
                href="/connexion"
                className="rounded-full bg-[#00b868] px-5 py-2.5 text-sm font-bold text-white"
              >
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Barre d'onglets mobile */}
      <nav
        aria-label="Navigation mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#0c1f17]/10 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-6">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${
                  active ? "text-[#00b868]" : "text-[#5b6b62]"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function TopLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${
        active ? "bg-[#00b868]/10 text-[#008f51]" : "text-[#0c1f17] hover:bg-[#0c1f17]/5"
      }`}
    >
      {children}
    </Link>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <circle cx="5" cy="21" r="3.4" fill="#00b868" />
        <path d="M7.5 18.5 C 12 13, 14 13, 18.5 7.5" stroke="#00b868" strokeWidth="2.4" strokeDasharray="0.1 5" strokeLinecap="round" fill="none" />
        <path d="M21 2 a4 4 0 0 1 4 4 c0 3-4 7-4 7 s-4-4-4-7 a4 4 0 0 1 4-4z" fill={light ? "#ffffff" : "#0c1f17"} />
      </svg>
      <span className={`font-display text-xl font-extrabold tracking-tight ${light ? "text-white" : "text-[#0c1f17]"}`}>
        TAP<span className="text-[#00b868]">GOO</span>
      </span>
    </span>
  );
}

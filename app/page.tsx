"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fbfbf8] text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
        <Link href="/" className="text-2xl font-black tracking-tight">
          TAP<span className="text-emerald-600">GOO</span>
        </Link>

        <nav className="hidden gap-8 text-sm font-bold md:flex">
          <Link href="/covoiturage">Covoiturage</Link>
          <Link href="/bornes">Recharge</Link>
          <Link href="/entreprises">Entreprises</Link>
        </nav>

        <div className="flex items-center gap-4 text-sm font-bold">
          <Link href="/connexion">Connexion</Link>
          <Link
            href="/connexion"
            className="rounded-full bg-emerald-600 px-6 py-3 text-white shadow-lg shadow-emerald-600/20"
          >
            Inscription
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <div>
          <h1 className="text-6xl font-black leading-[0.95] tracking-tight md:text-7xl">
            Covoiturez.
            <br />
            Rechargez.
            <br />
            <span className="text-emerald-600">Économisez.</span>
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-8 text-slate-600">
            TAPGOO réunit covoiturage, recharge électrique et solutions
            entreprises dans une expérience claire, rapide et locale.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/covoiturage"
              className="rounded-full bg-emerald-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-emerald-600/20"
            >
              Trouver un trajet →
            </Link>

            <Link
              href="/connexion"
              className="rounded-full bg-white px-8 py-4 text-sm font-black text-slate-700 shadow"
            >
              Inscription / Connexion
            </Link>
          </div>

          <div className="mt-10 flex gap-5">
            {[
              ["🚗", "Covoiturage"],
              ["⚡", "Recharge"],
              ["🏢", "Entreprises"],
            ].map(([icon, label]) => (
              <div key={label} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl shadow-lg">
                  {icon}
                </div>
                <div className="mt-3 text-xs font-black uppercase text-slate-600">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <Image
            src="/tapgoo-network.png"
            alt="Écosystème de mobilité TAPGOO"
            width={900}
            height={650}
            priority
            className="w-full rounded-[2rem] bg-white object-contain shadow-2xl shadow-slate-200"
          />
        </div>
      </section>
    </main>
  );
}
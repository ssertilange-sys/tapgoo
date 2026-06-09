"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { signInWithGoogle } from "../../lib/auth";

export default function ConnexionPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfbf8] px-6 text-slate-950">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl shadow-slate-200">
        <Link href="/" className="text-2xl font-black tracking-tight">
          TAP<span className="text-emerald-600">GOO</span>
        </Link>

        <h1 className="mt-10 text-4xl font-black tracking-tight">
          Connexion
        </h1>

        <p className="mt-4 text-slate-600">
          Connectez-vous pour accéder à vos trajets, réservations et services TAPGOO.
        </p>

        <button
          onClick={() => signInWithGoogle("/dashboard")}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-emerald-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-emerald-600/20"
        >
          Continuer avec Google
          <ArrowRight className="h-5 w-5" />
        </button>

        <Link
          href="/"
          className="mt-6 block text-center text-sm font-bold text-slate-500"
        >
          Retour à l'accueil
        </Link>
      </div>
    </main>
  );
}
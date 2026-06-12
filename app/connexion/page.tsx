"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { signInWithGoogle } from "../../lib/auth";

export default function ConnexionPage() {
  return (
    <main className="flex min-h-[75vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 ring-1 ring-[#0c1f17]/5">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Connexion</h1>
        <p className="mt-3 text-sm leading-6 text-[#5b6b62]">
          Accédez à vos trajets, réservations, bornes et messages.
        </p>

        <button
          onClick={() => signInWithGoogle("/dashboard")}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-[#00b868] px-6 py-4 text-sm font-bold text-white hover:bg-[#008f51]"
        >
          Continuer avec Google
          <ArrowRight className="h-5 w-5" />
        </button>

        <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-[#5b6b62]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#00b868]" />
          Votre compte Google sert uniquement à vous identifier. TAPGOO ne
          publie jamais rien en votre nom.
        </p>

        <Link href="/" className="mt-6 block text-center text-sm font-bold text-[#5b6b62] hover:text-[#0c1f17]">
          Retour à l'accueil
        </Link>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import {
  BarChart3,
  BatteryCharging,
  Building2,
  Leaf,
  Loader2,
  ShieldCheck,
  Users,
} from "lucide-react";

export default function EntreprisesPage() {
  const [form, setForm] = useState({ nom: "", email: "", entreprise: "", message: "", website: "" });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setFeedback({ ok: true, text: "Demande envoyée. Notre équipe vous recontacte sous 48 h ouvrées." });
      setForm({ nom: "", email: "", entreprise: "", message: "", website: "" });
    } catch {
      setFeedback({ ok: false, text: "L'envoi a échoué. Vérifiez votre connexion et réessayez." });
    } finally {
      setSending(false);
    }
  }

  return (
    <main>
      {/* Hero */}
      <section className="bg-[#0c1f17] text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#00b868]">TAPGOO Entreprises</p>
          <h1 className="font-display mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
            La mobilité de vos équipes, mutualisée et mesurable
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/70">
            Covoiturage domicile-travail entre salariés, bornes de recharge
            ouvertes sur vos sites, et indicateurs prêts pour votre bilan
            carbone et votre plan de mobilité employeur.
          </p>
        </div>
      </section>

      {/* Bénéfices */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Benefit
            icon={Users}
            title="Covoiturage salariés"
            text="Vos équipes se regroupent par site et par horaires. Moins de places de parking saturées, des trajets moins chers pour tous."
          />
          <Benefit
            icon={BatteryCharging}
            title="Bornes mutualisées"
            text="Vos bornes servent vos salariés en journée et se rentabilisent en dehors des heures de bureau, en restant sous votre contrôle."
          />
          <Benefit
            icon={BarChart3}
            title="Reporting carbone"
            text="Kilomètres partagés, CO₂ évité, taux d'adoption : des indicateurs exportables pour votre BEGES et votre PDM."
          />
          <Benefit
            icon={ShieldCheck}
            title="Cadre maîtrisé"
            text="Accès réservés à vos salariés si vous le souhaitez, partage de frais conforme au Code des transports, données hébergées en Europe."
          />
        </div>
      </section>

      {/* Forfait mobilités durables */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 md:px-8">
          <div>
            <Leaf className="h-8 w-8 text-[#00b868]" />
            <h2 className="font-display mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">
              Un levier pour le forfait mobilités durables
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#5b6b62]">
              Le covoiturage domicile-travail est éligible au forfait mobilités
              durables. TAPGOO vous fournit les justificatifs d'usage de vos
              salariés pour simplifier sa mise en place, et vous aide à
              valoriser ces trajets dans votre politique RSE.
            </p>
          </div>
          <div className="rounded-3xl bg-[#f4f8f5] p-7">
            <h3 className="font-display text-lg font-extrabold">Ce que comprend l'offre</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#5b6b62]">
              <li className="flex gap-2"><Dot /> Espace entreprise dédié et communautés par site</li>
              <li className="flex gap-2"><Dot /> Gestion des bornes : créneaux, tarifs, accès</li>
              <li className="flex gap-2"><Dot /> Tableau de bord d'impact et exports</li>
              <li className="flex gap-2"><Dot /> Accompagnement au lancement auprès des équipes</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Formulaire */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <div className="grid gap-8 rounded-3xl bg-[#0c1f17] p-7 text-white md:grid-cols-2 md:p-10">
          <div>
            <Building2 className="h-8 w-8 text-[#00b868]" />
            <h2 className="font-display mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">
              Parlons de votre projet
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/70">
              Décrivez votre site, le nombre de salariés concernés et vos
              équipements existants. Nous revenons vers vous avec une
              proposition adaptée, sans engagement.
            </p>
          </div>

          <form onSubmit={submit} className="grid gap-3">
            <input
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Votre nom"
              aria-label="Votre nom"
              required
              maxLength={100}
              className="rounded-2xl bg-white px-4 py-3.5 text-[#0c1f17] outline-none placeholder:text-[#5b6b62]"
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email professionnel"
              aria-label="Email professionnel"
              required
              maxLength={200}
              className="rounded-2xl bg-white px-4 py-3.5 text-[#0c1f17] outline-none placeholder:text-[#5b6b62]"
            />
            <input
              value={form.entreprise}
              onChange={(e) => setForm({ ...form, entreprise: e.target.value })}
              placeholder="Entreprise"
              aria-label="Entreprise"
              required
              maxLength={150}
              className="rounded-2xl bg-white px-4 py-3.5 text-[#0c1f17] outline-none placeholder:text-[#5b6b62]"
            />
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Votre besoin (site, effectif, bornes existantes…)"
              aria-label="Votre message"
              required
              rows={4}
              maxLength={5000}
              className="resize-none rounded-2xl bg-white px-4 py-3.5 text-[#0c1f17] outline-none placeholder:text-[#5b6b62]"
            />
            {/* Champ anti-robot, invisible pour les humains */}
            <input
              type="text"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            {feedback && (
              <p
                role="status"
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  feedback.ok ? "bg-[#00b868]/15 text-[#7ee2b8]" : "bg-red-500/15 text-red-300"
                }`}
              >
                {feedback.text}
              </p>
            )}
            <button
              disabled={sending}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#00b868] px-6 py-3.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              Envoyer ma demande
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function Benefit({ icon: Icon, title, text }: any) {
  return (
    <div className="rounded-3xl bg-white p-6 ring-1 ring-[#0c1f17]/5">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00b868]/10">
        <Icon className="h-6 w-6 text-[#008f51]" />
      </span>
      <h2 className="font-display mt-4 text-lg font-extrabold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#5b6b62]">{text}</p>
    </div>
  );
}

function Dot() {
  return <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00b868]" />;
}

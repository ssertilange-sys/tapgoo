"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BatteryCharging,
  Building2,
  Car,
  Leaf,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"trajet" | "borne">("trajet");
  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState("");
  const [date, setDate] = useState("");
  const [ville, setVille] = useState("");

  function search() {
    if (mode === "trajet") {
      const p = new URLSearchParams();
      if (depart) p.set("depart", depart);
      if (arrivee) p.set("arrivee", arrivee);
      if (date) p.set("date", date);
      router.push(`/covoiturage?${p.toString()}`);
    } else {
      const p = new URLSearchParams();
      if (ville) p.set("ville", ville);
      router.push(`/bornes?${p.toString()}`);
    }
  }

  return (
    <main>
      {/* Hero */}
      <section className="bg-[#0c1f17] text-white">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-12 md:px-8 md:pb-24 md:pt-20">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#00b868]">
            Mobilité partagée
          </p>
          <h1 className="font-display mt-4 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Partagez la route.
            <br />
            Partagez la recharge.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/70">
            Covoiturage du quotidien en partage de frais et bornes électriques
            ouvertes près de chez vous. Une seule plateforme, pensée pour les
            trajets de tous les jours.
          </p>

          {/* Recherche unifiée */}
          <div className="mt-10 max-w-3xl rounded-3xl bg-white p-3 text-[#0c1f17] shadow-2xl shadow-black/30">
            <div className="flex gap-2 px-2 pt-1" role="tablist" aria-label="Type de recherche">
              <ModeTab
                active={mode === "trajet"}
                onClick={() => setMode("trajet")}
                icon={Car}
                label="Un trajet"
              />
              <ModeTab
                active={mode === "borne"}
                onClick={() => setMode("borne")}
                icon={BatteryCharging}
                label="Une borne"
              />
            </div>

            {mode === "trajet" ? (
              <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_0.8fr_auto]">
                <Field icon={MapPin}>
                  <input
                    value={depart}
                    onChange={(e) => setDepart(e.target.value)}
                    placeholder="Départ"
                    className="w-full bg-transparent outline-none placeholder:text-[#5b6b62]"
                    aria-label="Ville de départ"
                  />
                </Field>
                <Field icon={MapPin}>
                  <input
                    value={arrivee}
                    onChange={(e) => setArrivee(e.target.value)}
                    placeholder="Arrivée"
                    className="w-full bg-transparent outline-none placeholder:text-[#5b6b62]"
                    aria-label="Ville d'arrivée"
                  />
                </Field>
                <Field>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent outline-none"
                    aria-label="Date du trajet"
                  />
                </Field>
                <SearchButton onClick={search} />
              </div>
            ) : (
              <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                <Field icon={MapPin}>
                  <input
                    value={ville}
                    onChange={(e) => setVille(e.target.value)}
                    placeholder="Ville ou code postal"
                    className="w-full bg-transparent outline-none placeholder:text-[#5b6b62]"
                    aria-label="Ville de recherche de borne"
                  />
                </Field>
                <SearchButton onClick={search} />
              </div>
            )}
          </div>

          {/* Ligne de trajet signature */}
          <div className="mt-12 hidden items-center gap-3 md:flex" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-[#00b868]" />
            <span className="trip-dash w-64" />
            <MapPin className="h-5 w-5 text-[#00b868]" />
            <span className="text-sm text-white/50">
              Des trajets du quotidien, près de chez vous.
            </span>
          </div>
        </div>
      </section>

      {/* Deux services */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Une plateforme, deux façons de partager
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <ServiceCard
            href="/covoiturage"
            icon={Car}
            title="Covoiturage quotidien"
            text="Trouvez un trajet domicile-travail ou proposez vos places libres. La participation demandée couvre uniquement les frais : simple et conforme."
            cta="Voir les trajets"
          />
          <ServiceCard
            href="/bornes"
            icon={BatteryCharging}
            title="Bornes partagées"
            text="Rechargez sur une borne ouverte par un particulier ou une entreprise, ou rentabilisez la vôtre quand elle est libre."
            cta="Trouver une borne"
          />
          <ServiceCard
            href="/entreprises"
            icon={Building2}
            title="Entreprises"
            text="Covoiturage salariés, bornes mutualisées sur site et indicateurs de mobilité durable pour vos équipes."
            cta="Découvrir l'offre pro"
          />
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-8">
          <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Comment ça marche
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <Step
              icon={Search}
              title="Recherchez"
              text="Indiquez votre départ, votre arrivée ou votre ville. Les trajets et bornes disponibles s'affichent immédiatement."
            />
            <Step
              icon={Users}
              title="Réservez"
              text="Réservez votre place ou votre créneau de recharge en un geste, puis échangez avec l'autre membre par messagerie."
            />
            <Step
              icon={Leaf}
              title="Partagez"
              text="Moins de voitures sur la route, des frais divisés et une recharge plus accessible : tout le monde y gagne."
            />
          </div>
        </div>
      </section>

      {/* Confiance + CTA entreprise */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <div className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
          <div className="rounded-3xl bg-white p-7 ring-1 ring-[#0c1f17]/5">
            <ShieldCheck className="h-7 w-7 text-[#00b868]" />
            <h2 className="font-display mt-4 text-xl font-extrabold">
              Pensé pour la confiance
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#5b6b62]">
              Profils vérifiés, messagerie intégrée et partage de frais encadré
              par le Code des transports. Vous savez toujours avec qui vous
              roulez et combien vous participez.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-3xl bg-[#0c1f17] p-7 text-white">
            <div>
              <h2 className="font-display text-xl font-extrabold">
                Votre entreprise passe à la mobilité partagée
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">
                Mettez en relation vos salariés pour leurs trajets quotidiens et
                ouvrez vos bornes en dehors des heures de bureau. TAPGOO vous
                accompagne de l'installation au reporting.
              </p>
            </div>
            <Link
              href="/entreprises"
              className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[#00b868] px-6 py-3 text-sm font-bold text-white"
            >
              Demander une démo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function ModeTab({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
        active ? "bg-[#00b868]/10 text-[#008f51]" : "text-[#5b6b62] hover:bg-[#0c1f17]/5"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Field({ icon: Icon, children }: any) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-[#f4f8f5] px-4 py-3.5">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-[#00b868]" />}
      {children}
    </div>
  );
}

function SearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-2xl bg-[#00b868] px-6 py-3.5 font-bold text-white hover:bg-[#008f51]"
    >
      <Search className="h-4 w-4" />
      Rechercher
    </button>
  );
}

function ServiceCard({ href, icon: Icon, title, text, cta }: any) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-3xl bg-white p-7 ring-1 ring-[#0c1f17]/5 transition hover:ring-[#00b868]/40"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00b868]/10">
        <Icon className="h-6 w-6 text-[#008f51]" />
      </span>
      <h3 className="font-display mt-5 text-lg font-extrabold">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-[#5b6b62]">{text}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#008f51]">
        {cta}
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function Step({ icon: Icon, title, text }: any) {
  return (
    <div>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00b868]/10">
        <Icon className="h-6 w-6 text-[#008f51]" />
      </span>
      <h3 className="font-display mt-4 text-lg font-extrabold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#5b6b62]">{text}</p>
    </div>
  );
}

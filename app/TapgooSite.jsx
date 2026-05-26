"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  ArrowRight,
  Users,
  Leaf,
  Zap,
  Menu,
  X,
  Search,
  Star,
  ShieldCheck,
  Wallet,
  PlugZap,
  MapPin,
  Calendar,
  BarChart3,
  Building2,
  Sparkles,
  CheckCircle2,
  Mail,
  Phone,
  Target,
  Heart,
  Lightbulb,
  Globe,
} from "lucide-react";

/* ----------------------------------------------------------
   PHOTO DU HERO
   ---------------------------------------------------------- */
const heroPhoto = "/hero-tapgoo.jpg";
const heroPhotoFallback =
  "https://images.unsplash.com/photo-1673337188103-c196140adebd?q=80&w=2400&auto=format&fit=crop";

function handleHeroPhotoError(e) {
  if (e.currentTarget.src.indexOf(heroPhotoFallback) === -1) {
    e.currentTarget.src = heroPhotoFallback;
  } else {
    e.currentTarget.style.display = "none";
  }
}

/* ----------------------------------------------------------
   IMAGES MÉTIER
   ---------------------------------------------------------- */
const IMAGES = {
  covoiturage: "/covoiturage-amis.jpg",
  rechargeEntreprise: "/recharge-mutualisee-entreprise.jpg",
  salariesEntreprise: "/salaries-mobilite-entreprise.jpg",
};
const IMAGES_FALLBACK = {
  covoiturage:
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1800&auto=format&fit=crop",
  rechargeEntreprise:
    "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=1800&auto=format&fit=crop",
  salariesEntreprise:
    "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1800&auto=format&fit=crop",
};

function handleImageError(e) {
  const src = e.currentTarget.src;
  const key = Object.keys(IMAGES).find((k) => src.indexOf(IMAGES[k]) !== -1);
  if (key && src.indexOf(IMAGES_FALLBACK[key]) === -1) {
    e.currentTarget.src = IMAGES_FALLBACK[key];
  } else {
    e.currentTarget.style.display = "none";
  }
}

const NAV_ITEMS = [
  { label: "Accueil",     href: "#accueil" },
  { label: "Covoiturage", href: "#covoiturage" },
  { label: "Recharge",    href: "#recharge" },
  { label: "Entreprises", href: "#entreprises" },
  { label: "À propos",    href: "#a-propos" },
  { label: "Contact",     href: "#contact" },
];

const animations = `
  @keyframes tapgooRise {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .rise1 { animation: tapgooRise 0.7s ease-out 0.1s both; }
  .rise2 { animation: tapgooRise 0.7s ease-out 0.2s both; }
  .rise3 { animation: tapgooRise 0.7s ease-out 0.3s both; }
  .rise4 { animation: tapgooRise 0.7s ease-out 0.45s both; }
`;

export default function TapgooLanding() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="bg-white text-neutral-900">
      <style>{animations}</style>

      <Header
        scrolled={scrolled}
        user={user}
        onOpenMobile={() => setMobileOpen(true)}
      />
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <Hero />
      <Audiences />
      <Covoiturage />
      <Recharge />
      <Entreprises />
      <APropos />
      <Contact />
      <Footer />
    </div>
  );
}

/* HEADER */
function Header({ scrolled, user, onOpenMobile }) {
  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] || "Utilisateur";

  return (
    <header
      className={
        "fixed inset-x-0 top-0 z-30 transition-all duration-300 " +
        (scrolled
          ? "bg-neutral-950/90 backdrop-blur-xl shadow-lg border-b border-white/5"
          : "bg-transparent")
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <a href="#accueil" className="text-white">
          <div className="text-2xl font-black tracking-tight md:text-3xl">
            TAP<span className="text-emerald-400">GOO</span>
          </div>
        </a>

        <nav className="hidden items-center gap-8 text-sm font-semibold xl:flex">
          {NAV_ITEMS.map((item, i) => (
            <a
              key={item.label}
              href={item.href}
              className={
                i === 0
                  ? "text-emerald-400 transition hover:text-emerald-300"
                  : "text-white/85 transition hover:text-white"
              }
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#audiences"
            className="hidden text-sm font-semibold text-white/85 transition hover:text-emerald-400 lg:inline-flex"
          >
            Espace pro →
          </a>

          {user ? (
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-md md:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 font-bold text-black">
                {firstName[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-white">
                Bonjour {firstName}
              </span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.reload();
                }}
                className="text-xs text-white/70 transition hover:text-red-400"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <button
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                });
                if (error) {
                  console.error(error);
                  alert("Erreur connexion Google");
                }
              }}
              className="hidden rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-2 text-sm font-medium text-emerald-300 backdrop-blur-md transition hover:bg-emerald-400/20 md:block"
            >
              Connexion
            </button>
          )}

          <button
            onClick={onOpenMobile}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur transition hover:bg-white/10 xl:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileMenu({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 xl:hidden">
      <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-neutral-950 px-8 py-8 shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center justify-between text-white">
          <div>
            <div className="text-2xl font-black tracking-tight">
              TAP<span className="text-emerald-400">GOO</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-10 flex flex-col gap-1 text-lg font-bold">
          {NAV_ITEMS.map((item, i) => (
            <a
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={
                "rounded-2xl px-4 py-3 transition " +
                (i === 0
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-white/85 hover:bg-white/5 hover:text-white")
              }
            >
              {item.label}
            </a>
          ))}
          <a
            href="#audiences"
            onClick={onClose}
            className="mt-4 rounded-2xl border border-emerald-400/30 px-4 py-3 text-emerald-400 transition hover:bg-emerald-500/10"
          >
            Espace pro →
          </a>
        </nav>

        <button className="mt-auto rounded-full bg-emerald-500 px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-emerald-600">
          Se connecter
        </button>
      </div>
    </div>
  );
}

/* HERO */
function Hero() {
  return (
    <section id="accueil" className="relative w-full overflow-hidden bg-neutral-950 text-white">

      {/* ----- MOBILE : photo en haut, contenu en dessous ----- */}
      <div className="md:hidden">
        <div
          className="relative w-full overflow-hidden bg-neutral-900"
          style={{ height: "55vh", minHeight: "320px", maxHeight: "500px" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-emerald-950 to-emerald-900" />
          <img
            src={heroPhoto}
            alt=""
            className="absolute inset-0 h-full w-full"
            style={{ objectFit: "cover", objectPosition: "center" }}
            onError={handleHeroPhotoError}
          />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-neutral-950 to-transparent" />
        </div>

        <div className="px-6 pb-14 pt-8">
          <h1 className="rise1 text-5xl font-black uppercase leading-none tracking-tight">
            La mobilité<br />
            <span className="text-emerald-400">partagée.</span>
          </h1>

          <div className="rise2 mt-4 text-base font-bold uppercase tracking-widest text-white/90">
            Pour un avenir durable
          </div>

          <p className="rise3 mt-5 text-base leading-7 text-white/75">
            TAPGOO connecte conducteurs, passagers et entreprises autour d'une
            mobilité plus intelligente, économique et écologique.
          </p>

          <div className="rise3 mt-7">
            <button className="group inline-flex items-center gap-2 rounded-full bg-emerald-500 px-7 py-3.5 text-base font-bold text-white shadow-xl transition hover:bg-emerald-600">
              Rejoindre TAPGOO
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Formulaire de recherche rapide */}
          <div className="rise3 mt-8 rounded-3xl bg-white p-4 shadow-2xl">
            <div className="grid gap-3">
              <input
                type="text"
                placeholder="Départ"
                className="rounded-2xl border border-neutral-200 px-4 py-3 text-black outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder="Destination"
                className="rounded-2xl border border-neutral-200 px-4 py-3 text-black outline-none focus:border-emerald-500"
              />
              <input
                type="date"
                className="rounded-2xl border border-neutral-200 px-4 py-3 text-black outline-none focus:border-emerald-500"
              />
              <button className="rounded-2xl bg-emerald-500 px-6 py-3 font-bold text-white transition hover:bg-emerald-400">
                Rechercher
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ----- DESKTOP : full-bleed ----- */}
      <div className="relative hidden min-h-screen md:block">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-emerald-950 to-emerald-900" />
          <img
            src={heroPhoto}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            onError={handleHeroPhotoError}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-between px-6 pb-12 pt-28 lg:px-10 lg:pb-16 lg:pt-32">
          <div className="max-w-2xl">
            <h1 className="rise1 text-5xl font-black uppercase leading-none tracking-tight md:text-6xl lg:text-7xl xl:text-8xl">
              La mobilité<br />
              <span className="text-emerald-400">partagée.</span>
            </h1>

            <div className="rise2 mt-5 text-lg font-bold uppercase tracking-widest text-white/90 md:text-xl">
              Pour un avenir durable
            </div>

            <p className="rise3 mt-7 max-w-md text-base leading-7 text-white/75">
              TAPGOO connecte conducteurs, passagers et entreprises autour d'une
              mobilité plus intelligente, économique et écologique.
            </p>

            <div className="rise3 mt-9">
              <button className="group inline-flex items-center gap-2 rounded-full bg-emerald-500 px-7 py-3.5 text-base font-bold text-white shadow-xl transition hover:bg-emerald-600">
                Rejoindre TAPGOO
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-emerald-400" />
      <div>
        <div className="text-2xl font-black leading-none md:text-3xl">{value}</div>
        <div className="mt-1.5 text-xs font-medium uppercase tracking-wider text-white/65">{label}</div>
      </div>
    </div>
  );
}

/* AUDIENCES */
function Audiences() {
  return (
    <section id="audiences" className="relative bg-white py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="text-center">
          <Label>Pour qui ?</Label>
          <h2 className="mt-5 text-3xl font-black uppercase leading-none tracking-tight md:text-4xl lg:text-5xl">
            Une plateforme,<br />
            <span className="text-emerald-600">trois usages.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600">
            Que vous soyez conducteur, entreprise ou collectivité — TAPGOO
            s'adapte à votre besoin de mobilité.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <AudienceCard
            icon={Users}
            audience="Particuliers"
            title="Bougez moins cher, ensemble."
            benefits={[
              "Trouvez ou proposez des trajets",
              "Partagez les frais en toute légalité",
              "Réduisez votre empreinte carbone",
              "Compte mobilité intégré",
            ]}
            cta="Trouver un trajet"
          />
          <AudienceCard
            icon={Building2}
            audience="Entreprises"
            title="Une mobilité salariés pilotée."
            benefits={[
              "Bornes de recharge mutualisées",
              "Reporting CO₂ et indicateurs ESG",
              "Compte mobilité par salarié",
              "Intégration RH et conformité",
            ]}
            cta="Demander une démo"
            featured
          />
          <AudienceCard
            icon={Globe}
            audience="Collectivités"
            title="Activez la mobilité du territoire."
            benefits={[
              "Données de mobilité agrégées",
              "Subventions covoiturage facilitées",
              "Accompagnement au déploiement",
              "Objectifs ZFE et plan climat",
            ]}
            cta="Parler à notre équipe"
          />
        </div>
      </div>
    </section>
  );
}

function AudienceCard({ icon: Icon, audience, title, benefits, cta, featured }) {
  return (
    <div
      className={
        "group relative flex flex-col rounded-3xl p-7 ring-1 transition lg:p-8 " +
        (featured
          ? "bg-neutral-950 text-white ring-white/10 shadow-2xl hover:-translate-y-1"
          : "bg-white text-neutral-900 ring-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1")
      }
    >
      <div
        className={
          "inline-flex h-12 w-12 items-center justify-center rounded-2xl " +
          (featured
            ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30"
            : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100")
        }
      >
        <Icon className="h-6 w-6" />
      </div>

      <div className={"mt-6 text-xs font-bold uppercase tracking-widest " + (featured ? "text-emerald-400" : "text-emerald-600")}>
        {audience}
      </div>
      <h3 className="mt-2 text-2xl font-black leading-tight md:text-3xl">{title}</h3>

      <ul className={"mt-6 space-y-3 text-sm leading-6 " + (featured ? "text-white/75" : "text-slate-600")}>
        {benefits.map((b) => (
          <li key={b} className="flex items-start gap-3">
            <CheckCircle2 className={"mt-0.5 h-4 w-4 shrink-0 " + (featured ? "text-emerald-400" : "text-emerald-600")} />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <button
        className={
          "group/btn mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition " +
          (featured
            ? "bg-emerald-500 text-white shadow-lg hover:bg-emerald-600"
            : "bg-neutral-950 text-white hover:bg-emerald-600")
        }
      >
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
      </button>
    </div>
  );
}

/* COVOITURAGE */
function Covoiturage() {
  return (
    <section id="covoiturage" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Label>Covoiturage intelligent</Label>
        <div className="mt-5 grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <h2 className="text-4xl font-black uppercase leading-none tracking-tight md:text-5xl lg:text-6xl">
              Des trajets<br />
              déjà prévus,<br />
              <span className="text-emerald-600">partagés en confiance.</span>
            </h2>
            <p className="mt-7 max-w-lg text-base leading-7 text-slate-600 md:text-lg">
              TAPGOO permet aux conducteurs de partager leurs trajets quotidiens
              en toute légalité, avec une participation aux frais encadrée et
              des passagers vérifiés.
            </p>

            <div className="mt-10 space-y-4">
              <FeatureLine icon={MapPin}      title="Trajets préexistants"             text="Le conducteur partage un trajet qu'il fait déjà — pas de détour, pas d'activité commerciale." />
              <FeatureLine icon={Wallet}      title="Participation aux frais encadrée" text="Le montant est calculé automatiquement selon la distance et le nombre de places." />
              <FeatureLine icon={ShieldCheck} title="Conducteurs vérifiés"             text="Vérification d'identité, permis et notation par la communauté." />
            </div>

            <button className="group mt-10 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-emerald-700">
              Trouver un trajet
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <div className="space-y-5">
            <ImageCard
              src={IMAGES.covoiturage}
              alt="Quatre amis en covoiturage"
              label="Covoiturage"
              title="Des trajets plus humains, plus économiques et plus simples."
              hideOverlay
            />
            <TripCardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function Cell({ label, value }) {
  return (
    <div className="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-1.5 text-base font-black">{value}</div>
    </div>
  );
}

function TripCardMockup() {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100">
      <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
        Participation aux frais encadrée · trajet déjà prévu
      </div>

      <div className="mt-5 flex items-baseline justify-between">
        <div className="text-2xl font-black md:text-3xl">Paris → Lyon</div>
        <div className="text-2xl font-black text-emerald-600 md:text-3xl">24€</div>
      </div>
      <div className="mt-1 text-sm font-medium text-slate-500">Aujourd'hui · 18:30 · 3 places</div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <MetricMini icon={Leaf}  value="92"  label="EcoScore" />
        <MetricMini icon={Users} value="3"   label="Places" />
        <MetricMini icon={Star}  value="4,9" label="Note" />
      </div>

      <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-base font-black text-emerald-700 ring-2 ring-white shadow-sm">T</div>
        <div className="flex-1">
          <div className="text-sm font-black">Thomas D.</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-500">
            <ShieldCheck className="h-3 w-3 text-emerald-600" /> Conducteur vérifié
          </div>
        </div>
        <button className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">Rejoindre</button>
      </div>
    </div>
  );
}

function MetricMini({ icon: Icon, value, label }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <Icon className="h-4 w-4 text-emerald-600" />
      <div className="mt-2 text-lg font-black leading-none">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  );
}

function FeatureLine({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-base font-black">{title}</div>
        <div className="mt-1 text-sm leading-6 text-slate-600">{text}</div>
      </div>
    </div>
  );
}

/* RECHARGE */
function Recharge() {
  return (
    <section id="recharge" className="relative overflow-hidden bg-neutral-950 py-24 text-white lg:py-32">
      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <Label dark>Recharge partagée</Label>
        <div className="mt-5 grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div>
            <h2 className="text-4xl font-black uppercase leading-none tracking-tight md:text-5xl lg:text-6xl">
              Mutualisez<br />
              les bornes<br />
              <span className="text-emerald-400">entre entreprises.</span>
            </h2>
            <p className="mt-7 max-w-lg text-base leading-7 text-white/70 md:text-lg">
              Ouvrez vos bornes inutilisées à vos salariés et à des entreprises
              partenaires. Réservation, paiement et reporting intégrés.
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              <DarkBadge icon={Calendar}    text="Réservation à l'avance" />
              <DarkBadge icon={ShieldCheck} text="Accès sécurisé" />
              <DarkBadge icon={Wallet}      text="Paiement automatique" />
              <DarkBadge icon={BarChart3}   text="Reporting d'utilisation" />
            </div>

            <button className="group mt-10 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-7 py-3.5 text-base font-bold text-white shadow-xl transition hover:bg-emerald-600">
              Ouvrir mes bornes
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <div className="space-y-5">
            <ImageCard
              src={IMAGES.rechargeEntreprise}
              alt="Bornes de recharge mutualisées devant une entreprise"
              label="Recharge mutualisée"
              title="Une solution simple, flexible et collective pour salariés et entreprises."
              dark
              hideOverlay
            />
            <ChargingDashboard />
          </div>
        </div>
      </div>
    </section>
  );
}

function DarkBadge({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
      <Icon className="h-5 w-5 text-emerald-400" />
      <span className="text-sm font-bold text-white/90">{text}</span>
    </div>
  );
}

function ChargingDashboard() {
  return (
    <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Réseau actif</div>
          <div className="mt-1 text-2xl font-black md:text-3xl">128 bornes</div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30">
          <PlugZap className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <DarkMetric value="82%"     label="Taux d'utilisation" trend="+12%" />
        <DarkMetric value="18,4 t"  label="CO₂ économisé"      trend="+8%" />
        <DarkMetric value="1 240 €" label="Revenus mensuels"   trend="+24%" />
        <DarkMetric value="342"     label="Réservations"       trend="+18%" />
      </div>

      <div className="mt-6 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-bold">Bornes du réseau</div>
          <div className="text-xs font-medium text-emerald-400">Voir tout →</div>
        </div>
        <div className="space-y-3">
          <ChargerRow name="TechCorp HQ" location="Paris 9e" slots="6 bornes"  status="Disponible" />
          <ChargerRow name="GreenHub"    location="Lyon"     slots="12 bornes" status="3 utilisées" />
          <ChargerRow name="Innov Park"  location="Nantes"   slots="4 bornes"  status="Disponible" />
        </div>
      </div>
    </div>
  );
}

function DarkMetric({ value, label, trend }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="text-xl font-black md:text-2xl">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-2 text-xs font-bold text-emerald-400">{trend}</div>
    </div>
  );
}

function ChargerRow({ name, location, slots, status }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
        <PlugZap className="h-4 w-4 text-emerald-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{name}</div>
        <div className="mt-0.5 text-xs text-white/55">{location} · {slots}</div>
      </div>
      <div className="text-xs font-bold text-emerald-400">{status}</div>
    </div>
  );
}

/* ENTREPRISES */
function Entreprises() {
  return (
    <section id="entreprises" className="bg-gradient-to-b from-white to-slate-50 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-3xl">
          <Label>Mode entreprise</Label>
          <h2 className="mt-5 text-4xl font-black uppercase leading-none tracking-tight md:text-5xl lg:text-6xl">
            Une mobilité plus<br />
            <span className="text-emerald-600">économique et plus verte</span><br />
            pour vos équipes.
          </h2>
          <p className="mt-7 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            Gérez les déplacements professionnels, partagez vos bornes de
            recharge et générez un reporting CO₂ exploitable pour vos rapports ESG.
          </p>
        </div>

        <div className="mt-12">
          <ImageCard
            src={IMAGES.salariesEntreprise}
            alt="Salariés utilisant une solution de mobilité partagée en entreprise"
            label="Mobilité salariés"
            title="Une mobilité pilotée, plus économique et plus durable pour vos équipes."
            hideOverlay
          />
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <EnterpriseCard icon={Building2} title="Gestion salariés"  text="Compte mobilité, justificatifs automatiques, intégration RH et budget par équipe." />
          <EnterpriseCard icon={BarChart3} title="Reporting ESG"      text="Tableaux de bord CO₂ évité, kilomètres mutualisés et indicateurs d'impact." highlight />
          <EnterpriseCard icon={PlugZap}   title="Bornes mutualisées" text="Ouverture des bornes inutilisées, monétisation, accès contrôlé et reporting." />
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <PricingPill name="Starter"    price="99 €"      suffix="/ mois" subtitle="Jusqu'à 50 salariés" />
          <PricingPill name="Business"   price="499 €"     suffix="/ mois" subtitle="Jusqu'à 250 salariés" featured />
          <PricingPill name="Enterprise" price="Sur devis"                  subtitle="À partir de 250 salariés" />
        </div>
      </div>
    </section>
  );
}

function EnterpriseCard({ icon: Icon, title, text, highlight }) {
  return (
    <div
      className={
        "group rounded-3xl p-7 ring-1 transition " +
        (highlight
          ? "bg-neutral-950 text-white ring-white/10 shadow-2xl hover:-translate-y-1"
          : "bg-white text-neutral-900 ring-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1")
      }
    >
      <div
        className={
          "mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl " +
          (highlight ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30" : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100")
        }
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-black md:text-2xl">{title}</h3>
      <p className={"mt-3 text-sm leading-6 " + (highlight ? "text-white/70" : "text-slate-600")}>{text}</p>
      <div className={"mt-6 inline-flex items-center gap-1 text-sm font-bold " + (highlight ? "text-emerald-400" : "text-emerald-600")}>
        En savoir plus <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
}

function PricingPill({ name, price, suffix, subtitle, featured }) {
  return (
    <div
      className={
        "rounded-2xl p-6 ring-1 " +
        (featured
          ? "bg-emerald-600 text-white ring-emerald-700 shadow-xl"
          : "bg-white text-neutral-900 ring-slate-100 shadow-sm")
      }
    >
      <div className="flex items-baseline justify-between">
        <div className={"text-xs font-bold uppercase tracking-wider " + (featured ? "text-white/80" : "text-slate-400")}>
          {name}
        </div>
        {featured && (
          <div className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
            Recommandé
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <div className="text-3xl font-black md:text-4xl">{price}</div>
        {suffix && <div className={"text-sm font-semibold " + (featured ? "text-white/75" : "text-slate-500")}>{suffix}</div>}
      </div>
      <div className={"mt-2 text-sm " + (featured ? "text-white/85" : "text-slate-600")}>{subtitle}</div>
    </div>
  );
}

/* À PROPOS */
function APropos() {
  return (
    <section id="a-propos" className="relative overflow-hidden bg-neutral-950 py-24 text-white lg:py-32">
      <div className="absolute left-0 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/2 rounded-full bg-emerald-600/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-3xl">
          <Label dark>À propos</Label>
          <h2 className="mt-5 text-4xl font-black uppercase leading-none tracking-tight md:text-5xl lg:text-6xl">
            Transformer<br />
            la mobilité du<br />
            <span className="text-emerald-400">quotidien.</span>
          </h2>
          <p className="mt-7 max-w-2xl text-base leading-7 text-white/75 md:text-lg">
            TAPGOO est née d'une conviction simple : la mobilité de demain sera
            partagée, locale et responsable. Nous construisons les outils qui
            rendent ce changement possible.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <ValuePillar icon={Target}    title="Mission"    text="Réduire l'empreinte carbone des déplacements quotidiens." />
          <ValuePillar icon={Heart}     title="Confiance"  text="Une plateforme transparente, vérifiée, conforme à la loi." />
          <ValuePillar icon={Lightbulb} title="Innovation" text="Technologie au service de la sobriété, pas de l'inverse." />
          <ValuePillar icon={Globe}     title="Impact"     text="Mesurable, traçable, partagé avec notre communauté." />
        </div>

        <div className="mt-20 grid gap-6 rounded-3xl bg-white/5 p-8 ring-1 ring-white/10 md:grid-cols-3 lg:p-12">
          <BigStat value="2024" label="Année de lancement" />
          <BigStat value="32"   label="Villes couvertes" />
          <BigStat value="100%" label="Énergie verte" />
        </div>
      </div>
    </section>
  );
}

function ValuePillar({ icon: Icon, title, text }) {
  return (
    <div>
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-xl font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/70">{text}</p>
    </div>
  );
}

function BigStat({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-5xl font-black text-emerald-400 md:text-6xl">{value}</div>
      <div className="mt-2 text-xs font-bold uppercase tracking-wider text-white/65">{label}</div>
    </div>
  );
}

/* CONTACT */
function Contact() {
  return (
    <section id="contact" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Label>Contact</Label>
            <h2 className="mt-5 text-4xl font-black uppercase leading-none tracking-tight md:text-5xl lg:text-6xl">
              Parlons de<br />
              votre projet<br />
              <span className="text-emerald-600">de mobilité.</span>
            </h2>
            <p className="mt-7 max-w-md text-base leading-7 text-slate-600 md:text-lg">
              Que vous soyez conducteur, entreprise ou collectivité, notre équipe
              vous accompagne pour déployer TAPGOO dans votre contexte.
            </p>

            <div className="mt-10 space-y-4">
              <ContactChannel icon={Mail}  label="Email"     value="contact@tapgoo.fr" />
              <ContactChannel icon={Phone} label="Téléphone" value="+33767821752" />
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-emerald-50 p-8 ring-1 ring-emerald-100 lg:p-10">
            <h3 className="text-2xl font-black md:text-3xl">Envoyez-nous un message</h3>
            <p className="mt-2 text-sm text-slate-600">Réponse sous 24h ouvrées.</p>

            <div className="mt-7 space-y-4">
              <Field label="Nom complet"  placeholder="Marie Dupont" />
              <Field label="Email"        placeholder="marie@entreprise.fr" type="email" />
              <Field label="Entreprise"   placeholder="Optionnel" />
              <Field label="Votre projet" placeholder="Parlez-nous de votre besoin…" textarea />
            </div>

            <button className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-6 py-4 text-base font-bold text-white transition hover:bg-emerald-600">
              Envoyer le message
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Vos données restent confidentielles · RGPD conforme
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactChannel({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="mt-0.5 text-base font-black">{value}</div>
      </div>
    </div>
  );
}

function Field({ label, placeholder, type = "text", textarea }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
      {textarea ? (
        <textarea
          rows={4}
          placeholder={placeholder}
          className="mt-1.5 w-full resize-none rounded-2xl border-0 bg-white px-4 py-3 text-sm font-medium ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          className="mt-1.5 w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm font-medium ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      )}
    </div>
  );
}

/* FOOTER */
function Footer() {
  return (
    <footer className="bg-black py-16 text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-2xl font-black tracking-tight md:text-3xl">
              TAP<span className="text-emerald-400">GOO</span>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-6 text-white/55">
              La plateforme française de mobilité partagée pour les
              particuliers et les entreprises.
            </p>
          </div>

          <FooterColumn title="Produit"    links={["Covoiturage", "Recharge partagée", "Mode entreprise", "Compte mobilité", "EcoScore"]} />
          <FooterColumn title="Entreprise" links={["À propos", "Mission", "Carrières", "Presse", "Partenaires"]} />
          <FooterColumn title="Légal"      links={["CGU", "Confidentialité", "Mentions légales", "RGPD", "Cookies"]} />
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/45 md:flex-row md:items-center">
          <div>© 2026 TAPGOO · Tous droits réservés</div>
          <div className="flex items-center gap-2">
            <Leaf className="h-3 w-3 text-emerald-400" />
            <span>Plateforme certifiée énergie verte</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-white/85">{title}</div>
      <ul className="mt-4 space-y-3 text-sm">
        {links.map((link) => (
          <li key={link}>
            <a className="text-white/55 transition hover:text-emerald-400">{link}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* IMAGE CARD */
function ImageCard({ src, alt, label, title, dark, hideOverlay }) {
  return (
    <div
      className={
        "group relative overflow-hidden rounded-3xl shadow-xl ring-1 " +
        (dark ? "bg-white/5 ring-white/10" : "bg-white ring-slate-100")
      }
    >
      <img
        src={src}
        alt={alt}
        className="h-80 w-full object-cover object-left transition duration-700 group-hover:scale-105 md:h-[430px]"
        onError={handleImageError}
      />

      {!hideOverlay && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="inline-flex rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-300 ring-1 ring-emerald-400/30">
              {label}
            </div>
            <h3 className="mt-3 max-w-xl text-2xl font-black leading-tight text-white md:text-3xl">
              {title}
            </h3>
          </div>
        </>
      )}
    </div>
  );
}

/* UTIL */
function Label({ children, dark }) {
  return (
    <div
      className={
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest ring-1 " +
        (dark
          ? "bg-emerald-500/15 text-emerald-400 ring-emerald-400/30"
          : "bg-emerald-50 text-emerald-700 ring-emerald-100")
      }
    >
      <Sparkles className="h-3 w-3" />
      {children}
    </div>
  );
}

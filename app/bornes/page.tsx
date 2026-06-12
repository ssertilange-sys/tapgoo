"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BatteryCharging,
  Loader2,
  MapPin,
  Plug,
  Plus,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { createStation, getCurrentUser, searchStations } from "../../lib/api";

export default function BornesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00b868]" />
        </main>
      }
    >
      <BornesInner />
    </Suspense>
  );
}

function BornesInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [city, setCity] = useState(params.get("ville") || "");
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showPublish, setShowPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [station, setStation] = useState({
    name: "",
    address: "",
    city: "",
    power_kw: "",
    plug_type: "",
    price_cents_per_kwh: "",
  });

  async function loadStations() {
    setLoading(true);
    setMessage("");
    try {
      const data = await searchStations(city);
      setStations(data || []);
    } catch {
      setMessage("Impossible de rechercher les bornes pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  async function submitStation(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push("/connexion");
      return;
    }
    setPublishing(true);
    setMessage("");
    try {
      await createStation({
        ...station,
        power_kw: station.power_kw ? Number(station.power_kw) : null,
        price_cents_per_kwh: station.price_cents_per_kwh
          ? Math.round(Number(station.price_cents_per_kwh) * 100)
          : null,
      });
      setMessage("Borne publiée. Elle est maintenant visible sur la plateforme.");
      setStation({ name: "", address: "", city: "", power_kw: "", plug_type: "", price_cents_per_kwh: "" });
      setShowPublish(false);
      await loadStations();
    } catch {
      setMessage("Impossible de publier la borne pour le moment.");
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
    loadStations();
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Bornes de recharge
          </h1>
          <p className="mt-2 text-sm text-[#5b6b62]">
            Bornes partagées par des particuliers et des entreprises près de chez vous.
          </p>
        </div>
        <button
          onClick={() => setShowPublish((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-[#0c1f17] px-5 py-3 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          Partager ma borne
        </button>
      </div>

      <div className="mt-6 rounded-3xl bg-white p-3 ring-1 ring-[#0c1f17]/5">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-2 rounded-2xl bg-[#f4f8f5] px-4 py-3.5">
            <MapPin className="h-4 w-4 shrink-0 text-[#00b868]" />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadStations()}
              placeholder="Ville ou code postal"
              aria-label="Ville"
              className="w-full bg-transparent outline-none placeholder:text-[#5b6b62]"
            />
          </div>
          <button
            onClick={loadStations}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#00b868] px-6 py-3.5 font-bold text-white hover:bg-[#008f51] disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
            Rechercher
          </button>
        </div>
      </div>

      {message && (
        <p className="mt-4 rounded-2xl bg-[#00b868]/10 px-5 py-3.5 text-sm font-semibold text-[#008f51]" role="status">
          {message}
        </p>
      )}

      {showPublish && (
        <form onSubmit={submitStation} className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-[#00b868]/30">
          <h2 className="font-display text-xl font-extrabold">Partager ma borne</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input value={station.name} onChange={(v) => setStation({ ...station, name: v })} placeholder="Nom de la borne (ex : Garage Kerroch)" required />
            <Input value={station.address} onChange={(v) => setStation({ ...station, address: v })} placeholder="Adresse" required />
            <Input value={station.city} onChange={(v) => setStation({ ...station, city: v })} placeholder="Ville" />
            <Input type="number" min="1" step="0.1" value={station.power_kw} onChange={(v) => setStation({ ...station, power_kw: v })} placeholder="Puissance (kW)" />
            <Input value={station.plug_type} onChange={(v) => setStation({ ...station, plug_type: v })} placeholder="Type de prise (ex : Type 2)" />
            <Input type="number" min="0" step="0.01" value={station.price_cents_per_kwh} onChange={(v) => setStation({ ...station, price_cents_per_kwh: v })} placeholder="Tarif (€ / kWh)" />
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#5b6b62]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#00b868]" />
            Votre adresse exacte n'est partagée qu'avec les membres qui réservent un créneau.
          </p>
          <button
            disabled={publishing}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#00b868] px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
            Publier la borne
          </button>
        </form>
      )}

      <section className="mt-8" aria-label="Bornes disponibles">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#00b868]" />
          </div>
        ) : stations.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-[#0c1f17]/5">
            <BatteryCharging className="mx-auto h-9 w-9 text-[#00b868]" />
            <p className="mt-4 font-display text-lg font-extrabold">Aucune borne sur cette recherche</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5b6b62]">
              Le réseau grandit chaque semaine. Vous avez une borne à la maison
              ou sur votre parking d'entreprise ? Partagez-la et rentabilisez-la.
            </p>
            <button
              onClick={() => setShowPublish(true)}
              className="mt-5 rounded-full bg-[#00b868] px-6 py-3 text-sm font-bold text-white"
            >
              Partager ma borne
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stations.map((s) => (
              <article key={s.id} className="rounded-3xl bg-white p-5 ring-1 ring-[#0c1f17]/5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00b868]/10">
                    <BatteryCharging className="h-5 w-5 text-[#008f51]" />
                  </span>
                  <span className="rounded-full bg-[#00b868]/10 px-3 py-1 text-xs font-bold text-[#008f51]">
                    Disponible
                  </span>
                </div>
                <h2 className="font-display mt-4 text-lg font-extrabold">{s.name}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[#5b6b62]">
                  <MapPin className="h-4 w-4 shrink-0 text-[#00b868]" />
                  {s.city || s.address}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#5b6b62]">
                  {s.power_kw && (
                    <span className="inline-flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-[#00b868]" />
                      {s.power_kw} kW
                    </span>
                  )}
                  {s.plug_type && (
                    <span className="inline-flex items-center gap-1.5">
                      <Plug className="h-4 w-4 text-[#00b868]" />
                      {s.plug_type}
                    </span>
                  )}
                </div>
                <p className="mt-4 border-t border-[#0c1f17]/5 pt-4">
                  {s.price_cents_per_kwh ? (
                    <>
                      <span className="font-display text-xl font-extrabold text-[#008f51]">
                        {(s.price_cents_per_kwh / 100).toFixed(2)} €
                      </span>
                      <span className="text-sm text-[#5b6b62]"> / kWh</span>
                    </>
                  ) : (
                    <span className="text-sm text-[#5b6b62]">Tarif sur demande</span>
                  )}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Input({ value, onChange, placeholder, type = "text", min, step, required }: any) {
  return (
    <input
      type={type}
      min={min}
      step={step}
      required={required}
      value={value}
      aria-label={placeholder}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded-2xl bg-[#f4f8f5] px-4 py-3.5 outline-none placeholder:text-[#5b6b62]"
    />
  );
}

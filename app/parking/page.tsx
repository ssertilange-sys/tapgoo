"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  MapPin,
  Plus,
  Ruler,
  Search,
  ShieldCheck,
  SquareParking,
} from "lucide-react";
import { bookParkingSlot, createParking, getCurrentUser, searchParking } from "../../lib/api";
import SlotBooking from "../components/SlotBooking";

export default function ParkingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00b868]" />
        </main>
      }
    >
      <ParkingInner />
    </Suspense>
  );
}

function ParkingInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [city, setCity] = useState(params.get("ville") || "");
  const [spots, setSpots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showPublish, setShowPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [spot, setSpot] = useState({
    title: "",
    address: "",
    city: "",
    spot_type: "",
    max_height_cm: "",
    price_cents_per_hour: "",
  });

  async function loadSpots() {
    setLoading(true);
    setMessage("");
    try {
      const data = await searchParking(city);
      setSpots(data || []);
    } catch {
      setMessage("Impossible de rechercher les places pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  async function submitSpot(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push("/connexion");
      return;
    }
    setPublishing(true);
    setMessage("");
    try {
      await createParking({
        ...spot,
        max_height_cm: spot.max_height_cm ? Number(spot.max_height_cm) : null,
        price_cents_per_hour: spot.price_cents_per_hour
          ? Math.round(Number(spot.price_cents_per_hour) * 100)
          : null,
      });
      setMessage("Place publiée. Elle est maintenant visible sur la plateforme.");
      setSpot({ title: "", address: "", city: "", spot_type: "", max_height_cm: "", price_cents_per_hour: "" });
      setShowPublish(false);
      await loadSpots();
    } catch {
      setMessage("Impossible de publier la place pour le moment.");
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
    loadSpots();
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Places de parking
          </h1>
          <p className="mt-2 text-sm text-[#5b6b62]">
            Places et garages partagés par des particuliers et des entreprises près de chez vous.
          </p>
        </div>
        <button
          onClick={() => setShowPublish((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-[#0c1f17] px-5 py-3 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          Partager ma place
        </button>
      </div>

      <div className="mt-6 rounded-3xl bg-white p-3 ring-1 ring-[#0c1f17]/5">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-2 rounded-2xl bg-[#f4f8f5] px-4 py-3.5">
            <MapPin className="h-4 w-4 shrink-0 text-[#00b868]" />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadSpots()}
              placeholder="Ville ou code postal"
              aria-label="Ville"
              className="w-full bg-transparent outline-none placeholder:text-[#5b6b62]"
            />
          </div>
          <button
            onClick={loadSpots}
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
        <form onSubmit={submitSpot} className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-[#00b868]/30">
          <h2 className="font-display text-xl font-extrabold">Partager ma place</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input value={spot.title} onChange={(v) => setSpot({ ...spot, title: v })} placeholder="Intitulé (ex : Garage centre-ville)" required />
            <Input value={spot.address} onChange={(v) => setSpot({ ...spot, address: v })} placeholder="Adresse" required />
            <Input value={spot.city} onChange={(v) => setSpot({ ...spot, city: v })} placeholder="Ville" />
            <Input value={spot.spot_type} onChange={(v) => setSpot({ ...spot, spot_type: v })} placeholder="Type (ex : couvert, extérieur, box)" />
            <Input type="number" min="0" value={spot.max_height_cm} onChange={(v) => setSpot({ ...spot, max_height_cm: v })} placeholder="Hauteur max (cm)" />
            <Input type="number" min="0" step="0.01" value={spot.price_cents_per_hour} onChange={(v) => setSpot({ ...spot, price_cents_per_hour: v })} placeholder="Tarif (€ / heure)" />
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
            Publier la place
          </button>
        </form>
      )}

      <section className="mt-8" aria-label="Places disponibles">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#00b868]" />
          </div>
        ) : spots.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-[#0c1f17]/5">
            <SquareParking className="mx-auto h-9 w-9 text-[#00b868]" />
            <p className="mt-4 font-display text-lg font-extrabold">Aucune place sur cette recherche</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5b6b62]">
              Vous avez une place ou un garage inutilisé ? Partagez-le et rentabilisez-le.
            </p>
            <button
              onClick={() => setShowPublish(true)}
              className="mt-5 rounded-full bg-[#00b868] px-6 py-3 text-sm font-bold text-white"
            >
              Partager ma place
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {spots.map((s) => (
              <article key={s.id} className="rounded-3xl bg-white p-5 ring-1 ring-[#0c1f17]/5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00b868]/10">
                    <SquareParking className="h-5 w-5 text-[#008f51]" />
                  </span>
                  <span className="rounded-full bg-[#00b868]/10 px-3 py-1 text-xs font-bold text-[#008f51]">
                    Disponible
                  </span>
                </div>
                <h2 className="font-display mt-4 text-lg font-extrabold">{s.title}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[#5b6b62]">
                  <MapPin className="h-4 w-4 shrink-0 text-[#00b868]" />
                  {s.city || s.address}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#5b6b62]">
                  {s.spot_type && <span>{s.spot_type}</span>}
                  {s.max_height_cm && (
                    <span className="inline-flex items-center gap-1.5">
                      <Ruler className="h-4 w-4 text-[#00b868]" />
                      {s.max_height_cm} cm
                    </span>
                  )}
                </div>
                <p className="mt-4 border-t border-[#0c1f17]/5 pt-4">
                  {s.price_cents_per_hour ? (
                    <>
                      <span className="font-display text-xl font-extrabold text-[#008f51]">
                        {(s.price_cents_per_hour / 100).toFixed(2)} €
                      </span>
                      <span className="text-sm text-[#5b6b62]"> / heure</span>
                    </>
                  ) : (
                    <span className="text-sm text-[#5b6b62]">Tarif sur demande</span>
                  )}
                </p>
                <SlotBooking
                  onBook={async (start, end) => {
                    if (!user) {
                      router.push("/connexion");
                      return;
                    }
                    await bookParkingSlot(s.id, start, end);
                  }}
                />
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

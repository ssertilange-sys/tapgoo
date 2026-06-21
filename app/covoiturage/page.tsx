"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarClock,
  Car,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { bookTrip, createRide, getCurrentUser, searchTrips, startConversation } from "../../lib/api";

export default function CovoituragePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00b868]" />
        </main>
      }
    >
      <CovoiturageInner />
    </Suspense>
  );
}

function CovoiturageInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showPublish, setShowPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [filters, setFilters] = useState({
    depart: params.get("depart") || "",
    arrivee: params.get("arrivee") || "",
    date: params.get("date") || "",
  });
  const [seatsById, setSeatsById] = useState<Record<string, number>>({});

  const [ride, setRide] = useState({
    origin: "",
    destination: "",
    departure_time: "",
    seats_available: "1",
    price_cents: "",
    vehicle_info: "",
  });

  async function loadTrips(f = filters) {
    setLoading(true);
    setMessage("");
    try {
      const data = await searchTrips(f);
      setTrips(data || []);
    } catch {
      setMessage("Impossible de rechercher les trajets pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRide(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push("/connexion");
      return;
    }
    setPublishing(true);
    setMessage("");
    try {
      await createRide({
        ...ride,
        price_cents: ride.price_cents ? Math.round(Number(ride.price_cents) * 100) : null,
      });
      setMessage("Trajet publié. Il est maintenant visible par les membres.");
      setRide({ origin: "", destination: "", departure_time: "", seats_available: "1", price_cents: "", vehicle_info: "" });
      setShowPublish(false);
      await loadTrips();
    } catch {
      setMessage("Impossible de publier le trajet pour le moment.");
    } finally {
      setPublishing(false);
    }
  }

  async function reserve(id: string, seats: number) {
    if (!user) {
      router.push("/connexion");
      return;
    }
    setMessage("");
    try {
      await bookTrip(id, seats);
      setMessage("Demande envoyée. En attente de la validation du conducteur.");
      await loadTrips();
    } catch (e: any) {
      const msg = e.message || "";
      if (msg.includes("déjà") || msg.includes("duplicate key")) {
        setMessage("Vous avez déjà une demande sur ce trajet.");
      } else if (msg.includes("place")) {
        setMessage("Ce trajet n'a plus assez de places disponibles.");
      } else if (msg.includes("propre trajet")) {
        setMessage("Vous ne pouvez pas réserver votre propre trajet.");
      } else {
        setMessage("Impossible de réserver ce trajet pour le moment.");
      }
    }
  }

  async function contact(driverId: string, rideId: string) {
    if (!user) {
      router.push("/connexion");
      return;
    }
    try {
      const convId = await startConversation(driverId, rideId);
      router.push(`/messages?c=${convId}`);
    } catch {
      setMessage("Impossible d'ouvrir la conversation pour le moment.");
    }
  }

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
    loadTrips();
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">Covoiturage</h1>
          <p className="mt-2 text-sm text-[#5b6b62]">
            Trajets entre particuliers, en partage de frais.
          </p>
        </div>
        <button
          onClick={() => setShowPublish((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-[#0c1f17] px-5 py-3 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          Proposer un trajet
        </button>
      </div>

      {/* Recherche */}
      <div className="mt-6 rounded-3xl bg-white p-3 ring-1 ring-[#0c1f17]/5">
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_0.8fr_auto]">
          <Field icon={MapPin}>
            <input
              value={filters.depart}
              onChange={(e) => setFilters({ ...filters, depart: e.target.value })}
              placeholder="Départ"
              aria-label="Ville de départ"
              className="w-full bg-transparent outline-none placeholder:text-[#5b6b62]"
            />
          </Field>
          <Field icon={MapPin}>
            <input
              value={filters.arrivee}
              onChange={(e) => setFilters({ ...filters, arrivee: e.target.value })}
              placeholder="Arrivée"
              aria-label="Ville d'arrivée"
              className="w-full bg-transparent outline-none placeholder:text-[#5b6b62]"
            />
          </Field>
          <Field icon={CalendarClock}>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              aria-label="Date"
              className="w-full bg-transparent outline-none"
            />
          </Field>
          <button
            onClick={() => loadTrips()}
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

      {/* Formulaire de publication (repliable) */}
      {showPublish && (
        <form onSubmit={submitRide} className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-[#00b868]/30">
          <h2 className="font-display text-xl font-extrabold">Proposer un trajet</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input value={ride.origin} onChange={(v) => setRide({ ...ride, origin: v })} placeholder="Ville de départ" required />
            <Input value={ride.destination} onChange={(v) => setRide({ ...ride, destination: v })} placeholder="Ville d'arrivée" required />
            <Input type="datetime-local" value={ride.departure_time} onChange={(v) => setRide({ ...ride, departure_time: v })} ariaLabel="Date et heure de départ" required />
            <Input type="number" min="1" max="8" value={ride.seats_available} onChange={(v) => setRide({ ...ride, seats_available: v })} placeholder="Places disponibles" required />
            <Input type="number" min="0" step="0.5" value={ride.price_cents} onChange={(v) => setRide({ ...ride, price_cents: v })} placeholder="Participation aux frais (€ / passager)" />
            <Input value={ride.vehicle_info} onChange={(v) => setRide({ ...ride, vehicle_info: v })} placeholder="Véhicule (ex : Renault Zoé)" />
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#5b6b62]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#00b868]" />
            La participation demandée doit couvrir uniquement vos frais réels
            (carburant, péages, usure), conformément au partage de frais entre
            particuliers.
          </p>
          <button
            disabled={publishing}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#00b868] px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
            Publier le trajet
          </button>
        </form>
      )}

      {/* Résultats */}
      <section className="mt-8" aria-label="Trajets disponibles">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#00b868]" />
          </div>
        ) : trips.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-[#0c1f17]/5">
            <Car className="mx-auto h-9 w-9 text-[#00b868]" />
            <p className="mt-4 font-display text-lg font-extrabold">Aucun trajet sur cette recherche</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5b6b62]">
              Élargissez votre recherche, ou soyez le premier à proposer ce
              trajet : les passagers de votre secteur le verront immédiatement.
            </p>
            <button
              onClick={() => setShowPublish(true)}
              className="mt-5 rounded-full bg-[#00b868] px-6 py-3 text-sm font-bold text-white"
            >
              Proposer ce trajet
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {trips.map((trip) => (
              <article key={trip.id} className="rounded-3xl bg-white p-5 ring-1 ring-[#0c1f17]/5">
                {/* Ligne de trajet */}
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#00b868]" />
                  <span className="font-display truncate font-extrabold">{trip.origin}</span>
                  <span className="trip-dash min-w-6 flex-1" aria-hidden="true" />
                  <MapPin className="h-4 w-4 shrink-0 text-[#00b868]" />
                  <span className="font-display truncate font-extrabold">{trip.destination}</span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#5b6b62]">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4 text-[#00b868]" />
                    {new Date(trip.departure_time).toLocaleString("fr-FR", {
                      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#00b868]" />
                    {trip.seats_available} place{trip.seats_available > 1 ? "s" : ""}
                  </span>
                  {trip.vehicle_info && (
                    <span className="inline-flex items-center gap-1.5">
                      <Car className="h-4 w-4 text-[#00b868]" />
                      {trip.vehicle_info}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#0c1f17]/5 pt-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {trip.driver_avatar_url ? (
                      <img src={trip.driver_avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00b868]/10">
                        <UserRound className="h-4 w-4 text-[#008f51]" />
                      </span>
                    )}
                    <span className="truncate text-sm font-semibold">{trip.driver_name}</span>
                  </div>
                  <p className="text-right">
                    {trip.price_cents ? (
                      <>
                        <span className="font-display text-xl font-extrabold text-[#008f51]">
                          {(trip.price_cents / 100).toFixed(2)} €
                        </span>
                        <span className="block text-[11px] text-[#5b6b62]">participation / passager</span>
                      </>
                    ) : (
                      <span className="text-sm text-[#5b6b62]">Participation libre</span>
                    )}
                  </p>
                </div>

                <div className="mt-4 flex gap-2">
                  <select
                    value={seatsById[trip.id] || 1}
                    onChange={(e) => setSeatsById({ ...seatsById, [trip.id]: Number(e.target.value) })}
                    aria-label="Nombre de places"
                    className="rounded-full bg-[#f4f8f5] px-3 py-2.5 text-sm font-bold outline-none"
                  >
                    {Array.from({ length: Math.max(1, trip.seats_available) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} place{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => reserve(trip.id, seatsById[trip.id] || 1)}
                    className="flex-1 rounded-full bg-[#00b868] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#008f51]"
                  >
                    Réserver
                  </button>
                  <button
                    onClick={() => contact(trip.driver_id, trip.id)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0c1f17]/5 px-4 py-2.5 text-sm font-bold text-[#0c1f17] hover:bg-[#0c1f17]/10"
                    aria-label={`Contacter ${trip.driver_name}`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Contacter
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
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

function Input({ value, onChange, placeholder, type = "text", min, max, step, required, ariaLabel }: any) {
  return (
    <input
      type={type}
      min={min}
      max={max}
      step={step}
      required={required}
      value={value}
      aria-label={ariaLabel || placeholder}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded-2xl bg-[#f4f8f5] px-4 py-3.5 outline-none placeholder:text-[#5b6b62]"
    />
  );
}

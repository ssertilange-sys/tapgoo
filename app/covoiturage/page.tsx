"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Car, Loader2, MapPin, Plus, Search, ShieldCheck } from "lucide-react";
import {
  searchTrips,
  createRide,
  bookTrip,
  getCurrentUser,
} from "../../lib/api";
import { signInWithGoogle } from "../../lib/auth";

export default function CovoituragePage() {
  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [filters, setFilters] = useState({
    depart: "",
    arrivee: "",
    date: "",
  });

  const [ride, setRide] = useState({
    origin: "",
    destination: "",
    departure_time: "",
    seats_available: "1",
    price_cents: "",
    vehicle_info: "",
  });

  async function loadTrips() {
    setLoading(true);
    setMessage("");

    try {
      const data = await searchTrips(filters);
      setTrips(data || []);
    } catch (e: any) {
    setMessage("Impossible de rechercher les trajets pour le moment.");  
    } finally {
      setLoading(false);
    }
  }

  async function submitRide(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!user) {
        await signInWithGoogle("/covoiturage");
        return;
      }

      await createRide({
        ...ride,
        price_cents: ride.price_cents
          ? Math.round(Number(ride.price_cents) * 100)
          : null,
      });

      setMessage("Trajet publié avec succès.");
      setRide({
        origin: "",
        destination: "",
        departure_time: "",
        seats_available: "1",
        price_cents: "",
        vehicle_info: "",
      });

      await loadTrips();
    } catch (e: any) {
    setMessage("Impossible de publier le trajet pour le moment.");  
    } finally {
      setLoading(false);
    }
  }

  async function reserveTrip(id: string) {
    setLoading(true);
    setMessage("");

    try {
      if (!user) {
        await signInWithGoogle("/covoiturage");
        return;
      }

      await bookTrip(id);
      setMessage("Réservation effectuée.");
      await loadTrips();
    } catch (e: any) {
  const msg = e.message || "";

if (msg.includes("duplicate key") || msg.includes("ride_bookings_ride_id_passenger_id_key")) {
  setMessage("Vous avez déjà réservé ce trajet.");
} else if (msg.includes("Plus de places")) {
  setMessage("Ce trajet n'a plus de place disponible.");
} else {
  setMessage("Impossible de réserver ce trajet pour le moment.");
}    
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
    loadTrips();
  }, []);

  return (
    <main className="min-h-screen bg-[#fbfbf8] text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
        <Link href="/" className="text-2xl font-black tracking-tight">
          TAP<span className="text-emerald-600">GOO</span>
        </Link>

        <div className="flex items-center gap-4 text-sm font-bold">
          <Link href="/dashboard">Dashboard</Link>
          {!user && <Link href="/connexion">Connexion</Link>}
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200">
          <p className="text-sm font-black uppercase text-emerald-600">
            Covoiturage
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Trouver ou déposer un trajet.
          </h1>

          <p className="mt-4 max-w-2xl text-slate-600">
            Recherchez un trajet disponible ou proposez votre propre trajet
            TAPGOO.
          </p>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-700">
            {message}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="rounded-[2rem] bg-white p-6 shadow-lg shadow-slate-200">
            <div className="flex items-center gap-3">
              <Search className="text-emerald-600" />
              <h2 className="text-2xl font-black">Rechercher un trajet</h2>
            </div>

            <div className="mt-6 grid gap-4">
              <input
                value={filters.depart}
                onChange={(e) =>
                  setFilters({ ...filters, depart: e.target.value })
                }
                placeholder="Départ"
                className="rounded-2xl border px-4 py-3"
              />

              <input
                value={filters.arrivee}
                onChange={(e) =>
                  setFilters({ ...filters, arrivee: e.target.value })
                }
                placeholder="Arrivée"
                className="rounded-2xl border px-4 py-3"
              />

              <input
                type="date"
                value={filters.date}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
                className="rounded-2xl border px-4 py-3"
              />

              <button
                onClick={loadTrips}
                disabled={loading}
                className="rounded-full bg-emerald-600 px-6 py-4 font-black text-white"
              >
                {loading ? "Recherche..." : "Rechercher"}
              </button>
            </div>

            <div className="mt-8 space-y-4">
              {trips.length === 0 ? (
                <p className="text-slate-500">Aucun trajet trouvé.</p>
              ) : (
                trips.map((trip) => (
                  <div
                    key={trip.id}
                    className="rounded-2xl border bg-slate-50 p-5"
                  >
                    <div className="flex items-center gap-2 font-black">
                      <MapPin className="h-5 w-5 text-emerald-600" />
                      {trip.origin} → {trip.destination}
                    </div>

                    <p className="mt-2 text-sm text-slate-600">
                      Départ :{" "}
                      {new Date(trip.departure_time).toLocaleString("fr-FR")}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Places : {trip.seats_available}
                    </p>

                    {trip.price_cents && (
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        Prix : {(trip.price_cents / 100).toFixed(2)} €
                      </p>
                    )}

                    <button
                      onClick={() => reserveTrip(trip.id)}
                      className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
                    >
                      Réserver
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-6 shadow-lg shadow-slate-200">
            <div className="flex items-center gap-3">
              <Plus className="text-emerald-600" />
              <h2 className="text-2xl font-black">Déposer un trajet</h2>
            </div>

            <form onSubmit={submitRide} className="mt-6 grid gap-4">
              <input
                value={ride.origin}
                onChange={(e) => setRide({ ...ride, origin: e.target.value })}
                placeholder="Ville de départ"
                className="rounded-2xl border px-4 py-3"
              />

              <input
                value={ride.destination}
                onChange={(e) =>
                  setRide({ ...ride, destination: e.target.value })
                }
                placeholder="Ville d'arrivée"
                className="rounded-2xl border px-4 py-3"
              />

              <input
                type="datetime-local"
                value={ride.departure_time}
                onChange={(e) =>
                  setRide({ ...ride, departure_time: e.target.value })
                }
                className="rounded-2xl border px-4 py-3"
              />

              <input
                type="number"
                min="1"
                value={ride.seats_available}
                onChange={(e) =>
                  setRide({ ...ride, seats_available: e.target.value })
                }
                placeholder="Nombre de places"
                className="rounded-2xl border px-4 py-3"
              />

              <input
                type="number"
                min="0"
                step="0.5"
                value={ride.price_cents}
                onChange={(e) =>
                  setRide({ ...ride, price_cents: e.target.value })
                }
                placeholder="Prix en euros"
                className="rounded-2xl border px-4 py-3"
              />

              <input
                value={ride.vehicle_info}
                onChange={(e) =>
                  setRide({ ...ride, vehicle_info: e.target.value })
                }
                placeholder="Véhicule, ex : Renault Zoé"
                className="rounded-2xl border px-4 py-3"
              />

              <button
                disabled={loading}
                className="rounded-full bg-emerald-600 px-6 py-4 font-black text-white"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Publication...
                  </span>
                ) : (
                  "Publier le trajet"
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-slate-500">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Les trajets publiés seront visibles par les utilisateurs TAPGOO.
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BatteryCharging, Loader2, MapPin, Plus, Search, ShieldCheck } from "lucide-react";
import { createStation, getCurrentUser, searchStations } from "../../lib/api";
import { signInWithGoogle } from "../../lib/auth";

export default function BornesPage() {
  const [user, setUser] = useState<any>(null);
  const [city, setCity] = useState("");
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [station, setStation] = useState({
    name: "",
    address: "",
    city: "",
    power_kw: "",
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
    setLoading(true);
    setMessage("");

    try {
      if (!user) {
        await signInWithGoogle("/bornes");
        return;
      }

      await createStation({
        ...station,
        power_kw: station.power_kw ? Number(station.power_kw) : null,
        price_cents_per_kwh: station.price_cents_per_kwh
          ? Math.round(Number(station.price_cents_per_kwh) * 100)
          : null,
      });

      setMessage("Borne publiée avec succès.");
      setStation({
        name: "",
        address: "",
        city: "",
        power_kw: "",
        price_cents_per_kwh: "",
      });

      await loadStations();
    } catch {
      setMessage("Impossible de publier la borne pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
    loadStations();
  }, []);

  return (
    <main className="min-h-screen bg-[#fbfbf8] text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
        <Link href="/" className="text-2xl font-black tracking-tight">
          TAP<span className="text-emerald-600">GOO</span>
        </Link>

        <div className="flex items-center gap-4 text-sm font-bold">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/covoiturage">Covoiturage</Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200">
          <p className="text-sm font-black uppercase text-emerald-600">
            Recharge
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Trouver ou déposer une borne.
          </h1>

          <p className="mt-4 max-w-2xl text-slate-600">
            Recherchez une borne disponible ou proposez une borne TAPGOO.
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
              <h2 className="text-2xl font-black">Rechercher une borne</h2>
            </div>

            <div className="mt-6 grid gap-4">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ville"
                className="rounded-2xl border px-4 py-3"
              />

              <button
                onClick={loadStations}
                disabled={loading}
                className="rounded-full bg-emerald-600 px-6 py-4 font-black text-white"
              >
                {loading ? "Recherche..." : "Rechercher"}
              </button>
            </div>

            <div className="mt-8 space-y-4">
              {stations.length === 0 ? (
                <p className="text-slate-500">Aucune borne trouvée.</p>
              ) : (
                stations.map((s) => (
                  <div key={s.id} className="rounded-2xl border bg-slate-50 p-5">
                    <div className="flex items-center gap-2 font-black">
                      <MapPin className="h-5 w-5 text-emerald-600" />
                      {s.name}
                    </div>

                    <p className="mt-2 text-sm text-slate-600">{s.address}</p>
                    <p className="mt-1 text-sm text-slate-600">{s.city}</p>

                    {s.power_kw && (
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        Puissance : {s.power_kw} kW
                      </p>
                    )}

                    {s.price_cents_per_kwh && (
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        Prix : {(s.price_cents_per_kwh / 100).toFixed(2)} €/kWh
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-6 shadow-lg shadow-slate-200">
            <div className="flex items-center gap-3">
              <Plus className="text-emerald-600" />
              <h2 className="text-2xl font-black">Déposer une borne</h2>
            </div>

            <form onSubmit={submitStation} className="mt-6 grid gap-4">
              <input
                value={station.name}
                onChange={(e) => setStation({ ...station, name: e.target.value })}
                placeholder="Nom de la borne"
                className="rounded-2xl border px-4 py-3"
              />

              <input
                value={station.address}
                onChange={(e) =>
                  setStation({ ...station, address: e.target.value })
                }
                placeholder="Adresse"
                className="rounded-2xl border px-4 py-3"
              />

              <input
                value={station.city}
                onChange={(e) => setStation({ ...station, city: e.target.value })}
                placeholder="Ville"
                className="rounded-2xl border px-4 py-3"
              />

              <input
                type="number"
                value={station.power_kw}
                onChange={(e) =>
                  setStation({ ...station, power_kw: e.target.value })
                }
                placeholder="Puissance en kW"
                className="rounded-2xl border px-4 py-3"
              />

              <input
                type="number"
                step="0.01"
                value={station.price_cents_per_kwh}
                onChange={(e) =>
                  setStation({
                    ...station,
                    price_cents_per_kwh: e.target.value,
                  })
                }
                placeholder="Prix €/kWh"
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
                  "Publier la borne"
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-slate-500">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Les bornes publiées seront visibles par les utilisateurs TAPGOO.
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BatteryCharging,
  CalendarClock,
  Car,
  Loader2,
  LogOut,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { cancelBooking, deleteRide, getMyDashboard } from "../../lib/api";
import { signOutAndGoHome } from "../../lib/auth";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");

    try {
      const data = await getMyDashboard();
      setDashboard(data);
    } catch (e: any) {
      setMessage(e.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteRide(rideId: string) {
    setMessage("");

    try {
      await deleteRide(rideId);
      setMessage("Trajet supprimé.");
      await load();
    } catch (e: any) {
      setMessage(e.message || "Impossible de supprimer le trajet.");
    }
  }

  async function handleCancelBooking(bookingId: string) {
    setMessage("");

    try {
      await cancelBooking(bookingId);
      setMessage("Réservation annulée.");
      await load();
    } catch (e: any) {
      setMessage(e.message || "Impossible d'annuler la réservation.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfbf8]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </main>
    );
  }

  const profile = dashboard?.profile;
  const myRides = dashboard?.myRides || [];
  const myBookings = dashboard?.myBookings || [];
  const myStations = dashboard?.myStations || [];

  return (
    <main className="min-h-screen bg-[#fbfbf8] px-6 py-8 text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="text-2xl font-black tracking-tight">
          TAP<span className="text-emerald-600">GOO</span>
        </Link>

        <button
          onClick={signOutAndGoHome}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </header>

      <section className="mx-auto mt-10 max-w-7xl">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-emerald-100">
          <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
            Dashboard
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight">
            Bonjour {profile?.full_name?.split(" ")[0] || "utilisateur"}
          </h1>

          <p className="mt-3 text-slate-600">
            Gérez vos trajets, réservations et bornes.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <QuickLink href="/covoiturage" label="Covoiturage" />
            <QuickLink href="/bornes" label="Bornes" />
            <QuickLink href="/profil" label="Profil" />
            <QuickLink href="/messages" label="Messages" />
          </div>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-700">
            {message}
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-4">
          <Stat icon={UserRound} label="Profil" value="OK" />
          <Stat icon={Car} label="Mes trajets" value={myRides.length} />
          <Stat icon={Plus} label="Réservations" value={myBookings.length} />
          <Stat icon={BatteryCharging} label="Bornes" value={myStations.length} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <Panel title="Mes trajets" actionHref="/covoiturage">
            {myRides.length === 0 ? (
              <Empty text="Aucun trajet déposé." />
            ) : (
              myRides.map((ride: any) => (
                <Card key={ride.id}>
                  <p className="font-black">
                    {ride.origin} → {ride.destination}
                  </p>

                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <CalendarClock className="h-4 w-4 text-emerald-600" />
                    {ride.departure_time
                      ? new Date(ride.departure_time).toLocaleString("fr-FR")
                      : "Date non précisée"}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Places restantes : {ride.seats_available}
                  </p>

                  <button
                    onClick={() => handleDeleteRide(ride.id)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-black text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </button>
                </Card>
              ))
            )}
          </Panel>

          <Panel title="Mes réservations">
            {myBookings.length === 0 ? (
              <Empty text="Aucune réservation." />
            ) : (
              myBookings.map((booking: any) => (
                <Card key={booking.id}>
                  <p className="font-black">
                    {booking.rides?.origin} → {booking.rides?.destination}
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    {booking.rides?.departure_time
                      ? new Date(booking.rides.departure_time).toLocaleString(
                          "fr-FR"
                        )
                      : "Date non précisée"}
                  </p>

                  <button
                    onClick={() => handleCancelBooking(booking.id)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-black text-red-700"
                  >
                    <X className="h-4 w-4" />
                    Annuler
                  </button>
                </Card>
              ))
            )}
          </Panel>

          <Panel title="Mes bornes" actionHref="/bornes">
            {myStations.length === 0 ? (
              <Empty text="Aucune borne déposée." />
            ) : (
              myStations.map((station: any) => (
                <Card key={station.id}>
                  <p className="font-black">{station.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{station.address}</p>
                  <p className="mt-1 text-sm text-slate-600">{station.city}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Puissance : {station.power_kw || "—"} kW
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Prix :{" "}
                    {station.price_cents_per_kwh
                      ? `${(station.price_cents_per_kwh / 100).toFixed(2)} €/kWh`
                      : "—"}
                  </p>
                </Card>
              ))
            )}
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-[1.7rem] bg-white p-6 shadow-sm ring-1 ring-emerald-100">
      <Icon className="h-6 w-6 text-emerald-600" />
      <p className="mt-4 text-3xl font-black">{value}</p>
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
    </div>
  );
}

function QuickLink({ href, label }: any) {
  return (
    <Link
      href={href}
      className="rounded-full bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-200"
    >
      {label}
    </Link>
  );
}

function Panel({ title, actionHref, children }: any) {
  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black">{title}</h2>

        {actionHref && (
          <Link
            href={actionHref}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-black text-white"
          >
            Ajouter
          </Link>
        )}
      </div>

      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

function Card({ children }: any) {
  return <div className="rounded-2xl border bg-slate-50 p-5">{children}</div>;
}

function Empty({ text }: any) {
  return <p className="text-slate-500">{text}</p>;
}
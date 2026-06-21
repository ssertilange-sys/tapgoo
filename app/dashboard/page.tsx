"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BatteryCharging,
  CalendarClock,
  Car,
  Check,
  Leaf,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { cancelBooking, deleteRide, getMyDashboard, respondToBooking, startConversation } from "../../lib/api";
import { signOutAndGoHome } from "../../lib/auth";
import { useRouter } from "next/navigation";

const KG_CO2_PER_KM = 0.1;
const DEFAULT_KM = 30;

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  completed: "Terminée",
  rejected: "Refusée",
  cancelled: "Annulée",
  no_show: "Absent",
  disputed: "Litige",
  expired: "Expirée",
};

export default function DashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const data = await getMyDashboard();
      setDashboard(data);
    } catch (e: any) {
      if ((e.message || "").includes("non connecté")) setLoggedOut(true);
      else setMessage("Erreur de chargement. Réessayez dans un instant.");
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
    } catch {
      setMessage("Impossible de supprimer le trajet.");
    }
  }

  async function handleCancelBooking(bookingId: string) {
    setMessage("");
    try {
      await cancelBooking(bookingId);
      setMessage("Réservation annulée.");
      await load();
    } catch {
      setMessage("Impossible d'annuler la réservation.");
    }
  }

  async function handleRespond(bookingId: string, accept: boolean) {
    setMessage("");
    try {
      await respondToBooking(bookingId, accept);
      setMessage(accept ? "Demande acceptée." : "Demande refusée.");
      await load();
    } catch (e: any) {
      const msg = e.message || "";
      if (msg.includes("places")) setMessage("Plus assez de places disponibles.");
      else setMessage("Action impossible pour le moment.");
    }
  }

  async function contactDriver(driverId: string, rideId: string) {
    try {
      const convId = await startConversation(driverId, rideId);
      router.push(`/messages?c=${convId}`);
    } catch {
      setMessage("Impossible d'ouvrir la conversation.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00b868]" />
      </main>
    );
  }

  if (loggedOut) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center ring-1 ring-[#0c1f17]/5">
          <UserRound className="mx-auto h-10 w-10 text-[#00b868]" />
          <h1 className="font-display mt-4 text-2xl font-extrabold">Mon espace</h1>
          <p className="mt-3 text-sm leading-6 text-[#5b6b62]">
            Connectez-vous pour retrouver vos trajets, réservations, bornes et votre impact.
          </p>
          <Link href="/connexion" className="mt-6 inline-block rounded-full bg-[#00b868] px-6 py-3 text-sm font-bold text-white">
            Se connecter
          </Link>
        </div>
      </main>
    );
  }

  const profile = dashboard?.profile;
  const myRides = (dashboard?.myRides || []).filter((r: any) => r.status !== "cancelled");
  const myBookings = (dashboard?.myBookings || []).filter((b: any) => b.status !== "cancelled");
  const myStations = dashboard?.myStations || [];
  const incomingRequests = dashboard?.incomingRequests || [];

  const sharedTrips = myRides.length + myBookings.length;
  const co2Kg = Math.round(
    myRides.reduce((acc: number, r: any) => acc + (Number(r.distance_km) || DEFAULT_KM), 0) * KG_CO2_PER_KM +
      myBookings.length * DEFAULT_KM * KG_CO2_PER_KM
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Bonjour {profile?.full_name?.split(" ")[0] || ""}
          </h1>
          <p className="mt-2 text-sm text-[#5b6b62]">
            Vos trajets, réservations et bornes, au même endroit.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/profil" className="rounded-full bg-[#0c1f17]/5 px-5 py-2.5 text-sm font-bold">
            Mon profil
          </Link>
          <button
            onClick={signOutAndGoHome}
            className="inline-flex items-center gap-2 rounded-full bg-[#0c1f17] px-5 py-2.5 text-sm font-bold text-white"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </div>

      {message && (
        <p className="mt-5 rounded-2xl bg-[#00b868]/10 px-5 py-3.5 text-sm font-semibold text-[#008f51]" role="status">
          {message}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Car} label="Trajets proposés" value={myRides.length} />
        <Stat icon={CalendarClock} label="Réservations" value={myBookings.length} />
        <Stat icon={BatteryCharging} label="Mes bornes" value={myStations.length} />
        <div className="rounded-3xl bg-[#0c1f17] p-6 text-white">
          <Leaf className="h-6 w-6 text-[#00b868]" />
          <p className="font-display mt-4 text-3xl font-extrabold">{sharedTrips > 0 ? `≈ ${co2Kg} kg` : "—"}</p>
          <p className="mt-1 text-xs font-semibold text-white/60">CO₂ évité (estimation)</p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Panel title="Mes trajets" actionHref="/covoiturage" actionLabel="Proposer">
          {myRides.length === 0 ? (
            <Empty text="Aucun trajet en ligne." href="/covoiturage" cta="Proposer un trajet" />
          ) : (
            myRides.map((ride: any) => {
              const requests = incomingRequests.filter((r: any) => r.ride_id === ride.id);
              return (
                <Card key={ride.id}>
                  <RouteLine from={ride.origin} to={ride.destination} />
                  <p className="mt-2.5 flex items-center gap-1.5 text-sm text-[#5b6b62]">
                    <CalendarClock className="h-4 w-4 text-[#00b868]" />
                    {ride.departure_time
                      ? new Date(ride.departure_time).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                      : "Date non précisée"}
                  </p>
                  <p className="mt-1 text-sm text-[#5b6b62]">
                    {ride.seats_available} place{ride.seats_available > 1 ? "s" : ""} restante{ride.seats_available > 1 ? "s" : ""}
                  </p>

                  {requests.length > 0 && (
                    <div className="mt-3 space-y-2 rounded-2xl bg-white p-3 ring-1 ring-[#00b868]/30">
                      <p className="text-xs font-bold text-[#008f51]">Demandes reçues</p>
                      {requests.map((req: any) => (
                        <div key={req.id} className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm">
                            {req.passenger_name} · {req.seats} place{req.seats > 1 ? "s" : ""}
                          </span>
                          <span className="flex shrink-0 gap-1">
                            <button
                              onClick={() => handleRespond(req.id, true)}
                              className="inline-flex items-center gap-1 rounded-full bg-[#00b868] px-3 py-1.5 text-xs font-bold text-white"
                            >
                              <Check className="h-3.5 w-3.5" /> Accepter
                            </button>
                            <button
                              onClick={() => handleRespond(req.id, false)}
                              className="inline-flex items-center gap-1 rounded-full bg-[#0c1f17]/5 px-3 py-1.5 text-xs font-bold"
                            >
                              <X className="h-3.5 w-3.5" /> Refuser
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => handleDeleteRide(ride.id)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-xs font-bold text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </button>
                </Card>
              );
            })
          )}
        </Panel>

        <Panel title="Mes réservations">
          {myBookings.length === 0 ? (
            <Empty text="Aucune réservation à venir." href="/covoiturage" cta="Trouver un trajet" />
          ) : (
            myBookings.map((booking: any) => (
              <Card key={booking.id}>
                <div className="flex items-center justify-between gap-2">
                  <RouteLine from={booking.rides?.origin} to={booking.rides?.destination} />
                  <span className="shrink-0 rounded-full bg-[#00b868]/10 px-2.5 py-1 text-[11px] font-bold text-[#008f51]">
                    {STATUS_LABEL[booking.status] || booking.status}
                  </span>
                </div>
                <p className="mt-2.5 flex items-center gap-1.5 text-sm text-[#5b6b62]">
                  <CalendarClock className="h-4 w-4 text-[#00b868]" />
                  {booking.rides?.departure_time
                    ? new Date(booking.rides.departure_time).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                    : "Date non précisée"}
                  {booking.seats > 1 ? ` · ${booking.seats} places` : ""}
                </p>
                <div className="mt-3 flex gap-2">
                  {booking.rides?.driver_id && (
                    <button
                      onClick={() => contactDriver(booking.rides.driver_id, booking.rides.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#0c1f17]/5 px-4 py-2 text-xs font-bold"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Contacter
                    </button>
                  )}
                  {booking.status !== "completed" && (
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-xs font-bold text-red-700"
                    >
                      <X className="h-3.5 w-3.5" />
                      Annuler
                    </button>
                  )}
                </div>
              </Card>
            ))
          )}
        </Panel>

        <Panel title="Mes bornes" actionHref="/bornes" actionLabel="Ajouter">
          {myStations.length === 0 ? (
            <Empty text="Aucune borne partagée." href="/bornes" cta="Partager ma borne" />
          ) : (
            myStations.map((station: any) => (
              <Card key={station.id}>
                <p className="font-display font-extrabold">{station.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[#5b6b62]">
                  <MapPin className="h-4 w-4 text-[#00b868]" />
                  {station.city || station.address}
                </p>
                <p className="mt-1 text-sm text-[#5b6b62]">
                  {station.power_kw ? `${station.power_kw} kW` : "Puissance non renseignée"}
                  {station.price_cents_per_kwh
                    ? ` · ${(station.price_cents_per_kwh / 100).toFixed(2)} €/kWh`
                    : ""}
                </p>
              </Card>
            ))
          )}
        </Panel>
      </div>
    </main>
  );
}

function RouteLine({ from, to }: { from?: string; to?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 shrink-0 rounded-full bg-[#00b868]" />
      <span className="font-display truncate text-sm font-extrabold">{from}</span>
      <span className="trip-dash min-w-4 flex-1" aria-hidden="true" />
      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#00b868]" />
      <span className="font-display truncate text-sm font-extrabold">{to}</span>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-3xl bg-white p-6 ring-1 ring-[#0c1f17]/5">
      <Icon className="h-6 w-6 text-[#00b868]" />
      <p className="font-display mt-4 text-3xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[#5b6b62]">{label}</p>
    </div>
  );
}

function Panel({ title, actionHref, actionLabel, children }: any) {
  return (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-[#0c1f17]/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-extrabold">{title}</h2>
        {actionHref && (
          <Link href={actionHref} className="rounded-full bg-[#00b868] px-4 py-1.5 text-xs font-bold text-white">
            {actionLabel}
          </Link>
        )}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Card({ children }: any) {
  return <div className="rounded-2xl bg-[#f4f8f5] p-4">{children}</div>;
}

function Empty({ text, href, cta }: any) {
  return (
    <div className="rounded-2xl bg-[#f4f8f5] p-5 text-center">
      <p className="text-sm text-[#5b6b62]">{text}</p>
      <Link href={href} className="mt-3 inline-block text-sm font-bold text-[#008f51]">
        {cta} →
      </Link>
    </div>
  );
}

"use client";
import { supabase } from "./supabaseClient";
export async function getCurrentUser() { const { data, error } = await supabase.auth.getUser(); if (error) throw error; return data.user ?? null; }
export async function getCurrentUserOrThrow() { const user = await getCurrentUser(); if (!user) throw new Error("Utilisateur non connecté."); return user; }
export async function ensureProfile(user: any) {
  if (!user?.id) throw new Error("Utilisateur non connecté.");
  const { data, error } = await supabase.from("profiles").upsert({ id: user.id, email: user.email ?? null, full_name: user.user_metadata?.full_name ?? user.email ?? "Utilisateur TAPGOO", avatar_url: user.user_metadata?.avatar_url ?? null }, { onConflict: "id" }).select().single();
  if (error) throw error; return data;
}
export async function searchTrips(filters: { depart?: string; arrivee?: string; date?: string } = {}) {
  const depart = filters.depart?.trim() || ""; const arrivee = filters.arrivee?.trim() || ""; const date = filters.date || "";
  let query = supabase.from("rides").select(`id,driver_id,origin,destination,departure_time,seats_total,seats_available,price_cents,vehicle_info,status,profiles:driver_id(full_name,avatar_url)`).eq("status", "active").gt("seats_available", 0).order("departure_time", { ascending: true });
  if (depart) query = query.ilike("origin", `%${depart}%`); if (arrivee) query = query.ilike("destination", `%${arrivee}%`);
  if (date) { const start = new Date(`${date}T00:00:00`); const end = new Date(`${date}T23:59:59`); query = query.gte("departure_time", start.toISOString()).lte("departure_time", end.toISOString()); }
  else query = query.gte("departure_time", new Date().toISOString());
  const { data, error } = await query; if (error) throw error;
  return (data || []).map((ride: any) => ({ ...ride, driver_name: ride.profiles?.full_name || "Conducteur TAPGOO", driver_avatar_url: ride.profiles?.avatar_url || null }));
}
export async function createRide(payload: any) {
  const user = await getCurrentUserOrThrow(); await ensureProfile(user);
  const seats = Math.max(1, Number(payload.seats_available || 1)); const departure = new Date(payload.departure_time);
  if (!payload.origin?.trim() || !payload.destination?.trim() || !payload.departure_time) throw new Error("Départ, arrivée et date sont obligatoires.");
  if (Number.isNaN(departure.getTime())) throw new Error("Date de départ invalide.");
  const { data, error } = await supabase.from("rides").insert({ driver_id: user.id, origin: payload.origin.trim(), destination: payload.destination.trim(), departure_time: departure.toISOString(), seats_total: seats, seats_available: seats, price_cents: payload.price_cents ?? null, vehicle_info: payload.vehicle_info || null, status: "active" }).select().single();
  if (error) throw error; return data;
}
export async function bookTrip(rideId: string) {
  const user = await getCurrentUserOrThrow(); await ensureProfile(user);
  const { data, error } = await supabase.rpc("book_ride", { p_ride_id: rideId, p_passenger_id: user.id });
  if (error) throw error; return data;
}
export async function getMyDashboard() {
  const user = await getCurrentUserOrThrow(); await ensureProfile(user);
  const [profileRes, ridesRes, bookingsRes, stationsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("rides").select("*").eq("driver_id", user.id).order("departure_time", { ascending: false }),
    supabase.from("ride_bookings").select(`*,rides(id,origin,destination,departure_time,price_cents,driver_id)`).eq("passenger_id", user.id).order("created_at", { ascending: false }),
    supabase.from("charging_stations").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
  ]);
  if (profileRes.error) throw profileRes.error; if (ridesRes.error) throw ridesRes.error; if (bookingsRes.error) throw bookingsRes.error; if (stationsRes.error) throw stationsRes.error;
  return { profile: profileRes.data, myRides: ridesRes.data || [], myBookings: bookingsRes.data || [], myStations: stationsRes.data || [] };
}
export async function searchStations(city = "") {
  let query = supabase.from("charging_stations").select("*").eq("status", "available").order("created_at", { ascending: false });
  if (city.trim()) query = query.ilike("city", `%${city.trim()}%`);
  const { data, error } = await query; if (error) throw error; return data || [];
}
export async function createStation(payload: any) {
  const user = await getCurrentUserOrThrow(); await ensureProfile(user);
  if (!payload.name?.trim() || !payload.address?.trim()) throw new Error("Nom et adresse sont obligatoires.");
  const { data, error } = await supabase.from("charging_stations").insert({ owner_id: user.id, name: payload.name.trim(), address: payload.address.trim(), city: payload.city?.trim() || null, power_kw: payload.power_kw ? Number(payload.power_kw) : null, plug_type: payload.plug_type?.trim() || null, price_cents_per_kwh: payload.price_cents_per_kwh ?? null, status: "available", description: payload.description || null }).select().single();
  if (error) throw error; return data;
}
export async function cancelBooking(bookingId: string) {
  const user = await getCurrentUserOrThrow();

  const { data, error } = await supabase.rpc("cancel_ride_booking", {
    p_booking_id: bookingId,
    p_passenger_id: user.id,
  });

  if (error) throw error;

  return data;
}
export async function deleteRide(rideId: string) {
  const user = await getCurrentUserOrThrow();

  const { data, error } = await supabase.rpc("delete_my_ride", {
    p_ride_id: rideId,
    p_driver_id: user.id,
  });

  if (error) throw error;
  return data;
}
export async function getProfile() {
  const user = await getCurrentUserOrThrow();
  await ensureProfile(user);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfile(payload: any) {
  const user = await getCurrentUserOrThrow();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: payload.full_name?.trim() || null,
      phone: payload.phone?.trim() || null,
      city: payload.city?.trim() || null,
      vehicle: payload.vehicle?.trim() || null,
      bio: payload.bio?.trim() || null,
    })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
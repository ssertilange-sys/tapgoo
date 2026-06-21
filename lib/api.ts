"use client";
import { supabase } from "./supabaseClient";
export async function getCurrentUser() { const { data, error } = await supabase.auth.getUser(); if (error) throw error; return data.user ?? null; }
export async function getCurrentUserOrThrow() { const user = await getCurrentUser(); if (!user) throw new Error("Utilisateur non connecté."); return user; }
export async function ensureProfile(user: any) {
  if (!user?.id) throw new Error("Utilisateur non connecté.");
  // Schéma OS : le trigger handle_new_user crée déjà le profil à l'inscription.
  // Filet de sécurité idempotent — garantit l'existence du profil sans écraser
  // un display_name déjà personnalisé (ignoreDuplicates). Pas de colonnes
  // email/full_name en OS : l'email vit dans auth.users, le nom = display_name.
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split("@")[0] ??
        "Membre TAPGOO",
      avatar_url: user.user_metadata?.avatar_url ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (error) throw error;
}
// Schéma OS : rides utilise origin_label/destination_label/suggested_price_cents
// et statut 'published'. On renvoie une forme v4 (origin/destination/price_cents)
// pour garder la page covoiturage inchangée. Conducteur via public_profiles.
export async function searchTrips(filters: { depart?: string; arrivee?: string; date?: string } = {}) {
  const depart = filters.depart?.trim() || ""; const arrivee = filters.arrivee?.trim() || ""; const date = filters.date || "";
  let query = supabase.from("rides").select(`id,driver_id,origin_label,destination_label,departure_time,seats_total,seats_available,suggested_price_cents,vehicle_info,status`).eq("status", "published").gt("seats_available", 0).order("departure_time", { ascending: true });
  if (depart) query = query.ilike("origin_label", `%${depart}%`); if (arrivee) query = query.ilike("destination_label", `%${arrivee}%`);
  if (date) { const start = new Date(`${date}T00:00:00`); const end = new Date(`${date}T23:59:59`); query = query.gte("departure_time", start.toISOString()).lte("departure_time", end.toISOString()); }
  else query = query.gte("departure_time", new Date().toISOString());
  const { data, error } = await query; if (error) throw error;
  const rides = data || [];
  const driverIds = Array.from(new Set(rides.map((r: any) => r.driver_id).filter(Boolean)));
  let profilesById: Record<string, any> = {};
  if (driverIds.length) {
    const { data: profs, error: pErr } = await supabase.from("public_profiles").select("id,display_name,avatar_url").in("id", driverIds);
    if (pErr) throw pErr;
    profilesById = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
  }
  return rides.map((ride: any) => ({
    id: ride.id,
    driver_id: ride.driver_id,
    origin: ride.origin_label,
    destination: ride.destination_label,
    departure_time: ride.departure_time,
    seats_total: ride.seats_total,
    seats_available: ride.seats_available,
    price_cents: ride.suggested_price_cents,
    vehicle_info: ride.vehicle_info,
    driver_name: profilesById[ride.driver_id]?.display_name || "Conducteur TAPGOO",
    driver_avatar_url: profilesById[ride.driver_id]?.avatar_url || null,
  }));
}
export async function createRide(payload: any) {
  const user = await getCurrentUserOrThrow(); await ensureProfile(user);
  const seats = Math.max(1, Number(payload.seats_available || 1)); const departure = new Date(payload.departure_time);
  if (!payload.origin?.trim() || !payload.destination?.trim() || !payload.departure_time) throw new Error("Départ, arrivée et date sont obligatoires.");
  if (Number.isNaN(departure.getTime())) throw new Error("Date de départ invalide.");
  // Publication via RPC create_ride (ressource + trajet en une transaction).
  const { data, error } = await supabase.rpc("create_ride", {
    p_origin_label: payload.origin.trim(),
    p_destination_label: payload.destination.trim(),
    p_departure_time: departure.toISOString(),
    p_seats_total: seats,
    p_price_cents: payload.price_cents ?? 0,
    p_vehicle_info: payload.vehicle_info || null,
  });
  if (error) throw error; return data;
}
export async function bookTrip(rideId: string, seats: number = 1) {
  const user = await getCurrentUserOrThrow(); await ensureProfile(user);
  // OS : book_ride crée une demande 'pending' de N places (le conducteur valide).
  const { data, error } = await supabase.rpc("book_ride", { p_ride_id: rideId, p_seats: Math.max(1, Number(seats) || 1) });
  if (error) throw error; return data;
}
// Conducteur : accepte (décrément des sièges, anti-surbooking) ou refuse une demande.
export async function respondToBooking(bookingId: string, accept: boolean) {
  await getCurrentUserOrThrow();
  const { error } = await supabase.rpc("respond_to_booking", { p_booking_id: bookingId, p_accept: accept });
  if (error) throw error;
}
// Validation mutuelle d'un trajet effectué (→ completed + éligibilité FMD).
export async function validateBooking(bookingId: string) {
  await getCurrentUserOrThrow();
  const { error } = await supabase.rpc("validate_ride_booking", { p_booking_id: bookingId });
  if (error) throw error;
}
export async function getMyDashboard() {
  const user = await getCurrentUserOrThrow(); await ensureProfile(user);
  const [profileRes, ridesRes, bookingsRes, stationsRes] = await Promise.all([
    supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).maybeSingle(),
    supabase.from("rides").select("id,origin_label,destination_label,departure_time,seats_available,status").eq("driver_id", user.id).order("departure_time", { ascending: false }),
    supabase.from("ride_bookings").select(`id,status,seats,ride_id,rides(id,origin_label,destination_label,departure_time,suggested_price_cents,driver_id)`).eq("passenger_id", user.id).order("created_at", { ascending: false }),
    supabase.from("charging_stations").select("id,name,address,power_kw,suggested_price_cents_per_kwh").eq("owner_user_id", user.id).order("created_at", { ascending: false }),
  ]);
  if (profileRes.error) throw profileRes.error; if (ridesRes.error) throw ridesRes.error; if (bookingsRes.error) throw bookingsRes.error; if (stationsRes.error) throw stationsRes.error;

  const myRides = (ridesRes.data || []).map((r: any) => ({ id: r.id, origin: r.origin_label, destination: r.destination_label, departure_time: r.departure_time, seats_available: r.seats_available, status: r.status }));
  const myBookings = (bookingsRes.data || []).map((b: any) => ({ id: b.id, status: b.status, seats: b.seats, rides: b.rides ? { id: b.rides.id, origin: b.rides.origin_label, destination: b.rides.destination_label, departure_time: b.rides.departure_time, price_cents: b.rides.suggested_price_cents, driver_id: b.rides.driver_id } : null }));
  const myStations = (stationsRes.data || []).map((s: any) => ({ id: s.id, name: s.name, city: null, address: s.address, power_kw: s.power_kw, price_cents_per_kwh: s.suggested_price_cents_per_kwh }));

  // Demandes 'pending' reçues sur mes trajets (pour acceptation/refus).
  const myRideIds = myRides.map((r: any) => r.id);
  let incomingRequests: any[] = [];
  if (myRideIds.length) {
    const { data: reqs, error: reqErr } = await supabase.from("ride_bookings").select("id,seats,passenger_id,ride_id").in("ride_id", myRideIds).eq("status", "pending");
    if (reqErr) throw reqErr;
    const passengerIds = Array.from(new Set((reqs || []).map((r: any) => r.passenger_id)));
    let names: Record<string, string> = {};
    if (passengerIds.length) {
      const { data: profs } = await supabase.from("public_profiles").select("id,display_name").in("id", passengerIds);
      names = Object.fromEntries((profs || []).map((p: any) => [p.id, p.display_name]));
    }
    const rideById: Record<string, any> = Object.fromEntries(myRides.map((r: any) => [r.id, r]));
    incomingRequests = (reqs || []).map((r: any) => ({ id: r.id, ride_id: r.ride_id, seats: r.seats, passenger_name: names[r.passenger_id] || "Passager TAPGOO", origin: rideById[r.ride_id]?.origin, destination: rideById[r.ride_id]?.destination }));
  }

  return {
    profile: profileRes.data ? { full_name: profileRes.data.display_name, avatar_url: profileRes.data.avatar_url } : null,
    myRides, myBookings, myStations, incomingRequests,
  };
}
// OS : charging_stations utilise connector_type/suggested_price_cents_per_kwh/
// is_active. On renvoie une forme v4 (plug_type/price_cents_per_kwh) pour garder
// la page bornes inchangée. Pas de colonne city → repliée dans address.
export async function searchStations(city = "") {
  let query = supabase.from("charging_stations").select("id,name,address,connector_type,power_kw,suggested_price_cents_per_kwh,is_active").eq("is_active", true).order("created_at", { ascending: false });
  if (city.trim()) query = query.ilike("address", `%${city.trim()}%`);
  const { data, error } = await query; if (error) throw error;
  return (data || []).map((s: any) => ({
    id: s.id, name: s.name, city: null, address: s.address,
    power_kw: s.power_kw, plug_type: s.connector_type,
    price_cents_per_kwh: s.suggested_price_cents_per_kwh, status: "available",
  }));
}
export async function createStation(payload: any) {
  const user = await getCurrentUserOrThrow(); await ensureProfile(user);
  if (!payload.name?.trim() || !payload.address?.trim()) throw new Error("Nom et adresse sont obligatoires.");
  const address = [payload.address?.trim(), payload.city?.trim()].filter(Boolean).join(", ");
  // Publication via RPC create_charging_station (ressource + borne transactionnelles).
  const { data, error } = await supabase.rpc("create_charging_station", {
    p_name: payload.name.trim(),
    p_address: address,
    p_connector_type: payload.plug_type?.trim() || null,
    p_power_kw: payload.power_kw ? Number(payload.power_kw) : null,
    p_price_cents_per_kwh: payload.price_cents_per_kwh ?? 0,
  });
  if (error) throw error; return data;
}
// Réserve un créneau de borne (l'anti-chevauchement est appliqué par trigger DB).
export async function bookChargingSlot(stationId: string, startsAt: string, endsAt: string, vehicleLabel?: string) {
  await getCurrentUserOrThrow();
  const { data, error } = await supabase.rpc("book_charging_slot", {
    p_station_id: stationId, p_starts_at: startsAt, p_ends_at: endsAt, p_vehicle_label: vehicleLabel || null,
  });
  if (error) throw error; return data;
}

/* ---------- Parking / garage (brique cœur) ---------- */
export async function searchParking(city = "") {
  let query = supabase.from("parking_spots").select("id,title,address,spot_type,max_height_cm,suggested_price_cents_per_hour,is_active").eq("is_active", true).order("created_at", { ascending: false });
  if (city.trim()) query = query.ilike("address", `%${city.trim()}%`);
  const { data, error } = await query; if (error) throw error;
  return (data || []).map((s: any) => ({
    id: s.id, title: s.title, city: null, address: s.address,
    spot_type: s.spot_type, max_height_cm: s.max_height_cm,
    price_cents_per_hour: s.suggested_price_cents_per_hour, status: "available",
  }));
}
export async function createParking(payload: any) {
  const user = await getCurrentUserOrThrow(); await ensureProfile(user);
  if (!payload.title?.trim() || !payload.address?.trim()) throw new Error("Intitulé et adresse sont obligatoires.");
  const address = [payload.address?.trim(), payload.city?.trim()].filter(Boolean).join(", ");
  // Publication via RPC create_parking_spot (ressource + place transactionnelles).
  const { data, error } = await supabase.rpc("create_parking_spot", {
    p_title: payload.title.trim(),
    p_address: address,
    p_spot_type: payload.spot_type?.trim() || "standard",
    p_max_height_cm: payload.max_height_cm ? Number(payload.max_height_cm) : null,
    p_price_cents_per_hour: payload.price_cents_per_hour ?? 0,
  });
  if (error) throw error; return data;
}
// Réserve un créneau de parking (anti-chevauchement par trigger DB).
export async function bookParkingSlot(spotId: string, startsAt: string, endsAt: string) {
  await getCurrentUserOrThrow();
  const { data, error } = await supabase.rpc("book_parking_slot", {
    p_spot_id: spotId, p_starts_at: startsAt, p_ends_at: endsAt,
  });
  if (error) throw error; return data;
}
export async function cancelBooking(bookingId: string) {
  await getCurrentUserOrThrow();
  // OS : cancel_my_booking (restitue les sièges si la résa était acceptée).
  const { error } = await supabase.rpc("cancel_my_booking", { p_booking_id: bookingId });
  if (error) throw error;
}
export async function deleteRide(rideId: string) {
  const user = await getCurrentUserOrThrow();
  // OS : pas de delete_my_ride ; on passe le trajet en 'cancelled' (RLS : conducteur).
  const { error } = await supabase
    .from("rides")
    .update({ status: "cancelled" })
    .eq("id", rideId)
    .eq("driver_id", user.id);
  if (error) throw error;
}
// Schéma OS : le profil est éclaté sur plusieurs tables. getProfile recompose
// une vue unique pour le front. L'email vient de auth.users (non dupliqué).
export async function getProfile() {
  const user = await getCurrentUserOrThrow();
  await ensureProfile(user);

  const [profRes, privRes, vehRes, orgsRes] = await Promise.all([
    supabase.from("profiles").select("display_name,avatar_url,default_city").eq("id", user.id).maybeSingle(),
    supabase.from("user_private_profiles").select("phone").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_vehicles").select("label").eq("user_id", user.id).eq("is_default", true).maybeSingle(),
    supabase.from("organization_members").select("role,organizations(name)").eq("user_id", user.id),
  ]);
  if (profRes.error) throw profRes.error;
  if (privRes.error) throw privRes.error;
  if (vehRes.error) throw vehRes.error;
  if (orgsRes.error) throw orgsRes.error;

  return {
    display_name: profRes.data?.display_name || "",
    email: user.email || "",
    avatar_url: profRes.data?.avatar_url || "",
    default_city: profRes.data?.default_city || "",
    phone: privRes.data?.phone || "",
    vehicle: vehRes.data?.label || "",
    organizations: (orgsRes.data || []).map((m: any) => ({
      name: m.organizations?.name || "",
      role: m.role,
    })),
  };
}

// Écrit chaque champ vers sa table OS : public (profiles), privé
// (user_private_profiles), véhicule (user_vehicles). L'appartenance entreprise
// (organizations) se gère dans l'espace entreprise, pas ici.
export async function updateProfile(payload: any) {
  const user = await getCurrentUserOrThrow();
  await ensureProfile(user);

  // Champs PUBLICS. display_name est NOT NULL : on ne l'écrase pas avec du vide.
  const pub: any = { default_city: payload.default_city?.trim() || null };
  const name = payload.display_name?.trim();
  if (name) pub.display_name = name;
  const { error: e1 } = await supabase.from("profiles").update(pub).eq("id", user.id);
  if (e1) throw e1;

  // Champ PRIVÉ (téléphone) → user_private_profiles.
  const { error: e2 } = await supabase
    .from("user_private_profiles")
    .upsert({ user_id: user.id, phone: payload.phone?.trim() || null }, { onConflict: "user_id" });
  if (e2) throw e2;

  // Véhicule par défaut → user_vehicles (update si présent, sinon insert).
  const vlabel = payload.vehicle?.trim();
  if (vlabel) {
    const { data: veh } = await supabase
      .from("user_vehicles").select("id").eq("user_id", user.id).eq("is_default", true).maybeSingle();
    if (veh) {
      const { error } = await supabase.from("user_vehicles").update({ label: vlabel }).eq("id", veh.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("user_vehicles").insert({ user_id: user.id, label: vlabel, is_default: true });
      if (error) throw error;
    }
  }

  return getProfile();
}

/* ---------- Photo de profil ---------- */
export async function uploadAvatar(file: File) {
  const user = await getCurrentUserOrThrow();
  if (!file.type.startsWith("image/")) throw new Error("Le fichier doit être une image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image trop lourde (5 Mo maximum).");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${user.id}/avatar.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: updErr } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);
  if (updErr) throw updErr;

  return url;
}

/* ---------- Messagerie ---------- */
export async function startConversation(otherUserId: string, rideId?: string | null) {
  const user = await getCurrentUserOrThrow();
  await ensureProfile(user);
  const { data, error } = await supabase.rpc("start_conversation", {
    p_other_user: otherUserId,
    p_ride_id: rideId ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function listConversations() {
  await getCurrentUserOrThrow();
  const { data, error } = await supabase.rpc("list_conversations");
  if (error) throw error;
  return (data || []) as Array<{
    conversation_id: string;
    other_name: string | null;
    other_avatar: string | null;
    last_body: string | null;
    last_at: string | null;
  }>;
}

export async function getMessages(conversationId: string) {
  const user = await getCurrentUserOrThrow();
  const { data, error } = await supabase
    .from("messages")
    .select("id,sender_id,body,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return { messages: data || [], myId: user.id };
}

export async function sendMessage(conversationId: string, body: string) {
  const user = await getCurrentUserOrThrow();
  const text = body.trim();
  if (!text) throw new Error("Message vide.");
  if (text.length > 2000) throw new Error("Message trop long (2000 caractères max).");
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body: text });
  if (error) throw error;
}

/* ---------- Espace entreprise ---------- */
// Crée une organisation et rattache le créateur comme 'owner' (RPC transactionnel).
export async function createOrganization(payload: { name: string; org_type?: string; siret?: string; billing_email?: string }) {
  await getCurrentUserOrThrow();
  const { data, error } = await supabase.rpc("create_organization", {
    p_name: payload.name?.trim(),
    p_org_type: payload.org_type || "company",
    p_siret: payload.siret?.trim() || null,
    p_billing_email: payload.billing_email?.trim() || null,
  });
  if (error) throw error;
  return data as string; // id de l'organisation
}

// Liste les organisations de l'utilisateur courant + son rôle.
export async function getMyOrganizations() {
  await getCurrentUserOrThrow();
  const { data, error } = await supabase
    .from("organization_members")
    .select("role,organizations(id,name,org_type,verified)")
    .eq("status", "active");
  if (error) throw error;
  return (data || [])
    .filter((m: any) => m.organizations)
    .map((m: any) => ({ id: m.organizations.id, name: m.organizations.name, org_type: m.organizations.org_type, verified: m.organizations.verified, role: m.role }));
}

// Détail complet d'une organisation : org, membres (+ noms), invitations en
// attente, sites, et tableau de bord agrégé (vue v_organization_mobility_dashboard).
export async function getOrganization(orgId: string) {
  await getCurrentUserOrThrow();
  const [orgRes, membersRes, invRes, sitesRes, dashRes] = await Promise.all([
    supabase.from("organizations").select("id,name,org_type,siret,verified,owner_user_id").eq("id", orgId).maybeSingle(),
    supabase.from("organization_members").select("id,user_id,role,job_title,status").eq("organization_id", orgId),
    supabase.from("organization_invitations").select("id,email,role,expires_at").is("accepted_at", null).eq("organization_id", orgId),
    supabase.from("organization_sites").select("id,name,city").eq("organization_id", orgId),
    supabase.from("v_organization_mobility_dashboard").select("*").eq("organization_id", orgId).maybeSingle(),
  ]);
  if (orgRes.error) throw orgRes.error;
  if (membersRes.error) throw membersRes.error;
  if (sitesRes.error) throw sitesRes.error;
  if (dashRes.error) throw dashRes.error;

  const members = membersRes.data || [];
  const ids = Array.from(new Set(members.map((m: any) => m.user_id)));
  let names: Record<string, string> = {};
  if (ids.length) {
    const { data: profs } = await supabase.from("public_profiles").select("id,display_name").in("id", ids);
    names = Object.fromEntries((profs || []).map((p: any) => [p.id, p.display_name]));
  }
  return {
    org: orgRes.data,
    members: members.map((m: any) => ({ ...m, name: names[m.user_id] || "Membre TAPGOO" })),
    invitations: invRes.data || [], // vide si l'appelant n'est pas owner/admin (RLS)
    sites: sitesRes.data || [],
    dashboard: dashRes.data || null,
  };
}

// Invite un membre (owner/admin). Renvoie le token de l'invitation (à transmettre).
export async function inviteMember(orgId: string, email: string, role: string = "member") {
  const user = await getCurrentUserOrThrow();
  const { data, error } = await supabase
    .from("organization_invitations")
    .insert({ organization_id: orgId, email: email.trim().toLowerCase(), role, created_by: user.id })
    .select("token")
    .single();
  if (error) throw error;
  return data?.token as string;
}

// Rejoindre une organisation via un token d'invitation (email vérifié côté DB).
export async function acceptInvitation(token: string) {
  await getCurrentUserOrThrow();
  const { data, error } = await supabase.rpc("accept_organization_invitation", { p_token: token.trim() });
  if (error) throw error;
  return data as string;
}

// Change le rôle d'un membre (owner/admin via RLS).
export async function updateMemberRole(memberId: string, role: string) {
  await getCurrentUserOrThrow();
  const { error } = await supabase.from("organization_members").update({ role }).eq("id", memberId);
  if (error) throw error;
}

// Retire un membre de l'organisation (owner/admin via RLS).
export async function removeMember(memberId: string) {
  await getCurrentUserOrThrow();
  const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
  if (error) throw error;
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BatteryCharging,
  Building2,
  Car,
  Leaf,
  Loader2,
  Mail,
  SquareParking,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import {
  acceptInvitation,
  createOrganization,
  getCurrentUser,
  getMyOrganizations,
  getOrganization,
  inviteMember,
  removeMember,
  updateMemberRole,
} from "../../lib/api";

const ROLES = ["member", "manager", "admin", "payroll", "finance", "rse", "facility"];
const ORG_TYPES = [
  ["company", "Entreprise"],
  ["collectivity", "Collectivité"],
  ["association", "Association"],
  ["commerce", "Commerce"],
  ["education", "Éducation"],
  ["healthcare", "Santé"],
  ["public_service", "Service public"],
  ["other", "Autre"],
];

export default function EntreprisePage() {
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const [message, setMessage] = useState("");
  const [myId, setMyId] = useState<string | null>(null);

  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);

  const [newOrg, setNewOrg] = useState({ name: "", org_type: "company", siret: "" });
  const [invite, setInvite] = useState({ email: "", role: "member" });
  const [token, setToken] = useState("");

  async function loadOrgs(keep?: string) {
    try {
      const list = await getMyOrganizations();
      setOrgs(list);
      const sel = keep || selectedId || list[0]?.id || null;
      setSelectedId(sel);
      if (sel) await loadDetail(sel);
      else setDetail(null);
    } catch (e: any) {
      if ((e.message || "").includes("non connecté")) setLoggedOut(true);
      else setMessage("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setSelectedId(id);
    try {
      setDetail(await getOrganization(id));
    } catch {
      setMessage("Impossible de charger cette organisation.");
    }
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      const id = await createOrganization(newOrg);
      setNewOrg({ name: "", org_type: "company", siret: "" });
      setMessage("Organisation créée.");
      await loadOrgs(id);
    } catch {
      setMessage("Impossible de créer l'organisation.");
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setMessage("");
    try {
      const tok = await inviteMember(selectedId, invite.email, invite.role);
      setInvite({ email: "", role: "member" });
      setMessage(`Invitation créée. Token à transmettre : ${tok}`);
      await loadDetail(selectedId);
    } catch {
      setMessage("Impossible d'inviter ce membre (droits insuffisants ?).");
    }
  }

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      const id = await acceptInvitation(token);
      setToken("");
      setMessage("Vous avez rejoint l'organisation.");
      await loadOrgs(id);
    } catch (e: any) {
      setMessage(e.message || "Invitation invalide.");
    }
  }

  async function handleRole(memberId: string, role: string) {
    setMessage("");
    try {
      await updateMemberRole(memberId, role);
      if (selectedId) await loadDetail(selectedId);
    } catch {
      setMessage("Changement de rôle impossible.");
    }
  }

  async function handleRemove(memberId: string) {
    setMessage("");
    try {
      await removeMember(memberId);
      if (selectedId) await loadDetail(selectedId);
    } catch {
      setMessage("Suppression impossible.");
    }
  }

  useEffect(() => {
    getCurrentUser().then((u) => setMyId(u?.id ?? null)).catch(() => setMyId(null));
    loadOrgs();
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
          <Building2 className="mx-auto h-10 w-10 text-[#00b868]" />
          <h1 className="font-display mt-4 text-2xl font-extrabold">Espace entreprise</h1>
          <p className="mt-3 text-sm leading-6 text-[#5b6b62]">
            Connectez-vous pour créer ou gérer votre organisation.
          </p>
          <Link href="/connexion" className="mt-6 inline-block rounded-full bg-[#00b868] px-6 py-3 text-sm font-bold text-white">
            Se connecter
          </Link>
        </div>
      </main>
    );
  }

  const myRole = detail?.members?.find((m: any) => m.user_id === myId)?.role;
  const canManage = myRole === "owner" || myRole === "admin";
  const d = detail?.dashboard;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">Espace entreprise</h1>
      <p className="mt-2 text-sm text-[#5b6b62]">
        Gérez votre organisation, vos membres et suivez votre mobilité partagée.
      </p>

      {message && (
        <p className="mt-5 break-words rounded-2xl bg-[#00b868]/10 px-5 py-3.5 text-sm font-semibold text-[#008f51]" role="status">
          {message}
        </p>
      )}

      <div className="mt-7 grid gap-6 md:grid-cols-[0.8fr_1.6fr]">
        {/* Colonne gauche : mes orgs + création + invitation */}
        <aside className="space-y-5">
          <section className="rounded-3xl bg-white p-5 ring-1 ring-[#0c1f17]/5">
            <h2 className="font-display text-lg font-extrabold">Mes organisations</h2>
            <ul className="mt-3 space-y-1">
              {orgs.length === 0 && <li className="text-sm text-[#5b6b62]">Aucune organisation.</li>}
              {orgs.map((o) => (
                <li key={o.id}>
                  <button
                    onClick={() => loadDetail(o.id)}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm ${
                      selectedId === o.id ? "bg-[#00b868]/10 font-bold text-[#008f51]" : "hover:bg-[#f4f8f5]"
                    }`}
                  >
                    <span className="truncate">{o.name}</span>
                    <span className="shrink-0 rounded-full bg-[#0c1f17]/5 px-2 py-0.5 text-[11px] font-bold">{o.role}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <form onSubmit={handleCreateOrg} className="rounded-3xl bg-white p-5 ring-1 ring-[#0c1f17]/5">
            <h2 className="font-display text-lg font-extrabold">Créer une organisation</h2>
            <input
              value={newOrg.name}
              onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
              placeholder="Nom de l'organisation"
              required
              className="mt-3 w-full rounded-2xl bg-[#f4f8f5] px-4 py-3 text-sm outline-none"
            />
            <select
              value={newOrg.org_type}
              onChange={(e) => setNewOrg({ ...newOrg, org_type: e.target.value })}
              className="mt-2 w-full rounded-2xl bg-[#f4f8f5] px-4 py-3 text-sm outline-none"
            >
              {ORG_TYPES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input
              value={newOrg.siret}
              onChange={(e) => setNewOrg({ ...newOrg, siret: e.target.value })}
              placeholder="SIRET (optionnel)"
              className="mt-2 w-full rounded-2xl bg-[#f4f8f5] px-4 py-3 text-sm outline-none"
            />
            <button className="mt-3 w-full rounded-full bg-[#00b868] px-5 py-2.5 text-sm font-bold text-white">Créer</button>
          </form>

          <form onSubmit={handleAccept} className="rounded-3xl bg-white p-5 ring-1 ring-[#0c1f17]/5">
            <h2 className="font-display text-lg font-extrabold">Rejoindre via invitation</h2>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Coller le token d'invitation"
              className="mt-3 w-full rounded-2xl bg-[#f4f8f5] px-4 py-3 text-sm outline-none"
            />
            <button className="mt-3 w-full rounded-full bg-[#0c1f17] px-5 py-2.5 text-sm font-bold text-white">Rejoindre</button>
          </form>
        </aside>

        {/* Colonne droite : détail de l'org sélectionnée */}
        <section className="space-y-5">
          {!detail?.org ? (
            <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-[#0c1f17]/5">
              <Building2 className="mx-auto h-9 w-9 text-[#00b868]" />
              <p className="mt-3 text-sm text-[#5b6b62]">
                Sélectionnez ou créez une organisation pour afficher son tableau de bord.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold">{detail.org.name}</h2>
                <span className="rounded-full bg-[#0c1f17]/5 px-3 py-1 text-xs font-bold">
                  {detail.org.verified ? "Vérifiée" : "Non vérifiée"} · Votre rôle : {myRole}
                </span>
              </div>

              {/* Tableau de bord */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Kpi icon={Users} label="Membres" value={d?.members ?? detail.members.length} />
                <Kpi icon={Car} label="Trajets" value={d?.rides ?? 0} />
                <Kpi icon={BatteryCharging} label="Bornes" value={d?.charging_stations ?? 0} />
                <Kpi icon={SquareParking} label="Places parking" value={d?.parking_spots ?? 0} />
                <Kpi icon={Building2} label="Sites" value={detail.sites.length} />
                <div className="rounded-3xl bg-[#0c1f17] p-6 text-white">
                  <Leaf className="h-6 w-6 text-[#00b868]" />
                  <p className="font-display mt-3 text-2xl font-extrabold">
                    ≈ {Math.round(Number(d?.avoided_kgco2e ?? 0))} kg
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white/60">CO₂ évité (estimation)</p>
                </div>
              </div>

              <p className="flex items-center gap-2 text-xs text-[#5b6b62]">
                <BarChart3 className="h-4 w-4 text-[#00b868]" />
                Indicateurs prêts pour FMD, reporting mobilité (BEGES/CSRD) et multi-sites — activés progressivement.
              </p>

              {/* Membres */}
              <section className="rounded-3xl bg-white p-5 ring-1 ring-[#0c1f17]/5">
                <h3 className="font-display text-lg font-extrabold">Membres</h3>
                <ul className="mt-3 divide-y divide-[#0c1f17]/5">
                  {detail.members.map((m: any) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <UserRound className="h-4 w-4 shrink-0 text-[#008f51]" />
                        <span className="truncate text-sm font-semibold">{m.name}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {canManage && m.user_id !== myId ? (
                          <>
                            <select
                              value={m.role}
                              onChange={(e) => handleRole(m.id, e.target.value)}
                              className="rounded-full bg-[#f4f8f5] px-3 py-1.5 text-xs font-bold outline-none"
                            >
                              {["owner", ...ROLES].map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                            <button onClick={() => handleRemove(m.id)} className="rounded-full bg-red-50 p-2 text-red-700" aria-label="Retirer">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="rounded-full bg-[#0c1f17]/5 px-3 py-1 text-xs font-bold">{m.role}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Invitations (owner/admin) */}
              {canManage && (
                <section className="rounded-3xl bg-white p-5 ring-1 ring-[#0c1f17]/5">
                  <h3 className="font-display text-lg font-extrabold">Inviter un membre</h3>
                  <form onSubmit={handleInvite} className="mt-3 flex flex-wrap gap-2">
                    <input
                      type="email"
                      value={invite.email}
                      onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                      placeholder="email@entreprise.fr"
                      required
                      className="min-w-[200px] flex-1 rounded-2xl bg-[#f4f8f5] px-4 py-3 text-sm outline-none"
                    />
                    <select
                      value={invite.role}
                      onChange={(e) => setInvite({ ...invite, role: e.target.value })}
                      className="rounded-2xl bg-[#f4f8f5] px-4 py-3 text-sm font-bold outline-none"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button className="inline-flex items-center gap-2 rounded-full bg-[#00b868] px-5 py-3 text-sm font-bold text-white">
                      <Mail className="h-4 w-4" /> Inviter
                    </button>
                  </form>
                  {detail.invitations.length > 0 && (
                    <ul className="mt-4 space-y-1 text-sm text-[#5b6b62]">
                      {detail.invitations.map((inv: any) => (
                        <li key={inv.id} className="flex items-center justify-between">
                          <span className="truncate">{inv.email} · {inv.role}</span>
                          <span className="text-xs">en attente</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Kpi({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-3xl bg-white p-6 ring-1 ring-[#0c1f17]/5">
      <Icon className="h-6 w-6 text-[#00b868]" />
      <p className="font-display mt-3 text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[#5b6b62]">{label}</p>
    </div>
  );
}

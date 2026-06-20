"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Save, UserRound } from "lucide-react";
import { getProfile, updateProfile } from "../../lib/api";

const inputClass = "w-full rounded-2xl bg-[#f4f8f5] px-4 py-3.5 outline-none placeholder:text-[#5b6b62]";

export default function ProfilPage() {
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    display_name: "",
    email: "",
    avatar_url: "",
    default_city: "",
    phone: "",
    vehicle: "",
  });
  const [organizations, setOrganizations] = useState<Array<{ name: string; role: string }>>([]);

  async function load() {
    try {
      const profile = await getProfile();
      setForm({
        display_name: profile.display_name || "",
        email: profile.email || "",
        avatar_url: profile.avatar_url || "",
        default_city: profile.default_city || "",
        phone: profile.phone || "",
        vehicle: profile.vehicle || "",
      });
      setOrganizations(profile.organizations || []);
    } catch (e: any) {
      if ((e.message || "").includes("non connecté")) setLoggedOut(true);
      else setMessage("Erreur de chargement du profil.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await updateProfile(form);
      setMessage("Profil enregistré.");
    } catch {
      setMessage("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
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
          <h1 className="font-display mt-4 text-2xl font-extrabold">Mon profil</h1>
          <p className="mt-3 text-sm leading-6 text-[#5b6b62]">
            Connectez-vous pour compléter votre profil : un profil renseigné
            inspire confiance aux autres membres.
          </p>
          <Link href="/connexion" className="mt-6 inline-block rounded-full bg-[#00b868] px-6 py-3 text-sm font-bold text-white">
            Se connecter
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">Mon profil</h1>
      <p className="mt-2 text-sm text-[#5b6b62]">
        Ces informations rassurent les membres avec qui vous partagez un trajet
        ou une borne. Votre téléphone n'est jamais affiché publiquement.
      </p>

      <div className="mt-7 grid gap-6 md:grid-cols-[0.7fr_1.3fr]">
        <aside className="h-fit rounded-3xl bg-white p-7 text-center ring-1 ring-[#0c1f17]/5">
          <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#00b868]/10">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="Votre avatar" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-12 w-12 text-[#008f51]" />
            )}
          </div>
          <p className="font-display mt-4 text-xl font-extrabold">
            {form.display_name || "Membre TAPGOO"}
          </p>
          <p className="mt-1 text-sm text-[#5b6b62]">{form.email}</p>
          {form.default_city && <p className="mt-1 text-sm text-[#5b6b62]">{form.default_city}</p>}
          {organizations.length > 0 && (
            <div className="mt-4 border-t border-[#0c1f17]/5 pt-4 text-left">
              <p className="text-xs font-bold uppercase tracking-wide text-[#5b6b62]">Entreprises</p>
              <ul className="mt-2 space-y-1">
                {organizations.map((o, i) => (
                  <li key={i} className="text-sm text-[#0c1f17]">
                    {o.name} <span className="text-[#5b6b62]">· {o.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <form onSubmit={saveProfile} className="rounded-3xl bg-white p-7 ring-1 ring-[#0c1f17]/5">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nom complet">
              <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} maxLength={100} className={inputClass} />
            </Field>
            <Field label="Email">
              <input value={form.email} readOnly disabled className={inputClass + " opacity-70"} />
            </Field>
            <Field label="Téléphone (privé)">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} className={inputClass} />
            </Field>
            <Field label="Ville">
              <input value={form.default_city} onChange={(e) => setForm({ ...form, default_city: e.target.value })} maxLength={100} className={inputClass} />
            </Field>
            <Field label="Véhicule" full>
              <input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} maxLength={100} placeholder="ex : Renault Zoé" className={inputClass} />
            </Field>
          </div>

          {message && (
            <p className="mt-4 rounded-2xl bg-[#00b868]/10 px-4 py-3 text-sm font-semibold text-[#008f51]" role="status">
              {message}
            </p>
          )}

          <button
            disabled={saving}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#00b868] px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </form>
      </div>

    </main>
  );
}

function Field({ label, full, children }: any) {
  return (
    <label className={`block text-sm font-semibold ${full ? "md:col-span-2" : ""}`}>
      {label}
      <span className="mt-1.5 block font-normal">{children}</span>
    </label>
  );
}

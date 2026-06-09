"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Car, Loader2, Mail, MapPin, Phone, Save, UserRound } from "lucide-react";
import { getProfile, updateProfile } from "../../lib/api";

export default function ProfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    avatar_url: "",
    phone: "",
    city: "",
    vehicle: "",
    company: "",
    bio: "",
  });

  async function load() {
    try {
      const profile = await getProfile();

      setForm({
        full_name: profile?.full_name || "",
        email: profile?.email || "",
        avatar_url: profile?.avatar_url || "",
        phone: profile?.phone || "",
        city: profile?.city || "",
        vehicle: profile?.vehicle || "",
        company: profile?.company || "",
        bio: profile?.bio || "",
      });
    } catch (e: any) {
      setMessage(e.message || "Erreur de chargement du profil.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setMessage("");

    try {
      await updateProfile(form);
      setMessage("Profil enregistré.");
    } catch (e: any) {
      setMessage(e.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
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

  return (
    <main className="min-h-screen bg-[#fbfbf8] px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-black tracking-tight">
            TAP<span className="text-emerald-600">GOO</span>
          </Link>

          <Link
            href="/dashboard"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Dashboard
          </Link>
        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
            <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-emerald-50">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-14 w-14 text-emerald-600" />
              )}
            </div>

            <h1 className="mt-6 text-3xl font-black">
              {form.full_name || "Utilisateur TAPGOO"}
            </h1>

            <p className="mt-2 text-sm font-bold text-slate-500">{form.email}</p>

            <div className="mt-6 grid gap-3 text-left">
              <Info icon={MapPin} label="Ville" value={form.city || "Non renseignée"} />
              <Info icon={Car} label="Véhicule" value={form.vehicle || "Non renseigné"} />
              <Info icon={Building2} label="Entreprise" value={form.company || "Non renseignée"} />
            </div>
          </aside>

          <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-100">
            <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
              Profil utilisateur
            </p>

            <h2 className="mt-3 text-4xl font-black">Mes informations</h2>

            <p className="mt-3 text-slate-600">
              Ces informations serviront à renforcer la confiance entre conducteurs,
              passagers et propriétaires de bornes.
            </p>

            {message && (
              <div className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-700">
                {message}
              </div>
            )}

            <div className="mt-8 grid gap-5">
              <Input
                label="Nom complet"
                value={form.full_name}
                onChange={(v: string) => setForm({ ...form, full_name: v })}
              />

              <Input
                label="Email"
                value={form.email}
                disabled
                icon={Mail}
                onChange={() => {}}
              />

              <Input
                label="URL de la photo"
                value={form.avatar_url}
                onChange={(v: string) => setForm({ ...form, avatar_url: v })}
              />

              <Input
                label="Téléphone"
                value={form.phone}
                icon={Phone}
                onChange={(v: string) => setForm({ ...form, phone: v })}
              />

              <Input
                label="Ville"
                value={form.city}
                icon={MapPin}
                onChange={(v: string) => setForm({ ...form, city: v })}
              />

              <Input
                label="Véhicule"
                value={form.vehicle}
                icon={Car}
                onChange={(v: string) => setForm({ ...form, vehicle: v })}
              />

              <Input
                label="Entreprise"
                value={form.company}
                icon={Building2}
                onChange={(v: string) => setForm({ ...form, company: v })}
              />

              <label>
                <span className="text-sm font-black text-slate-700">Bio</span>
                <textarea
                  rows={5}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Présentez-vous brièvement..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </label>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-4 font-black text-white shadow-lg shadow-emerald-600/20"
              >
                <Save className="h-5 w-5" />
                {saving ? "Enregistrement..." : "Enregistrer le profil"}
              </button>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Info({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400">
        <Icon className="h-4 w-4 text-emerald-600" />
        {label}
      </div>
      <p className="mt-2 font-bold text-slate-800">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, icon: Icon, disabled = false }: any) {
  return (
    <label>
      <span className="text-sm font-black text-slate-700">{label}</span>
      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        {Icon && <Icon className="h-5 w-5 text-emerald-600" />}
        <input
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent outline-none disabled:text-slate-500"
        />
      </div>
    </label>
  );
}
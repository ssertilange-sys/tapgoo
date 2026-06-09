"use client";
import { supabase } from "./supabaseClient";
export async function signInWithGoogle(redirectPath = "/dashboard") {
  const redirectTo = `${window.location.origin}${redirectPath}`;
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  if (error) { console.error("Erreur connexion Google:", error); alert(error.message || "Erreur de connexion Google"); }
}
export async function signOutAndGoHome() { await supabase.auth.signOut(); window.location.href = "/"; }

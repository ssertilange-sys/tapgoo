import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

// Limitation de débit simple (par instance serverless : protection "best effort")
const hits = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, max);

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: "Trop de demandes. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Honeypot : si rempli, c'est un robot → on répond OK sans rien faire
    if (clean(body.website, 100)) return NextResponse.json({ ok: true });

    const nom = clean(body.nom, 100);
    const email = clean(body.email, 200);
    const entreprise = clean(body.entreprise, 150);
    const message = clean(body.message, 5000);

    if (!nom || !email || !message) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants." },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (admin) {
      await admin
        .from("contact_messages")
        .insert({ nom, email, entreprise: entreprise || null, message });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: process.env.CONTACT_FROM || "onboarding@resend.dev",
        to: process.env.CONTACT_TO || "ssertilange@gmail.com",
        subject: `Nouveau contact TAPGOO — ${nom}${entreprise ? ` (${entreprise})` : ""}`,
        replyTo: email,
        text: `Nom : ${nom}\nEmail : ${email}\nEntreprise : ${entreprise || "—"}\n\n${message}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur contact:", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

"use client";

import { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";

// Réservation d'un créneau horaire, partagée entre bornes et parking.
// onBook reçoit des dates ISO ; l'anti-chevauchement est garanti côté DB.
export default function SlotBooking({
  onBook,
}: {
  onBook: (startIso: string, endIso: string) => Promise<void>;
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    if (!start || !end) {
      setMsg("Indiquez un début et une fin.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await onBook(new Date(start).toISOString(), new Date(end).toISOString());
      setMsg("Créneau réservé.");
      setStart("");
      setEnd("");
    } catch (e: any) {
      const m = e.message || "";
      if (m.includes("réservé") || m.includes("chevauch") || m.includes("créneau"))
        setMsg("Créneau déjà pris, choisissez un autre horaire.");
      else if (m.includes("Connexion")) setMsg("Connectez-vous pour réserver.");
      else setMsg("Réservation impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-[#0c1f17]/5 pt-4">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-[#5b6b62]">
          Début
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded-xl bg-[#f4f8f5] px-3 py-2 text-sm outline-none"
          />
        </label>
        <label className="text-xs font-semibold text-[#5b6b62]">
          Fin
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-full rounded-xl bg-[#f4f8f5] px-3 py-2 text-sm outline-none"
          />
        </label>
      </div>
      <button
        onClick={submit}
        disabled={busy}
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#00b868] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5" />}
        Réserver un créneau
      </button>
      {msg && <p className="mt-2 text-xs font-semibold text-[#008f51]">{msg}</p>}
    </div>
  );
}

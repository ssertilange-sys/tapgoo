"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, MessageCircle, Send, UserRound } from "lucide-react";
import { getCurrentUser, getMessages, listConversations, sendMessage } from "../../lib/api";

export default function MessagesPage() {
  return (
    <Suspense fallback={<Centered><Loader2 className="h-8 w-8 animate-spin text-[#00b868]" /></Centered>}>
      <MessagesInner />
    </Suspense>
  );
}

function MessagesInner() {
  const params = useSearchParams();
  const initialConv = params.get("c");

  const [user, setUser] = useState<any>(undefined); // undefined = en chargement
  const [conversations, setConversations] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(initialConv);
  const [messages, setMessages] = useState<any[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadList() {
    try {
      const data = await listConversations();
      setConversations(data);
    } catch {
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }

  async function loadThread(id: string) {
    try {
      const { messages, myId } = await getMessages(id);
      setMessages(messages);
      setMyId(myId);
    } catch {
      setMessages([]);
    }
  }

  async function submit() {
    if (!active || !draft.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(active, draft);
      setDraft("");
      await loadThread(active);
      await loadList();
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        setUser(u);
        if (u) loadList();
        else setLoadingList(false);
      })
      .catch(() => {
        setUser(null);
        setLoadingList(false);
      });
  }, []);

  useEffect(() => {
    if (active) loadThread(active);
  }, [active]);

  // Rafraîchissement léger du fil ouvert
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => loadThread(active), 10000);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (user === undefined) {
    return <Centered><Loader2 className="h-8 w-8 animate-spin text-[#00b868]" /></Centered>;
  }

  if (user === null) {
    return (
      <Centered>
        <div className="max-w-md rounded-3xl bg-white p-8 text-center ring-1 ring-[#0c1f17]/5">
          <MessageCircle className="mx-auto h-10 w-10 text-[#00b868]" />
          <h1 className="font-display mt-4 text-2xl font-extrabold">Vos messages</h1>
          <p className="mt-3 text-sm leading-6 text-[#5b6b62]">
            Connectez-vous pour échanger avec les conducteurs, passagers et
            propriétaires de bornes.
          </p>
          <Link
            href="/connexion"
            className="mt-6 inline-block rounded-full bg-[#00b868] px-6 py-3 text-sm font-bold text-white"
          >
            Se connecter
          </Link>
        </div>
      </Centered>
    );
  }

  const activeConv = conversations.find((c) => c.conversation_id === active);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Messages</h1>

      <div className="mt-6 grid gap-5 md:grid-cols-[0.9fr_1.6fr]">
        {/* Liste des conversations */}
        <section
          className={`rounded-3xl bg-white p-3 ring-1 ring-[#0c1f17]/5 ${active ? "hidden md:block" : ""}`}
          aria-label="Conversations"
        >
          {loadingList ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#00b868]" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-[#00b868]" />
              <p className="mt-3 text-sm font-semibold">Aucune conversation pour l'instant</p>
              <p className="mt-2 text-sm leading-6 text-[#5b6b62]">
                Réservez un trajet ou contactez un conducteur depuis la page
                Covoiturage : la conversation démarre ici.
              </p>
              <Link
                href="/covoiturage"
                className="mt-5 inline-block rounded-full bg-[#00b868] px-5 py-2.5 text-sm font-bold text-white"
              >
                Voir les trajets
              </Link>
            </div>
          ) : (
            <ul className="space-y-1">
              {conversations.map((c) => (
                <li key={c.conversation_id}>
                  <button
                    onClick={() => setActive(c.conversation_id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ${
                      active === c.conversation_id ? "bg-[#00b868]/10" : "hover:bg-[#f4f8f5]"
                    }`}
                  >
                    <Avatar url={c.other_avatar} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {c.other_name || "Membre TAPGOO"}
                      </span>
                      <span className="block truncate text-xs text-[#5b6b62]">
                        {c.last_body || "Nouvelle conversation"}
                      </span>
                    </span>
                    {c.last_at && (
                      <span className="shrink-0 text-[11px] text-[#5b6b62]">
                        {new Date(c.last_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Fil ouvert */}
        <section
          className={`flex min-h-[60vh] flex-col rounded-3xl bg-white ring-1 ring-[#0c1f17]/5 ${!active ? "hidden md:flex" : ""}`}
          aria-label="Fil de discussion"
        >
          {!active ? (
            <div className="m-auto p-10 text-center text-sm text-[#5b6b62]">
              Sélectionnez une conversation pour afficher les messages.
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-[#0c1f17]/5 px-4 py-3">
                <button
                  onClick={() => setActive(null)}
                  className="rounded-full p-2 hover:bg-[#f4f8f5] md:hidden"
                  aria-label="Retour à la liste"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar url={activeConv?.other_avatar} />
                <p className="text-sm font-bold">{activeConv?.other_name || "Membre TAPGOO"}</p>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#5b6b62]">
                    Dites bonjour pour lancer la conversation.
                  </p>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === myId;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                            mine ? "bg-[#00b868] text-white" : "bg-[#f4f8f5] text-[#0c1f17]"
                          }`}
                        >
                          {m.body}
                          <span className={`mt-1 block text-[10px] ${mine ? "text-white/70" : "text-[#5b6b62]"}`}>
                            {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <footer className="flex items-end gap-2 border-t border-[#0c1f17]/5 p-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Écrire un message…"
                  aria-label="Votre message"
                  className="max-h-32 flex-1 resize-none rounded-2xl bg-[#f4f8f5] px-4 py-3 text-sm outline-none"
                />
                <button
                  onClick={submit}
                  disabled={sending || !draft.trim()}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00b868] text-white disabled:opacity-40"
                  aria-label="Envoyer"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </footer>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Avatar({ url }: { url?: string | null }) {
  return url ? (
    <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00b868]/10">
      <UserRound className="h-5 w-5 text-[#008f51]" />
    </span>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-[70vh] items-center justify-center px-4">{children}</main>;
}

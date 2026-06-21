-- ============================================================
-- 08 — Messagerie (copie 1:1, structures identiques)
-- Pré-requis : rides migrés (05) car conversations.ride_id → rides.
-- ============================================================
insert into public.conversations (id, ride_id, created_at)
select c.id, c.ride_id, coalesce(c.created_at, now())
from legacy.conversations c
on conflict (id) do nothing;

insert into public.conversation_members (conversation_id, user_id, last_read_at)
select m.conversation_id, m.user_id, m.last_read_at
from legacy.conversation_members m
on conflict (conversation_id, user_id) do nothing;

insert into public.messages (id, conversation_id, sender_id, body, created_at)
select m.id, m.conversation_id, m.sender_id, m.body, coalesce(m.created_at, now())
from legacy.messages m
on conflict (id) do nothing;

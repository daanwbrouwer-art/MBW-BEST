-- Applied directly to the live project via the Supabase MCP tools; mirrored
-- here for documentation (see the divergence note in
-- 20260727180000_nearby_users_blocks_and_threads_foundation.sql).
--
-- Both functions are SECURITY DEFINER because profiles RLS only lets a user
-- read their own row — these expose just (id, username) of someone you
-- already share a thread with, nothing else, and only to thread participants.

create or replace function public.get_my_threads()
returns table (
  thread_id uuid,
  other_user_id uuid,
  other_username text,
  last_message_body text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  is_unread boolean,
  muted boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  me uuid := auth.uid();
begin
  return query
  select
    t.id,
    case when t.user_a = me then t.user_b else t.user_a end,
    p.username,
    m.body,
    m.created_at,
    m.sender_id,
    (
      m.created_at is not null
      and m.sender_id <> me
      and m.created_at > coalesce(
        case when t.user_a = me then t.last_read_a else t.last_read_b end,
        '-infinity'::timestamptz
      )
    ),
    case when t.user_a = me then t.muted_by_a else t.muted_by_b end
  from public.chat_threads t
  join public.profiles p on p.id = (case when t.user_a = me then t.user_b else t.user_a end)
  left join lateral (
    select cm.body, cm.created_at, cm.sender_id
    from public.chat_messages cm
    where cm.thread_id = t.id
    order by cm.created_at desc
    limit 1
  ) m on true
  where t.user_a = me or t.user_b = me
  order by coalesce(m.created_at, t.created_at) desc;
end;
$$;

revoke all on function public.get_my_threads() from public;
grant execute on function public.get_my_threads() to authenticated;

create or replace function public.get_thread_peer(p_thread_id uuid)
returns table (id uuid, username text)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  me uuid := auth.uid();
  peer uuid;
begin
  select case when user_a = me then user_b else user_a end into peer
  from public.chat_threads
  where id = p_thread_id and (user_a = me or user_b = me);
  if peer is null then
    return;
  end if;
  return query select p.id, p.username from public.profiles p where p.id = peer;
end;
$$;

revoke all on function public.get_thread_peer(uuid) from public;
grant execute on function public.get_thread_peer(uuid) to authenticated;

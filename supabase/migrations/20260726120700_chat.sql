create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint chat_threads_distinct_users check (user_a <> user_b)
);

create unique index chat_threads_unique_pair_idx
  on public.chat_threads (least(user_a, user_b), greatest(user_a, user_b));

alter table public.chat_threads enable row level security;

create policy "chat_threads_select_participant"
  on public.chat_threads for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "chat_threads_insert_participant"
  on public.chat_threads for insert
  to authenticated
  with check (auth.uid() = user_a or auth.uid() = user_b);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index chat_messages_thread_id_idx on public.chat_messages (thread_id, created_at);

alter table public.chat_messages enable row level security;

create policy "chat_messages_select_participant"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_threads t
      where t.id = chat_messages.thread_id
        and (auth.uid() = t.user_a or auth.uid() = t.user_b)
    )
  );

create policy "chat_messages_insert_participant"
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chat_threads t
      where t.id = chat_messages.thread_id
        and (auth.uid() = t.user_a or auth.uid() = t.user_b)
    )
  );

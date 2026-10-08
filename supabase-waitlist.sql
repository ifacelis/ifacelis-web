-- Ifacelis · tabla de lista de espera
-- Pega esto en Supabase → SQL Editor → New query → Run

create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  consent boolean not null default false check (consent),
  source text,
  created_at timestamptz not null default now()
);

-- Seguridad: nadie puede leer la lista desde la web, solo apuntarse
alter table public.waitlist enable row level security;

drop policy if exists "anon can join waitlist" on public.waitlist;
create policy "anon can join waitlist" on public.waitlist
  for insert to anon
  with check (consent = true);

-- Para ver tu lista: Supabase → Table Editor → waitlist

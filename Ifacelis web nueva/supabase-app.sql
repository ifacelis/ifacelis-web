-- =====================================================================
-- Ifacelis · base de datos de la app
-- Supabase → SQL Editor → New query → pega TODO → Run
-- (La tabla waitlist ya existe; esto no la toca.)
-- =====================================================================

-- 1) Perfil: lo que la persona puede editar (cuestionario y presupuesto)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  questionnaire jsonb,
  budget text check (budget in ('low','equilibrado','premium')),
  photo_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Cuenta: estado de pago y del plan. SOLO lo escribe el servidor.
create table if not exists public.accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  sub_status text not null default 'none',      -- none | active | trialing | past_due | canceled
  sub_period_end timestamptz,
  free_scan_used boolean not null default false,
  cycle int not null default 1,                 -- sube cada vez que vuelve tras una baja
  needs_restart boolean not null default false, -- vuelve tras baja: cuestionario + escaneo nuevos
  phase int not null default 1,
  cycle_started_at timestamptz not null default now(),
  plan_dirty boolean not null default false,  -- hay que rehacer el plan
  updated_at timestamptz not null default now()
);

-- 3) Escaneos (inicial y semanales). SOLO los escribe el servidor.
create table if not exists public.scans (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle int not null,
  kind text not null check (kind in ('initial','weekly')),
  photos text[] not null,
  result jsonb not null,
  score int,
  created_at timestamptz not null default now()
);
create index if not exists scans_user_idx on public.scans(user_id, created_at desc);

-- 4) Planes (rutina, agua, alimentación, hábitos, tareas). SOLO servidor.
create table if not exists public.plans (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle int not null,
  phase int not null,
  budget text,
  plan jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists plans_user_idx on public.plans(user_id, created_at desc);

-- 5) Maquillaje según rasgos. SOLO servidor.
create table if not exists public.features (
  user_id uuid primary key references auth.users(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now()
);

-- 6) Racha: tareas marcadas cada día. La persona escribe las suyas.
create table if not exists public.daily_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  done text[] not null default '{}',
  total int not null default 0,
  primary key (user_id, day)
);

-- 7) Diario de fotos (sin IA). La persona escribe las suyas.
create table if not exists public.diary (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null,
  note text,
  created_at timestamptz not null default now()
);

-- 8) Chat. SOLO servidor escribe; la persona lee los suyos.
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_user_idx on public.chat_messages(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Seguridad (RLS): cada persona solo ve lo suyo
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.accounts      enable row level security;
alter table public.scans         enable row level security;
alter table public.plans         enable row level security;
alter table public.features      enable row level security;
alter table public.daily_logs    enable row level security;
alter table public.diary         enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile insert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile read"   on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own account read" on public.accounts;
create policy "own account read" on public.accounts for select to authenticated using (user_id = auth.uid());

drop policy if exists "own scans read" on public.scans;
create policy "own scans read" on public.scans for select to authenticated using (user_id = auth.uid());

drop policy if exists "own plans read" on public.plans;
create policy "own plans read" on public.plans for select to authenticated using (user_id = auth.uid());

drop policy if exists "own features read" on public.features;
create policy "own features read" on public.features for select to authenticated using (user_id = auth.uid());

drop policy if exists "own logs all" on public.daily_logs;
create policy "own logs all" on public.daily_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own diary all" on public.diary;
create policy "own diary all" on public.diary for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own chat read" on public.chat_messages;
create policy "own chat read" on public.chat_messages for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Fotos: carpeta privada "faces". Cada persona solo su subcarpeta.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('faces', 'faces', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "faces own read"   on storage.objects;
drop policy if exists "faces own insert" on storage.objects;
drop policy if exists "faces own delete" on storage.objects;
create policy "faces own read" on storage.objects for select to authenticated
  using (bucket_id = 'faces' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "faces own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'faces' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "faces own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'faces' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- Cambios del 17-10-2026: escaneo sin cuenta previa (sesión anónima)
-- ---------------------------------------------------------------------
alter table public.scans add column if not exists ip text;
create index if not exists scans_ip_idx on public.scans(ip, created_at desc);

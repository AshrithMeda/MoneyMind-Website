create table if not exists public.events (
  id text primary key,
  title text not null,
  emoji text not null default '🌟',
  date timestamptz not null,
  location text not null,
  capacity integer not null check (capacity > 0),
  description text not null,
  financial_concepts text[] not null default '{}',
  published boolean not null default true,
  photos text[] not null default '{}',
  reflection text not null default '',
  highlights text not null default '',
  waitlist_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  student_name text not null,
  age integer not null check (age between 8 and 18),
  parent_name text not null,
  parent_email text not null,
  parent_phone text not null default '',
  consent boolean not null default false,
  status text not null default 'confirmed' check (status in ('confirmed', 'waitlist', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.events add column if not exists waitlist_enabled boolean not null default false;

alter table public.events enable row level security;
alter table public.registrations enable row level security;

drop policy if exists "Public can read events" on public.events;
create policy "Public can read events"
  on public.events for select
  to anon, authenticated
  using (true);

drop policy if exists "Site can manage events" on public.events;
create policy "Site can manage events"
  on public.events for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Public can read registrations" on public.registrations;
create policy "Public can read registrations"
  on public.registrations for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can create registrations" on public.registrations;
create policy "Public can create registrations"
  on public.registrations for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Site can update registrations" on public.registrations;
create policy "Site can update registrations"
  on public.registrations for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Site can delete registrations" on public.registrations;
create policy "Site can delete registrations"
  on public.registrations for delete
  to anon, authenticated
  using (true);

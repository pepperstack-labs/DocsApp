create extension if not exists btree_gist with schema extensions;

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text not null,
  initials text not null
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_name text not null check (char_length(trim(patient_name)) between 2 and 100),
  doctor_id uuid not null references public.doctors(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null check (char_length(trim(reason)) between 2 and 250),
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  -- Fixed 30-minute appointments. A database constraint prevents concurrent double-booking.
  constraint doctor_no_overlap exclude using gist (
    doctor_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled')
);
create index appointments_starts_at_idx on public.appointments(starts_at);

-- Browser clients must use Fastify. No anonymous Data API access to clinic records.
alter table public.doctors enable row level security;
alter table public.appointments enable row level security;
revoke all on public.doctors, public.appointments from anon, authenticated;

create function public.set_appointment_end() returns trigger language plpgsql set search_path = '' as $$
begin
 new.ends_at := new.starts_at + interval '30 minutes';
 return new;
end;
$$;
create trigger appointment_end before insert or update on public.appointments for each row execute function public.set_appointment_end();

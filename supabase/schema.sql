-- ============================================================================
-- schema.sql
--
-- Las columnas coinciden 1:1 con el contrato de apiClient.js:
--   readings        { id, device_id, ts, posture, p1..p6, temp, hum }
--   position_events { id, device_id, position, source, timestamp, ack_by }
--   alerts          { id, device_id, severity, type, message, ack, ack_by, ack_ts, ts }
--   devices         { id, name, last_seen, online, empty }
--   settings        { device_id, patient_name, patient_weight_kg, initial_position,
--                     empty_bed_min_weight, side_diff_pct, delta_temp_c, confirm_min,
--                     alert_min, sample_rate_s, tx_interval_s, reposition_interval_min,
--                     updated_at }
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.devices (
  id        text primary key,
  name      text not null default '',
  last_seen timestamptz,
  online    boolean not null default false,
  empty     boolean not null default false
);

create table if not exists public.readings (
  id        bigint generated always as identity primary key,
  device_id text not null references public.devices (id) on delete cascade,
  ts        timestamptz not null default now(),
  posture   text,
  p1 int, p2 int, p3 int, p4 int, p5 int, p6 int,   -- 0..4095 ADC (FSR406)
  temp      real,                                   -- °C
  hum       real                                    -- %
);

create table if not exists public.position_events (
  id        bigint generated always as identity primary key,
  device_id text not null references public.devices (id) on delete cascade,
  position  text not null,
  source    text not null default 'sensor',          -- 'sensor' | 'cuidador'
  timestamp timestamptz not null default now(),
  ack_by    text
);

create table if not exists public.alerts (
  id        bigint generated always as identity primary key,
  device_id text not null references public.devices (id) on delete cascade,
  severity  text not null default 'info',            -- 'critical' | 'warning' | 'info'
  type      text,
  message   text,
  ack       boolean not null default false,
  ack_by    text,
  ack_ts    timestamptz,
  ts        timestamptz not null default now()
);

create table if not exists public.settings (
  device_id              text primary key references public.devices (id) on delete cascade,
  patient_name           text,
  patient_weight_kg      real,
  initial_position       text,
  empty_bed_min_weight   int  not null default 300,
  side_diff_pct          int  not null default 15,
  delta_temp_c           real not null default 1.5,
  confirm_min            int  not null default 10,
  alert_min              int  not null default 120,
  sample_rate_s          int  not null default 4,
  tx_interval_s          int  not null default 60,
  reposition_interval_min int not null default 120,
  updated_at             timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Trigger: cada lectura nueva refresca devices.last_seen (estado "en línea").
-- Así el ESP32 solo necesita hacer POST a `readings`; el resto se mantiene solo.
-- ---------------------------------------------------------------------------

create or replace function public.touch_device_last_seen()
returns trigger language plpgsql as $$
begin
  update public.devices
     set last_seen = new.ts,
         online    = true
   where id = new.device_id;
  return new;
end;
$$;

drop trigger if exists readings_touch_device on public.readings;
create trigger readings_touch_device
  after insert on public.readings
  for each row execute function public.touch_device_last_seen();

-- ---------------------------------------------------------------------------
-- Datos de arranque (1 dispositivo + su settings).
-- Cambia el nombre/paciente cuando tengas el hardware real.
-- ---------------------------------------------------------------------------

insert into public.devices (id, name, online, empty)
values ('esp32-001', 'Colchón 1', false, false)
on conflict (id) do nothing;

insert into public.settings (device_id, patient_name, patient_weight_kg, initial_position)
values ('esp32-001', 'Paciente', 70, 'supina')
on conflict (device_id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- NOTA: estas políticas son PERMISIVAS (el rol `anon` puede leer y escribir).
-- Es suficiente para un proyecto académico con datos reales, donde la web
-- pública usa la `anon key` y el ESP32 también usa esa misma clave.
--
-- Para producción real habría que migrar el login a Supabase Auth y restringir
-- los INSERT/UPDATE con `auth.uid()` (dejando solo la escritura del dispositivo
-- con la `service_role key`, que es secreta). Eso es trabajo futuro.
-- ---------------------------------------------------------------------------

alter table public.devices        enable row level security;
alter table public.readings       enable row level security;
alter table public.position_events enable row level security;
alter table public.alerts         enable row level security;
alter table public.settings       enable row level security;

create policy "anon select devices"         on public.devices        for select to anon using (true);
create policy "anon select readings"        on public.readings       for select to anon using (true);
create policy "anon insert readings"        on public.readings       for insert to anon with check (true);
create policy "anon select position_events" on public.position_events for select to anon using (true);
create policy "anon insert position_events" on public.position_events for insert to anon with check (true);
create policy "anon select alerts"          on public.alerts         for select to anon using (true);
create policy "anon insert alerts"          on public.alerts         for insert to anon with check (true);
create policy "anon update alerts"          on public.alerts         for update to anon using (true);
create policy "anon select settings"        on public.settings       for select to anon using (true);
create policy "anon insert settings"        on public.settings       for insert to anon with check (true);
create policy "anon update settings"        on public.settings       for update to anon using (true);

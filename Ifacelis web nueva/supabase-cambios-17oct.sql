-- Ifacelis · cambios del 17-10-2026 (pega y pulsa Run; no borra nada)
alter table public.scans add column if not exists ip text;
create index if not exists scans_ip_idx on public.scans(ip, created_at desc);

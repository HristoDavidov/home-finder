alter table public.locations
add column if not exists address_line text;

create index if not exists locations_address_line_idx
on public.locations(address_line);
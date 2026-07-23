create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  role_id bigint generated always as identity primary key,
  role_name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_role_name_lowercase_chk check (role_name = lower(role_name))
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  role_id bigint not null references public.roles(role_id) on delete cascade,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists public.property_types (
  property_type_id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_types_name_lowercase_chk check (name = lower(name))
);

create table if not exists public.listing_statuses (
  status_id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listing_statuses_name_lowercase_chk check (name = lower(name))
);

create table if not exists public.locations (
  location_id bigint generated always as identity primary key,
  country text not null,
  state_region text,
  city text not null,
  neighborhood text,
  postal_code text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_latitude_chk check (latitude is null or (latitude >= -90 and latitude <= 90)),
  constraint locations_longitude_chk check (longitude is null or (longitude >= -180 and longitude <= 180))
);

create table if not exists public.properties (
  property_id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(user_id) on delete cascade,
  property_type_id bigint not null references public.property_types(property_type_id) on delete restrict,
  status_id bigint not null references public.listing_statuses(status_id) on delete restrict,
  location_id bigint not null references public.locations(location_id) on delete restrict,
  title text not null,
  description text,
  price_amount numeric(12, 2) not null,
  currency_code char(3) not null,
  bedrooms smallint,
  bathrooms numeric(4, 1),
  parking_spaces smallint,
  area_value numeric(10, 2),
  area_unit text,
  year_built integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint properties_price_nonnegative_chk check (price_amount >= 0),
  constraint properties_currency_uppercase_chk check (currency_code = upper(currency_code)),
  constraint properties_bedrooms_nonnegative_chk check (bedrooms is null or bedrooms >= 0),
  constraint properties_bathrooms_nonnegative_chk check (bathrooms is null or bathrooms >= 0),
  constraint properties_parking_nonnegative_chk check (parking_spaces is null or parking_spaces >= 0),
  constraint properties_area_nonnegative_chk check (area_value is null or area_value >= 0),
  constraint properties_year_built_chk check (year_built is null or (year_built >= 1800 and year_built <= extract(year from now())::int + 1))
);

create table if not exists public.property_images (
  image_id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(property_id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 1,
  is_cover boolean not null default false,
  uploaded_by_user_id uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_images_sort_order_positive_chk check (sort_order > 0),
  constraint property_images_unique_path unique (storage_bucket, storage_path),
  constraint property_images_unique_order_per_property unique (property_id, sort_order)
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  property_id uuid not null references public.properties(property_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table if not exists public.amenities (
  amenity_id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint amenities_name_lowercase_chk check (name = lower(name))
);

create table if not exists public.property_amenities (
  property_id uuid not null references public.properties(property_id) on delete cascade,
  amenity_id bigint not null references public.amenities(amenity_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (property_id, amenity_id)
);

create unique index if not exists property_images_one_cover_per_property_idx
on public.property_images(property_id)
where is_cover = true;

create index if not exists user_roles_role_id_idx
on public.user_roles(role_id);

create index if not exists locations_city_state_country_idx
on public.locations(city, state_region, country);

create index if not exists locations_postal_code_idx
on public.locations(postal_code);

create index if not exists properties_owner_user_id_idx
on public.properties(owner_user_id);

create index if not exists properties_property_type_id_idx
on public.properties(property_type_id);

create index if not exists properties_status_id_idx
on public.properties(status_id);

create index if not exists properties_location_id_idx
on public.properties(location_id);

create index if not exists properties_created_at_desc_idx
on public.properties(created_at desc);

create index if not exists properties_status_type_price_idx
on public.properties(status_id, property_type_id, price_amount);

create index if not exists property_images_property_id_idx
on public.property_images(property_id);

create index if not exists property_images_property_sort_order_idx
on public.property_images(property_id, sort_order);

create index if not exists favorites_property_id_idx
on public.favorites(property_id);

create index if not exists favorites_created_at_idx
on public.favorites(created_at desc);

create index if not exists property_amenities_amenity_id_idx
on public.property_amenities(amenity_id);

create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_updated_at_roles
before update on public.roles
for each row execute function public.set_updated_at();

create trigger set_updated_at_user_roles
before update on public.user_roles
for each row execute function public.set_updated_at();

create trigger set_updated_at_property_types
before update on public.property_types
for each row execute function public.set_updated_at();

create trigger set_updated_at_listing_statuses
before update on public.listing_statuses
for each row execute function public.set_updated_at();

create trigger set_updated_at_locations
before update on public.locations
for each row execute function public.set_updated_at();

create trigger set_updated_at_properties
before update on public.properties
for each row execute function public.set_updated_at();

create trigger set_updated_at_property_images
before update on public.property_images
for each row execute function public.set_updated_at();

create trigger set_updated_at_favorites
before update on public.favorites
for each row execute function public.set_updated_at();

create trigger set_updated_at_amenities
before update on public.amenities
for each row execute function public.set_updated_at();

create trigger set_updated_at_property_amenities
before update on public.property_amenities
for each row execute function public.set_updated_at();

insert into public.roles (role_name, description)
values
  ('admin', 'Administrative user with elevated privileges'),
  ('agent', 'Agent who can manage listings'),
  ('user', 'Regular authenticated user')
on conflict (role_name) do nothing;

insert into public.property_types (name)
values
  ('apartment'),
  ('house'),
  ('land'),
  ('office'),
  ('villa')
on conflict (name) do nothing;

insert into public.listing_statuses (name)
values
  ('draft'),
  ('published'),
  ('sold'),
  ('rented'),
  ('archived')
on conflict (name) do nothing;

insert into public.amenities (name)
values
  ('pool'),
  ('garage'),
  ('elevator'),
  ('garden'),
  ('balcony')
on conflict (name) do nothing;

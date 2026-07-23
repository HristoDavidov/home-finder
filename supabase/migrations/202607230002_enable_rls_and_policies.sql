create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.role_id = ur.role_id
    where ur.user_id = auth.uid()
      and r.role_name = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.property_types enable row level security;
alter table public.listing_statuses enable row level security;
alter table public.locations enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.favorites enable row level security;
alter table public.amenities enable row level security;
alter table public.property_amenities enable row level security;

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy profiles_insert_own_or_admin
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin());

create policy profiles_update_own_or_admin
on public.profiles
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy roles_select_authenticated
on public.roles
for select
to authenticated
using (true);

create policy roles_manage_admin_only
on public.roles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy user_roles_select_own_or_admin
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy user_roles_manage_admin_only
on public.user_roles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy property_types_select_public
on public.property_types
for select
to anon, authenticated
using (true);

create policy property_types_manage_admin_only
on public.property_types
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy listing_statuses_select_public
on public.listing_statuses
for select
to anon, authenticated
using (true);

create policy listing_statuses_manage_admin_only
on public.listing_statuses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy locations_select_public
on public.locations
for select
to anon, authenticated
using (true);

create policy locations_insert_authenticated
on public.locations
for insert
to authenticated
with check (true);

create policy locations_update_admin_only
on public.locations
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy locations_delete_admin_only
on public.locations
for delete
to authenticated
using (public.is_admin());

create policy properties_select_published_or_owner_or_admin
on public.properties
for select
to anon, authenticated
using (
  public.is_admin()
  or auth.uid() = owner_user_id
  or exists (
    select 1
    from public.listing_statuses ls
    where ls.status_id = properties.status_id
      and ls.name = 'published'
  )
);

create policy properties_insert_owner_or_admin
on public.properties
for insert
to authenticated
with check (auth.uid() = owner_user_id or public.is_admin());

create policy properties_update_owner_or_admin
on public.properties
for update
to authenticated
using (auth.uid() = owner_user_id or public.is_admin())
with check (auth.uid() = owner_user_id or public.is_admin());

create policy properties_delete_owner_or_admin
on public.properties
for delete
to authenticated
using (auth.uid() = owner_user_id or public.is_admin());

create policy property_images_select_if_property_visible
on public.property_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.property_id = property_images.property_id
      and (
        public.is_admin()
        or auth.uid() = p.owner_user_id
        or exists (
          select 1
          from public.listing_statuses ls
          where ls.status_id = p.status_id
            and ls.name = 'published'
        )
      )
  )
);

create policy property_images_insert_owner_or_admin
on public.property_images
for insert
to authenticated
with check (
  exists (
    select 1
    from public.properties p
    where p.property_id = property_images.property_id
      and (auth.uid() = p.owner_user_id or public.is_admin())
  )
);

create policy property_images_update_owner_or_admin
on public.property_images
for update
to authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.property_id = property_images.property_id
      and (auth.uid() = p.owner_user_id or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.properties p
    where p.property_id = property_images.property_id
      and (auth.uid() = p.owner_user_id or public.is_admin())
  )
);

create policy property_images_delete_owner_or_admin
on public.property_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.property_id = property_images.property_id
      and (auth.uid() = p.owner_user_id or public.is_admin())
  )
);

create policy favorites_select_own_or_admin
on public.favorites
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy favorites_insert_own_or_admin
on public.favorites
for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin());

create policy favorites_update_own_or_admin
on public.favorites
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy favorites_delete_own_or_admin
on public.favorites
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy amenities_select_public
on public.amenities
for select
to anon, authenticated
using (true);

create policy amenities_manage_admin_only
on public.amenities
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy property_amenities_select_if_property_visible
on public.property_amenities
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.property_id = property_amenities.property_id
      and (
        public.is_admin()
        or auth.uid() = p.owner_user_id
        or exists (
          select 1
          from public.listing_statuses ls
          where ls.status_id = p.status_id
            and ls.name = 'published'
        )
      )
  )
);

create policy property_amenities_insert_owner_or_admin
on public.property_amenities
for insert
to authenticated
with check (
  exists (
    select 1
    from public.properties p
    where p.property_id = property_amenities.property_id
      and (auth.uid() = p.owner_user_id or public.is_admin())
  )
);

create policy property_amenities_update_owner_or_admin
on public.property_amenities
for update
to authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.property_id = property_amenities.property_id
      and (auth.uid() = p.owner_user_id or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.properties p
    where p.property_id = property_amenities.property_id
      and (auth.uid() = p.owner_user_id or public.is_admin())
  )
);

create policy property_amenities_delete_owner_or_admin
on public.property_amenities
for delete
to authenticated
using (
  exists (
    select 1
    from public.properties p
    where p.property_id = property_amenities.property_id
      and (auth.uid() = p.owner_user_id or public.is_admin())
  )
);

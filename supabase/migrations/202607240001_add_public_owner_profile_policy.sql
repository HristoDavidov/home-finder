drop policy if exists profiles_select_own_or_admin on public.profiles;

create policy profiles_select_public_visible_property_owner_or_own_or_admin
on public.profiles
for select
to anon, authenticated
using (
  auth.uid() = user_id
  or public.is_admin()
  or exists (
    select 1
    from public.properties p
    where p.owner_user_id = profiles.user_id
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
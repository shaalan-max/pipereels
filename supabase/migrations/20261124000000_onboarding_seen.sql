-- Remembers which onboarding help videos each person has dismissed ("I understand").
alter table public.profiles add column if not exists onboarding_seen text[] not null default '{}';

create or replace function public.mark_onboarding_seen(p_key text) returns void
language sql security definer set search_path = '' as $$
  update public.profiles
  set onboarding_seen = array(select distinct unnest(onboarding_seen || array[left(trim(p_key), 40)]))
  where id = (select auth.uid()) and length(trim(p_key)) > 0;
$$;

revoke execute on function public.mark_onboarding_seen(text) from public, anon;
grant execute on function public.mark_onboarding_seen(text) to authenticated;

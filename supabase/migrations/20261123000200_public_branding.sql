-- The login page shows the agency name and colour before anyone signs in.
create policy settings_read_public on public.agency_settings for select to anon using (true);

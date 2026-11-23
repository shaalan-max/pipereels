-- =============================================================================
-- Pipelooms v2 — video production workflow
-- Plan → Script → Client shoots → Footage check → Editing → Internal review
--      → Client review → Scheduled → Posted
--
-- Security model
--   * Every table has Row Level Security.
--   * has_client_access() is the single rule for "can this user see this client".
--   * Video stage changes ONLY happen through advance_video() — a trigger blocks
--     direct stage updates, so clients cannot skip steps or edit content.
--   * Clients have no UPDATE/DELETE rights on videos or plans; they act through
--     advance_video() / plan_action().
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Remove v1 (demo data only)
-- ---------------------------------------------------------------------------
drop table if exists public.task_attachments, public.task_comments, public.tasks,
  public.ideas, public.leads, public.performance_assets, public.performance_weekly,
  public.team_client_access cascade;
drop table if exists public.profiles, public.clients cascade;
drop function if exists public.current_role_val() cascade;
drop function if exists public.current_client_id() cascade;
drop function if exists public.has_client_access(uuid) cascade;
drop function if exists public.is_agency_role() cascade;
drop function if exists public.prevent_role_escalation() cascade;
delete from auth.users;

-- ---------------------------------------------------------------------------
-- 1. Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('owner', 'account_manager', 'scriptwriter', 'editor', 'client');
create type public.video_stage as enum (
  'planned', 'scripting', 'script_review', 'shooting', 'footage_check',
  'editing', 'internal_review', 'client_review', 'scheduled', 'posted'
);
create type public.plan_status as enum ('draft', 'sent', 'changes_requested', 'approved');
create type public.file_kind as enum ('raw', 'edit', 'other');

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
create table public.agency_settings (
  id          int primary key default 1 check (id = 1),
  name        text not null default 'Pipelooms',
  tagline     text not null default 'Video content, handled.',
  brand_color text not null default '#4F46E5',
  logo_url    text,
  updated_at  timestamptz not null default now()
);
insert into public.agency_settings default values;

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null,
  role       public.app_role not null,
  client_id  uuid,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  constraint client_role_has_client check ((role = 'client') = (client_id is not null))
);

create table public.clients (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (length(trim(name)) > 0),
  industry           text not null default '',
  brand_color        text not null default '#4F46E5',
  platforms          text[] not null default '{instagram,tiktok}',
  videos_per_month   int not null default 8 check (videos_per_month between 0 and 200),
  account_manager_id uuid references public.profiles (id) on delete set null,
  status             text not null default 'active' check (status in ('active', 'paused', 'archived')),
  notes              text not null default '',
  created_at         timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_client_id_fkey foreign key (client_id) references public.clients (id) on delete cascade;

-- Which team members work on which client (account manager is implied by clients.account_manager_id)
create table public.client_team (
  client_id  uuid not null references public.clients (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, profile_id)
);

create table public.content_plans (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients (id) on delete cascade,
  month           date not null check (extract(day from month) = 1),
  title           text not null,
  strategy        text not null default '',
  status          public.plan_status not null default 'draft',
  client_feedback text,
  sent_at         timestamptz,
  approved_at     timestamptz,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (client_id, month)
);

create table public.videos (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients (id) on delete cascade,
  plan_id          uuid references public.content_plans (id) on delete set null,
  title            text not null check (length(trim(title)) > 0),
  concept          text not null default '',
  hook             text not null default '',
  platforms        text[] not null default '{}',
  stage            public.video_stage not null default 'planned',
  script           text not null default '',
  shoot_notes      text not null default '',
  caption          text not null default '',
  hashtags         text not null default '',
  post_date        date,
  posted_url       text,
  scriptwriter_id  uuid references public.profiles (id) on delete set null,
  editor_id        uuid references public.profiles (id) on delete set null,
  sort_order       int not null default 0,
  stage_changed_at timestamptz not null default now(),
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.video_files (
  id             uuid primary key default gen_random_uuid(),
  video_id       uuid not null references public.videos (id) on delete cascade,
  client_id      uuid not null references public.clients (id) on delete cascade,
  kind           public.file_kind not null,
  storage_path   text not null unique,
  file_name      text not null,
  size_bytes     bigint not null default 0,
  mime_type      text not null default '',
  version        int not null default 1,
  client_visible boolean not null default false,
  uploaded_by    uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  video_id   uuid not null references public.videos (id) on delete cascade,
  file_id    uuid references public.video_files (id) on delete set null,
  author_id  uuid references public.profiles (id) on delete set null,
  body       text not null check (length(trim(body)) between 1 and 5000),
  timecode   numeric check (timecode is null or timecode >= 0),
  internal   boolean not null default false,
  resolved   boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.activity (
  id         bigint generated always as identity primary key,
  client_id  uuid not null references public.clients (id) on delete cascade,
  video_id   uuid references public.videos (id) on delete cascade,
  plan_id    uuid references public.content_plans (id) on delete cascade,
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,
  from_stage public.video_stage,
  to_stage   public.video_stage,
  note       text,
  internal   boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  body       text not null default '',
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes (foreign keys + common filters)
create index on public.profiles (client_id);
create index on public.clients (account_manager_id);
create index on public.client_team (profile_id);
create index on public.content_plans (created_by);
create index on public.videos (client_id, stage);
create index on public.videos (plan_id);
create index on public.videos (scriptwriter_id);
create index on public.videos (editor_id);
create index on public.videos (created_by);
create index on public.video_files (video_id, kind);
create index on public.video_files (client_id);
create index on public.video_files (uploaded_by);
create index on public.comments (video_id, created_at);
create index on public.comments (file_id);
create index on public.comments (author_id);
create index on public.activity (client_id, created_at desc);
create index on public.activity (video_id);
create index on public.activity (plan_id);
create index on public.activity (actor_id);
create index on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Helper functions (used by RLS policies)
-- ---------------------------------------------------------------------------
create or replace function public.my_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid()) and active;
$$;

create or replace function public.my_client_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select client_id from public.profiles where id = (select auth.uid()) and active;
$$;

create or replace function public.is_team() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role <> 'client' from public.profiles where id = (select auth.uid()) and active), false);
$$;

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('owner', 'account_manager') from public.profiles
                   where id = (select auth.uid()) and active), false);
$$;

create or replace function public.has_client_access(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.active and (
      p.role = 'owner'
      or (p.role = 'client' and p.client_id = cid)
      or (p.role <> 'client' and (
            exists (select 1 from public.client_team t where t.client_id = cid and t.profile_id = p.id)
         or exists (select 1 from public.clients c where c.id = cid and c.account_manager_id = p.id)))
    )
  );
$$;

create or replace function public.can_see_profile(target public.profiles) returns boolean
language sql stable security definer set search_path = '' as $$
  select
    target.id = (select auth.uid())
    or public.my_role() = 'owner'
    -- team members see each other
    or (public.is_team() and target.role <> 'client')
    -- team members see the client users of clients they work on
    or (public.is_team() and target.role = 'client' and public.has_client_access(target.client_id))
    -- clients see their own colleagues and the team assigned to them
    or (public.my_role() = 'client' and (
          target.client_id = public.my_client_id()
       or exists (select 1 from public.client_team t where t.client_id = public.my_client_id() and t.profile_id = target.id)
       or exists (select 1 from public.clients c where c.id = public.my_client_id() and c.account_manager_id = target.id)));
$$;

create or replace function public.try_uuid(t text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return t::uuid;
exception when others then
  return null;
end;
$$;

-- internal: recipients
create or replace function public._client_user_ids(cid uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(id), '{}') from public.profiles where client_id = cid and active;
$$;

create or replace function public._manager_ids(cid uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select case
    when c.account_manager_id is not null then array[c.account_manager_id]
    else (select coalesce(array_agg(id), '{}') from public.profiles where role = 'owner' and active)
  end
  from public.clients c where c.id = cid;
$$;

create or replace function public._notify(uids uuid[], p_title text, p_body text, p_link text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, title, body, link)
  select distinct u, p_title, coalesce(p_body, ''), p_link
  from unnest(uids) as u
  where u is not null and u is distinct from (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------------
create or replace function public._touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger content_plans_touch before update on public.content_plans
  for each row execute function public._touch_updated_at();

-- Videos: stage only changes through advance_video(); client never changes.
create or replace function public._guard_video() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(current_setting('app.stage_rpc', true), '') <> 'on' then
      new.stage := 'planned';
    end if;
  else
    if new.client_id <> old.client_id then
      raise exception 'A video cannot be moved to another client';
    end if;
    if new.stage is distinct from old.stage
       and coalesce(current_setting('app.stage_rpc', true), '') <> 'on' then
      raise exception 'Use the workflow buttons to move a video to another stage';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger videos_guard before insert or update on public.videos
  for each row execute function public._guard_video();

-- Assigning a scriptwriter/editor to a video gives them access to that client.
create or replace function public._grant_assignee_access() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.client_team (client_id, profile_id)
  select new.client_id, x
  from unnest(array[new.scriptwriter_id, new.editor_id]) as x
  where x is not null
  on conflict do nothing;
  return new;
end;
$$;

create trigger videos_assignee_access after insert or update of scriptwriter_id, editor_id on public.videos
  for each row execute function public._grant_assignee_access();

-- Files: raw footage is visible to the client; edits only once sent for review. Edits get versions.
create or replace function public._prepare_file() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.client_visible := (new.kind = 'raw');
  if new.kind = 'edit' then
    select coalesce(max(version), 0) + 1 into new.version
    from public.video_files where video_id = new.video_id and kind = 'edit';
  else
    new.version := 1;
  end if;
  return new;
end;
$$;

create trigger video_files_prepare before insert on public.video_files
  for each row execute function public._prepare_file();

-- Comments notify the other side.
create or replace function public._notify_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v public.videos;
  author_role public.app_role;
  who text;
begin
  if coalesce(current_setting('app.stage_rpc', true), '') = 'on' then
    return new;
  end if;
  select * into v from public.videos where id = new.video_id;
  select role, full_name into author_role, who from public.profiles where id = new.author_id;
  if author_role = 'client' then
    perform public._notify(public._manager_ids(v.client_id) || array[v.scriptwriter_id, v.editor_id],
      who || ' commented on "' || v.title || '"', left(new.body, 140), '/videos/' || v.id);
  elsif new.internal then
    perform public._notify(public._manager_ids(v.client_id) || array[v.scriptwriter_id, v.editor_id],
      who || ' left an internal note on "' || v.title || '"', left(new.body, 140), '/videos/' || v.id);
  else
    perform public._notify(public._client_user_ids(v.client_id),
      who || ' commented on "' || v.title || '"', left(new.body, 140), '/portal/videos/' || v.id);
    perform public._notify(public._manager_ids(v.client_id),
      who || ' commented on "' || v.title || '"', left(new.body, 140), '/videos/' || v.id);
  end if;
  return new;
end;
$$;

create trigger comments_notify after insert on public.comments
  for each row execute function public._notify_comment();

-- ---------------------------------------------------------------------------
-- 5. Workflow actions
-- ---------------------------------------------------------------------------
create or replace function public.advance_video(
  p_video    uuid,
  p_action   text,
  p_note     text default null,
  p_assignee uuid default null,
  p_url      text default null,
  p_stage    public.video_stage default null
) returns public.videos
language plpgsql security definer set search_path = '' as $$
declare
  v         public.videos;
  r         public.app_role := public.my_role();
  exp_from  public.video_stage;
  v_to      public.video_stage;
  allowed   public.app_role[];
  need_note boolean := false;
  is_internal boolean := false;
  note_comment_internal boolean := null;  -- null = don't copy note to comments
  mgrs      uuid[];
  clients_u uuid[];
  t_link    text;
  c_link    text;
  note      text := nullif(trim(coalesce(p_note, '')), '');
begin
  if r is null then
    raise exception 'You are not allowed to do this';
  end if;

  select * into v from public.videos where id = p_video for update;
  if not found or not public.has_client_access(v.client_id) then
    raise exception 'Video not found';
  end if;

  case p_action
    when 'start_script' then
      exp_from := 'planned'; v_to := 'scripting'; allowed := '{account_manager}'; is_internal := true;
    when 'send_script' then
      exp_from := 'scripting'; v_to := 'script_review'; allowed := '{account_manager,scriptwriter}';
    when 'approve_script' then
      exp_from := 'script_review'; v_to := 'shooting'; allowed := '{client,account_manager}';
    when 'request_script_changes' then
      exp_from := 'script_review'; v_to := 'scripting'; allowed := '{client,account_manager}';
      need_note := true; note_comment_internal := false;
    when 'submit_footage' then
      exp_from := 'shooting'; v_to := 'footage_check'; allowed := '{client,account_manager}';
      if not exists (select 1 from public.video_files where video_id = v.id and kind = 'raw') then
        raise exception 'Upload at least one clip before submitting';
      end if;
    when 'approve_footage' then
      exp_from := 'footage_check'; v_to := 'editing'; allowed := '{account_manager}';
    when 'request_reshoot' then
      exp_from := 'footage_check'; v_to := 'shooting'; allowed := '{account_manager}';
      need_note := true; note_comment_internal := false;
    when 'submit_edit' then
      exp_from := 'editing'; v_to := 'internal_review'; allowed := '{editor,account_manager}'; is_internal := true;
      if not exists (select 1 from public.video_files where video_id = v.id and kind = 'edit') then
        raise exception 'Upload the edited video before submitting';
      end if;
    when 'request_edit_changes' then
      exp_from := 'internal_review'; v_to := 'editing'; allowed := '{account_manager}';
      need_note := true; is_internal := true; note_comment_internal := true;
    when 'send_to_client' then
      exp_from := 'internal_review'; v_to := 'client_review'; allowed := '{account_manager}';
    when 'approve_video' then
      exp_from := 'client_review'; v_to := 'scheduled'; allowed := '{client,account_manager}';
    when 'request_video_changes' then
      exp_from := 'client_review'; v_to := 'editing'; allowed := '{client,account_manager}';
      need_note := true; note_comment_internal := false;
    when 'mark_posted' then
      exp_from := 'scheduled'; v_to := 'posted'; allowed := '{account_manager}';
    when 'set_stage' then
      if p_stage is null then raise exception 'Choose a stage'; end if;
      exp_from := v.stage; v_to := p_stage; allowed := '{account_manager}'; is_internal := true;
    else
      raise exception 'Unknown action %', p_action;
  end case;

  if not (r = 'owner' or r = any (allowed)) then
    raise exception 'Your role cannot do this step';
  end if;
  if v.stage <> exp_from then
    raise exception 'This video has already moved on — refresh the page';
  end if;
  if need_note and note is null then
    raise exception 'Please explain what needs to change';
  end if;

  if p_assignee is not null and not exists (
      select 1 from public.profiles where id = p_assignee and active and role <> 'client') then
    raise exception 'That team member was not found';
  end if;

  if p_action = 'send_to_client' then
    update public.video_files set client_visible = true
    where video_id = v.id and kind = 'edit'
      and version = (select max(version) from public.video_files where video_id = v.id and kind = 'edit');
  end if;

  perform set_config('app.stage_rpc', 'on', true);
  update public.videos set
    stage            = v_to,
    stage_changed_at = now(),
    scriptwriter_id  = case when p_action = 'start_script' and p_assignee is not null then p_assignee else scriptwriter_id end,
    editor_id        = case when p_action = 'approve_footage' and p_assignee is not null then p_assignee else editor_id end,
    posted_url       = case when p_action = 'mark_posted' then coalesce(nullif(trim(p_url), ''), posted_url) else posted_url end
  where id = v.id
  returning * into v;

  -- The change-request note is also saved as a comment (the stage notification below covers it,
  -- so the comment trigger skips notifying while app.stage_rpc is on).
  if note_comment_internal is not null then
    insert into public.comments (video_id, author_id, body, internal)
    values (v.id, (select auth.uid()), note, note_comment_internal);
  end if;
  perform set_config('app.stage_rpc', 'off', true);

  insert into public.activity (client_id, video_id, actor_id, action, from_stage, to_stage, note, internal)
  values (v.client_id, v.id, (select auth.uid()), p_action, exp_from, v_to, note, is_internal);

  -- Notifications: tell whoever owns the next step
  mgrs      := public._manager_ids(v.client_id);
  clients_u := public._client_user_ids(v.client_id);
  t_link    := '/videos/' || v.id;
  c_link    := '/portal/videos/' || v.id;

  case v_to
    when 'scripting' then
      if p_action = 'request_script_changes' then
        perform public._notify(mgrs || array[v.scriptwriter_id], 'Script changes requested: ' || v.title, note, t_link);
      else
        perform public._notify(case when v.scriptwriter_id is null then mgrs else array[v.scriptwriter_id] end,
          'New script to write: ' || v.title, '', t_link);
      end if;
    when 'script_review' then
      perform public._notify(clients_u, 'Script ready for your review: ' || v.title, 'Read it and approve or ask for changes.', c_link);
    when 'shooting' then
      if p_action = 'request_reshoot' then
        perform public._notify(clients_u, 'Reshoot needed: ' || v.title, note, c_link);
      else
        perform public._notify(clients_u, 'Ready to shoot: ' || v.title, 'Your script and shooting notes are ready.', c_link);
        perform public._notify(mgrs, 'Script approved: ' || v.title, '', t_link);
      end if;
    when 'footage_check' then
      perform public._notify(mgrs, 'Footage uploaded: ' || v.title, 'Check the raw clips.', t_link);
    when 'editing' then
      perform public._notify(case when v.editor_id is null then mgrs else array[v.editor_id] end,
        case when p_action = 'approve_footage' then 'New video to edit: ' else 'Edit changes requested: ' end || v.title,
        coalesce(note, ''), t_link);
      if p_action = 'request_video_changes' then
        perform public._notify(mgrs, 'Client requested changes: ' || v.title, note, t_link);
      end if;
    when 'internal_review' then
      perform public._notify(mgrs, 'Edit ready for review: ' || v.title, '', t_link);
    when 'client_review' then
      perform public._notify(clients_u, 'Your video is ready to review: ' || v.title, 'Watch it and approve or leave comments.', c_link);
    when 'scheduled' then
      perform public._notify(mgrs || array[v.editor_id], 'Video approved by client: ' || v.title, '', t_link);
    when 'posted' then
      perform public._notify(clients_u, 'Your video is live: ' || v.title, coalesce(v.posted_url, ''), c_link);
    else
      null;
  end case;

  return v;
end;
$$;

create or replace function public.plan_action(p_plan uuid, p_action text, p_note text default null)
returns public.content_plans
language plpgsql security definer set search_path = '' as $$
declare
  p    public.content_plans;
  r    public.app_role := public.my_role();
  note text := nullif(trim(coalesce(p_note, '')), '');
begin
  select * into p from public.content_plans where id = p_plan for update;
  if not found or r is null or not public.has_client_access(p.client_id) then
    raise exception 'Plan not found';
  end if;

  if p_action = 'send' then
    if r not in ('owner', 'account_manager') then raise exception 'Your role cannot do this step'; end if;
    if p.status not in ('draft', 'changes_requested') then raise exception 'This plan was already sent'; end if;
    if not exists (select 1 from public.videos where plan_id = p.id) then
      raise exception 'Add at least one video idea to the plan first';
    end if;
    update public.content_plans set status = 'sent', sent_at = now() where id = p.id returning * into p;
    perform public._notify(public._client_user_ids(p.client_id), 'Your content plan is ready: ' || p.title,
      'Review the ideas for this month and approve.', '/portal/plans/' || p.id);
  elsif p_action = 'approve' then
    if r not in ('owner', 'account_manager', 'client') then raise exception 'Your role cannot do this step'; end if;
    if p.status <> 'sent' then raise exception 'This plan is not waiting for approval'; end if;
    update public.content_plans set status = 'approved', approved_at = now() where id = p.id returning * into p;
    perform public._notify(public._manager_ids(p.client_id), 'Plan approved: ' || p.title,
      'Time to start the scripts.', '/clients/' || p.client_id || '/plans/' || p.id);
  elsif p_action = 'request_changes' then
    if r not in ('owner', 'account_manager', 'client') then raise exception 'Your role cannot do this step'; end if;
    if p.status <> 'sent' then raise exception 'This plan is not waiting for approval'; end if;
    if note is null then raise exception 'Please explain what needs to change'; end if;
    update public.content_plans set status = 'changes_requested', client_feedback = note
    where id = p.id returning * into p;
    perform public._notify(public._manager_ids(p.client_id), 'Plan changes requested: ' || p.title,
      note, '/clients/' || p.client_id || '/plans/' || p.id);
  else
    raise exception 'Unknown action %', p_action;
  end if;

  insert into public.activity (client_id, plan_id, actor_id, action, note)
  values (p.client_id, p.id, (select auth.uid()), 'plan_' || p_action, note);

  return p;
end;
$$;

create or replace function public.mark_notifications_read(p_ids bigint[] default null) returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now()
  where user_id = (select auth.uid()) and read_at is null and (p_ids is null or id = any (p_ids));
$$;

create or replace function public.update_my_name(p_name text) returns void
language sql security definer set search_path = '' as $$
  update public.profiles set full_name = trim(p_name)
  where id = (select auth.uid()) and length(trim(p_name)) > 0;
$$;

-- ---------------------------------------------------------------------------
-- 6. Function permissions: nothing callable by anonymous visitors
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.my_role(), public.my_client_id(), public.is_team(), public.is_manager(),
  public.has_client_access(uuid), public.can_see_profile(public.profiles), public.try_uuid(text),
  public.advance_video(uuid, text, text, uuid, text, public.video_stage),
  public.plan_action(uuid, text, text),
  public.mark_notifications_read(bigint[]),
  public.update_my_name(text)
to authenticated;
revoke execute on function public._notify(uuid[], text, text, text),
  public._client_user_ids(uuid), public._manager_ids(uuid) from authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.agency_settings enable row level security;
alter table public.profiles        enable row level security;
alter table public.clients         enable row level security;
alter table public.client_team     enable row level security;
alter table public.content_plans   enable row level security;
alter table public.videos          enable row level security;
alter table public.video_files     enable row level security;
alter table public.comments        enable row level security;
alter table public.activity        enable row level security;
alter table public.notifications   enable row level security;

-- agency settings
create policy settings_read on public.agency_settings for select to authenticated using (true);
create policy settings_update on public.agency_settings for update to authenticated
  using (public.my_role() = 'owner') with check (public.my_role() = 'owner');

-- profiles (created/changed by the server admin API only)
create policy profiles_read on public.profiles for select to authenticated using (public.can_see_profile(profiles));

-- clients
create policy clients_read on public.clients for select to authenticated using (public.has_client_access(id));
create policy clients_insert on public.clients for insert to authenticated with check (public.my_role() = 'owner');
create policy clients_update on public.clients for update to authenticated
  using (public.my_role() = 'owner' or (public.is_manager() and public.has_client_access(id)))
  with check (public.my_role() = 'owner' or (public.is_manager() and public.has_client_access(id)));
create policy clients_delete on public.clients for delete to authenticated using (public.my_role() = 'owner');

-- client_team
create policy team_read on public.client_team for select to authenticated
  using (public.is_team() and public.has_client_access(client_id));
create policy team_insert on public.client_team for insert to authenticated
  with check (public.is_manager() and public.has_client_access(client_id));
create policy team_delete on public.client_team for delete to authenticated
  using (public.is_manager() and public.has_client_access(client_id));

-- content plans: clients see a plan once it has been sent
create policy plans_read on public.content_plans for select to authenticated
  using (public.has_client_access(client_id) and (public.is_team() or status <> 'draft'));
create policy plans_insert on public.content_plans for insert to authenticated
  with check (public.is_manager() and public.has_client_access(client_id));
create policy plans_update on public.content_plans for update to authenticated
  using (public.is_manager() and public.has_client_access(client_id))
  with check (public.is_manager() and public.has_client_access(client_id));
create policy plans_delete on public.content_plans for delete to authenticated
  using (public.is_manager() and public.has_client_access(client_id) and status = 'draft');

-- videos: clients see them once their plan is sent or once the script reaches them
create policy videos_read on public.videos for select to authenticated
  using (public.has_client_access(client_id) and (
    public.is_team()
    or stage not in ('planned', 'scripting')
    or exists (select 1 from public.content_plans p where p.id = plan_id and p.status <> 'draft')));
create policy videos_insert on public.videos for insert to authenticated
  with check (public.is_manager() and public.has_client_access(client_id));
create policy videos_update on public.videos for update to authenticated
  using (public.is_team() and public.has_client_access(client_id))
  with check (public.is_team() and public.has_client_access(client_id));
create policy videos_delete on public.videos for delete to authenticated
  using (public.is_manager() and public.has_client_access(client_id));

-- files
create policy files_read on public.video_files for select to authenticated
  using (public.has_client_access(client_id) and (public.is_team() or client_visible));
create policy files_insert on public.video_files for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and public.has_client_access(client_id)
    and storage_path like client_id::text || '/' || video_id::text || '/%'
    and exists (select 1 from public.videos v where v.id = video_id and v.client_id = video_files.client_id
                and (public.is_team() or (kind = 'raw' and v.stage = 'shooting'))));
create policy files_delete on public.video_files for delete to authenticated
  using (public.has_client_access(client_id) and (public.is_manager() or uploaded_by = (select auth.uid())));

-- comments: internal notes are team-only
create policy comments_read on public.comments for select to authenticated
  using ((public.is_team() or not internal)
     and exists (select 1 from public.videos v where v.id = video_id and public.has_client_access(v.client_id)));
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and (not internal or public.is_team())
     and exists (select 1 from public.videos v where v.id = video_id and public.has_client_access(v.client_id)));
create policy comments_update on public.comments for update to authenticated
  using (public.is_team() and exists (select 1 from public.videos v where v.id = video_id and public.has_client_access(v.client_id)))
  with check (public.is_team());
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = (select auth.uid()));

-- activity (written by workflow functions only)
create policy activity_read on public.activity for select to authenticated
  using (public.has_client_access(client_id) and (public.is_team() or not internal));

-- notifications (written by workflow functions only)
create policy notifications_read on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 8. Storage: private "media" bucket, path = {client_id}/{video_id}/{file}
--    50 MB per file on the Supabase free plan. Raise this after upgrading.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create or replace function public.can_upload_media(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.videos v
    where v.client_id = public.try_uuid(split_part(path, '/', 1))
      and v.id = public.try_uuid(split_part(path, '/', 2))
      and public.has_client_access(v.client_id)
      and (public.is_team() or v.stage = 'shooting'));
$$;

create or replace function public.can_read_media(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.video_files f
    where f.storage_path = path
      and public.has_client_access(f.client_id)
      and (public.is_team() or f.client_visible));
$$;

revoke execute on function public.can_upload_media(text), public.can_read_media(text) from public, anon;
grant execute on function public.can_upload_media(text), public.can_read_media(text) to authenticated;

drop policy if exists media_read on storage.objects;
drop policy if exists media_insert on storage.objects;
drop policy if exists media_delete on storage.objects;
create policy media_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.can_read_media(name));
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.can_upload_media(name));
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (owner_id = (select auth.uid())::text or public.is_manager())
         and public.has_client_access(public.try_uuid(split_part(name, '/', 1))));

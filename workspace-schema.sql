-- Deployed to the existing DayFlow project. PM03 workspaces are separate from DayFlow tasks.
create table public.pm03_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 content jsonb not null check (jsonb_typeof(content)='object'),
 revision bigint not null default 1 check (revision>0)
);
alter table public.pm03_workspaces enable row level security;
create policy "Owner reads workspace" on public.pm03_workspaces for select to authenticated using ((select auth.uid())=user_id);
create policy "Owner creates workspace" on public.pm03_workspaces for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Owner updates workspace" on public.pm03_workspaces for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.pm03_workspaces from anon;
grant select,insert,update on public.pm03_workspaces to authenticated;
alter publication supabase_realtime add table public.pm03_workspaces;

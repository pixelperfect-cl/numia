-- Idempotent RLS bootstrap for all user-owned tables.
-- Run once after the schema migration; safe to re-run.

do $$
declare
    t text;
    tables text[] := array[
        'entities',
        'movements',
        'loans',
        'projections',
        'categories',
        'notifications',
        'clients',
        'subscriptions',
        'projects',
        'project_lists',
        'entity_subscriptions',
        'service_definitions'
    ];
begin
    foreach t in array tables loop
        execute format('alter table public.%I enable row level security', t);

        execute format('drop policy if exists %I_select_own on public.%I', t, t);
        execute format('create policy %I_select_own on public.%I for select using (auth.uid() = user_id)', t, t);

        execute format('drop policy if exists %I_insert_own on public.%I', t, t);
        execute format('create policy %I_insert_own on public.%I for insert with check (auth.uid() = user_id)', t, t);

        execute format('drop policy if exists %I_update_own on public.%I', t, t);
        execute format('create policy %I_update_own on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);

        execute format('drop policy if exists %I_delete_own on public.%I', t, t);
        execute format('create policy %I_delete_own on public.%I for delete using (auth.uid() = user_id)', t, t);
    end loop;
end$$;

-- User preferences (subpath /users/{uid}/...). Adjust if your real table differs.
do $$
begin
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'user_preferences') then
        execute 'alter table public.user_preferences enable row level security';
        execute 'drop policy if exists user_preferences_self on public.user_preferences';
        execute 'create policy user_preferences_self on public.user_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
    end if;
end$$;

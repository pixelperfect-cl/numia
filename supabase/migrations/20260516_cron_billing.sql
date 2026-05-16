-- Daily cron that triggers the billing edge function for every user with active subscriptions.
-- Requires the pg_cron extension (enable in Database → Extensions).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Convenience: a SQL helper that fans out per-user http calls to the billing function.
-- Replace <PROJECT_REF> and use vault to store the service role key in production.
create or replace function public.run_daily_billing()
returns void
language plpgsql
security definer
as $$
declare
    project_url text := current_setting('app.settings.project_url', true);
    service_key text := current_setting('app.settings.service_role_key', true);
    rec record;
begin
    if project_url is null or service_key is null then
        raise notice 'app.settings.project_url and app.settings.service_role_key must be set via ALTER DATABASE';
        return;
    end if;

    for rec in
        select distinct user_id
        from public.subscriptions
        where status = 'active'
    loop
        perform net.http_post(
            url := project_url || '/functions/v1/run-billing-for-user',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || service_key
            ),
            body := jsonb_build_object('userId', rec.user_id)
        );
    end loop;
end$$;

-- Schedule: every day at 09:00 America/Santiago (12:00 UTC).
-- pg_cron uses UTC; adjust if your project's TZ differs.
select cron.schedule(
    'numia-daily-billing',
    '0 12 * * *',
    $$select public.run_daily_billing();$$
);

-- HOWTO set the required GUCs (run once in the dashboard SQL editor):
-- alter database postgres set app.settings.project_url = 'https://<PROJECT_REF>.supabase.co';
-- alter database postgres set app.settings.service_role_key = '<SERVICE_ROLE_KEY>';

create table if not exists public.email_log (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    subscription_id uuid references public.subscriptions(id) on delete set null,
    client_id uuid references public.clients(id) on delete set null,
    entity_id uuid references public.entities(id) on delete set null,
    template_id text,
    trigger_type text not null,
    billing_period date,
    recipients text[] not null,
    subject text not null,
    status text not null check (status in ('sent', 'failed', 'skipped')),
    provider_message_id text,
    provider_response jsonb,
    sent_at timestamptz not null default now()
);

create unique index if not exists email_log_unique_sent
    on public.email_log (subscription_id, billing_period, template_id)
    where status = 'sent';

create index if not exists email_log_user_idx on public.email_log (user_id, sent_at desc);

alter table public.email_log enable row level security;

drop policy if exists email_log_select_own on public.email_log;
create policy email_log_select_own
    on public.email_log for select
    using (auth.uid() = user_id);

-- Inserts are done by the edge function via service_role only, no insert policy needed.

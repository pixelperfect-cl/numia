-- Extends email_log to support project billings, and adds the unique index variants
-- needed to dedup per-trigger_type so a service_due reminder and a later billing_generated
-- for the same (subscription_id, billing_period) don't cancel each other.
-- Also adds the billing_installments JSONB column on projects so the cron can generate
-- cobros on specific dates during project development.

alter table public.projects
    add column if not exists amount numeric,
    add column if not exists currency text,
    add column if not exists start_date date,
    add column if not exists billing_installments jsonb;

alter table public.email_log
    add column if not exists project_id uuid references public.projects(id) on delete set null,
    add column if not exists installment_id text;

-- Replace the original index that only covered the subscription path and ignored trigger_type.
drop index if exists public.email_log_unique_sent;

create unique index if not exists email_log_unique_sent_subscription
    on public.email_log (subscription_id, billing_period, template_id, trigger_type)
    where status = 'sent' and subscription_id is not null;

create unique index if not exists email_log_unique_sent_project
    on public.email_log (project_id, installment_id, template_id, trigger_type)
    where status = 'sent' and project_id is not null;

create index if not exists email_log_project_idx on public.email_log (project_id, sent_at desc);

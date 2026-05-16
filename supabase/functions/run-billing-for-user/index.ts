import { corsHeaders } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/auth.ts';

const ELASTIC_URL = 'https://api.elasticemail.com/v4/emails';
const UF_API = 'https://mindicador.cl/api/uf';

interface RequestBody { userId: string }

interface EmailTrigger {
    id: string;
    subject?: string;
    body?: string;
    enabled?: boolean;
    daysBefore?: number;
    recipientMode?: 'all' | 'specific';
    recipientClientIds?: string[];
}

interface EntityBox { isDefault?: boolean }

interface BillingInstallment {
    id: string;
    date: string;
    amount: number;
    label?: string;
    generated?: boolean;
    movementId?: string;
    generatedAt?: string;
}

function todayUtcIso(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function addPeriod(dateStr: string, frequency: 'monthly' | 'yearly', amount = 1): string {
    const [yStr, mStr, dStr] = dateStr.split('-');
    let year = parseInt(yStr);
    let month = parseInt(mStr);
    const day = parseInt(dStr);
    if (frequency === 'monthly') {
        month += amount;
        while (month > 12) { month -= 12; year++; }
        while (month < 1) { month += 12; year--; }
    } else {
        year += amount;
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    const newDay = Math.min(day, daysInMonth);
    return `${year}-${String(month).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
}

function shiftDays(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + days);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

async function fetchUf(): Promise<number | null> {
    try {
        const r = await fetch(UF_API);
        if (!r.ok) return null;
        const j = await r.json();
        return typeof j?.serie?.[0]?.valor === 'number' ? j.serie[0].valor : null;
    } catch {
        return null;
    }
}

function render(template: string, vars: Record<string, unknown>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => {
        const v = vars[k];
        return v === undefined || v === null ? '' : String(v);
    });
}

function resolveBoxKey(boxes: Record<string, EntityBox> | undefined | null): string {
    if (!boxes) return 'general';
    const keys = Object.keys(boxes);
    if (keys.length === 0) return 'general';
    return keys.find((k) => boxes[k]?.isDefault) ?? keys[0];
}

function templateAppliesToClient(t: EmailTrigger, clientId: string): boolean {
    if (t.recipientMode !== 'specific') return true;
    return Array.isArray(t.recipientClientIds) && t.recipientClientIds.includes(clientId);
}

function enabledTemplates(pool: EmailTrigger[] | undefined, clientId: string): EmailTrigger[] {
    return (pool ?? [])
        .filter((t) => t.enabled !== false && t.subject && t.body)
        .filter((t) => templateAppliesToClient(t, clientId));
}

async function sendEmail(opts: {
    apiKey: string;
    from: string;
    subject: string;
    html: string;
    recipients: string[];
}) {
    const r = await fetch(ELASTIC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-ElasticEmail-ApiKey': opts.apiKey },
        body: JSON.stringify({
            Recipients: opts.recipients.map((e) => ({ Email: e })),
            Content: {
                Body: [{ ContentType: 'HTML', Content: opts.html, Charset: 'utf-8' }],
                From: opts.from,
                Subject: opts.subject,
            },
        }),
    });
    const text = await r.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { ok: r.ok, status: r.status, data };
}

interface ProcessEmailContext {
    db: any;
    userId: string;
    apiKey: string;
    fromEmail: string;
    template: EmailTrigger;
    recipients: string[];
    triggerType: string;
    subject: string;
    html: string;
    dedup: {
        subscription_id: string | null;
        project_id: string | null;
        installment_id: string | null;
        billing_period: string | null;
    };
    client_id: string;
    entity_id: string;
}

async function sendIfNotDuplicated(ctx: ProcessEmailContext): Promise<'sent' | 'failed' | 'skipped'> {
    let dedupQuery = ctx.db
        .from('email_log')
        .select('id')
        .eq('template_id', ctx.template.id)
        .eq('trigger_type', ctx.triggerType)
        .eq('status', 'sent');

    if (ctx.dedup.subscription_id) {
        dedupQuery = dedupQuery.eq('subscription_id', ctx.dedup.subscription_id).eq('billing_period', ctx.dedup.billing_period);
    } else if (ctx.dedup.project_id) {
        dedupQuery = dedupQuery.eq('project_id', ctx.dedup.project_id);
        if (ctx.dedup.installment_id) dedupQuery = dedupQuery.eq('installment_id', ctx.dedup.installment_id);
        else dedupQuery = dedupQuery.is('installment_id', null);
    }

    const { data: prior } = await dedupQuery.maybeSingle();
    if (prior) return 'skipped';

    const send = await sendEmail({ apiKey: ctx.apiKey, from: ctx.fromEmail, subject: ctx.subject, html: ctx.html, recipients: ctx.recipients });

    await ctx.db.from('email_log').insert({
        user_id: ctx.userId,
        subscription_id: ctx.dedup.subscription_id,
        project_id: ctx.dedup.project_id,
        installment_id: ctx.dedup.installment_id,
        client_id: ctx.client_id,
        entity_id: ctx.entity_id,
        template_id: ctx.template.id,
        trigger_type: ctx.triggerType,
        billing_period: ctx.dedup.billing_period,
        recipients: ctx.recipients,
        subject: ctx.subject,
        status: send.ok ? 'sent' : 'failed',
        provider_message_id: send.data?.MessageID ?? send.data?.TransactionID ?? null,
        provider_response: send.data,
    });

    return send.ok ? 'sent' : 'failed';
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

    const auth = req.headers.get('Authorization');
    const expected = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
    if (!auth || auth !== expected) {
        return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let body: RequestBody;
    try { body = await req.json(); } catch { return new Response('bad json', { status: 400 }); }
    if (!body.userId) return new Response('userId required', { status: 400 });

    const db = serviceClient();
    const elasticApiKey = Deno.env.get('ELASTICEMAIL_API_KEY');

    const today = todayUtcIso();
    const stats = {
        subsBilled: 0,
        subsSkippedDuplicate: 0,
        subsSkippedZombie: 0,
        serviceDueSent: 0,
        serviceDueFailed: 0,
        projectInstallmentsBilled: 0,
        projectInstallmentsSkipped: 0,
        billingEmailsSent: 0,
        billingEmailsFailed: 0,
        errors: [] as string[],
    };

    // Load shared data
    const { data: entities } = await db.from('entities').select('id, name, boxes, settings').eq('user_id', body.userId);
    if (!entities || entities.length === 0) {
        return new Response(JSON.stringify({ ok: true, reason: 'no entities', stats }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const entitiesById = new Map<string, any>(entities.map((e) => [e.id, e]));
    const fallbackEntity = entities[0];

    const { data: categories } = await db.from('categories').select('id, name, type').eq('user_id', body.userId);
    const incomeCategory = categories?.find((c) => c.type === 'income' && c.name.toLowerCase().includes('servicios'))
        ?? categories?.find((c) => c.type === 'income');
    if (!incomeCategory) {
        return new Response(JSON.stringify({ ok: true, reason: 'no income category', stats }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const clientCache = new Map<string, any>();
    const loadClient = async (clientId: string) => {
        if (clientCache.has(clientId)) return clientCache.get(clientId);
        const { data } = await db.from('clients').select('id, name, email, emails, entity_id').eq('id', clientId).maybeSingle();
        clientCache.set(clientId, data);
        return data;
    };

    let ufRate: number | null = null;
    const getUfRate = async () => {
        if (ufRate == null) ufRate = await fetchUf();
        return ufRate;
    };

    // ─── PHASE 1+2: Subscriptions billing and service_due reminders ──────────
    const { data: subs } = await db
        .from('subscriptions')
        .select('id, name, amount, currency, frequency, status, next_billing_date, client_id')
        .eq('user_id', body.userId)
        .eq('status', 'active');

    for (const sub of subs ?? []) {
        if (!sub.next_billing_date) { stats.subsSkippedZombie++; continue; }
        const billingPeriod = sub.next_billing_date;

        const client = await loadClient(sub.client_id);
        if (!client) { stats.errors.push(`client missing for sub ${sub.id}`); continue; }
        const entity = entitiesById.get(client.entity_id) || fallbackEntity;
        const settings: any = entity?.settings ?? {};
        const recipients = [client.email, ...(client.emails ?? [])].filter((x: string | null): x is string => !!x);
        const fromEmail = settings?.smtpConfig?.fromEmail;
        const billingDisabled = settings?.smtpConfig?.billingNotificationsEnabled === false;

        // ── Phase 2: service_due reminders (before generating the cobro) ──
        if (elasticApiKey && fromEmail && recipients.length > 0 && billingPeriod > today) {
            const reminderTemplates = enabledTemplates(settings?.serviceSettings?.reminders, client.id);
            for (const reminder of reminderTemplates) {
                const days = reminder.daysBefore ?? 0;
                if (days <= 0) continue;
                const reminderDate = shiftDays(billingPeriod, -days);
                if (today < reminderDate) continue; // not yet
                // ya pasó o es hoy → enviamos (con dedup)
                const vars = {
                    client_name: client.name,
                    service_name: sub.name,
                    item_name: sub.name,
                    amount: sub.amount,
                    due_date: billingPeriod,
                    entity_name: entity?.name ?? '',
                    days,
                    date: billingPeriod,
                };
                const subject = render(reminder.subject!, vars);
                const html = render(reminder.body!, vars).replace(/\n/g, '<br>');
                const result = await sendIfNotDuplicated({
                    db, userId: body.userId, apiKey: elasticApiKey, fromEmail,
                    template: reminder, recipients, triggerType: 'service_due', subject, html,
                    dedup: { subscription_id: sub.id, project_id: null, installment_id: null, billing_period: billingPeriod },
                    client_id: client.id, entity_id: entity.id,
                });
                if (result === 'sent') stats.serviceDueSent++;
                else if (result === 'failed') stats.serviceDueFailed++;
            }
        }

        // ── Phase 1: generate billing if due ──
        if (billingPeriod > today) continue;

        const { data: existing } = await db
            .from('movements')
            .select('id')
            .eq('user_id', body.userId)
            .eq('subscription_id', sub.id)
            .eq('billing_period', billingPeriod)
            .maybeSingle();
        if (existing) {
            await db.from('subscriptions').update({ next_billing_date: addPeriod(billingPeriod, sub.frequency, 1) }).eq('id', sub.id);
            stats.subsSkippedDuplicate++;
            continue;
        }

        let amount = sub.amount;
        let description = `Suscripción: ${sub.name}`;
        if (sub.currency === 'UF') {
            const rate = await getUfRate();
            if (rate == null) { stats.errors.push(`UF unavailable for ${sub.id}`); continue; }
            amount = Math.round(sub.amount * rate);
            description += ` (${sub.amount} UF @ $${rate})`;
        }

        const boxKey = resolveBoxKey(entity.boxes as Record<string, EntityBox>);
        const nextDate = addPeriod(billingPeriod, sub.frequency, 1);
        const { error: updErr } = await db.from('subscriptions').update({ next_billing_date: nextDate }).eq('id', sub.id);
        if (updErr) { stats.errors.push(`update fail ${sub.id}: ${updErr.message}`); continue; }

        const { error: movErr } = await db.from('movements').insert({
            user_id: body.userId,
            entity_id: entity.id,
            amount,
            type: 'income',
            description,
            category_id: incomeCategory.id,
            box: boxKey,
            date: today,
            status: 'pending',
            client_id: sub.client_id,
            subscription_id: sub.id,
            billing_period: billingPeriod,
        });
        if (movErr) {
            await db.from('subscriptions').update({ next_billing_date: billingPeriod }).eq('id', sub.id);
            stats.errors.push(`insert mov fail ${sub.id}: ${movErr.message}`);
            continue;
        }
        stats.subsBilled++;

        if (!elasticApiKey || !fromEmail || billingDisabled || recipients.length === 0) continue;

        const billingTemplates = enabledTemplates(settings?.notificationSettings?.billingTemplates, client.id);
        for (const template of billingTemplates) {
            const vars = {
                client_name: client.name,
                service_name: sub.name,
                project_name: '',
                item_name: sub.name,
                amount,
                due_date: billingPeriod,
                entity_name: entity?.name ?? '',
                date: billingPeriod,
            };
            const subject = render(template.subject!, vars);
            const html = render(template.body!, vars).replace(/\n/g, '<br>');
            const result = await sendIfNotDuplicated({
                db, userId: body.userId, apiKey: elasticApiKey, fromEmail,
                template, recipients, triggerType: 'billing_generated', subject, html,
                dedup: { subscription_id: sub.id, project_id: null, installment_id: null, billing_period: billingPeriod },
                client_id: client.id, entity_id: entity.id,
            });
            if (result === 'sent') stats.billingEmailsSent++;
            else if (result === 'failed') stats.billingEmailsFailed++;
        }
    }

    // ─── PHASE 3: Project billing installments ───────────────────────────────
    const { data: projects } = await db
        .from('projects')
        .select('id, name, amount, currency, client_id, entity_id, billing_installments, archived')
        .eq('user_id', body.userId);

    for (const project of projects ?? []) {
        if (project.archived) continue;
        const installments: BillingInstallment[] = Array.isArray(project.billing_installments) ? project.billing_installments : [];
        if (installments.length === 0) continue;

        const client = await loadClient(project.client_id);
        if (!client) { stats.errors.push(`client missing for project ${project.id}`); continue; }
        const entity = entitiesById.get(project.entity_id) || entitiesById.get(client.entity_id) || fallbackEntity;
        const settings: any = entity?.settings ?? {};
        const recipients = [client.email, ...(client.emails ?? [])].filter((x: string | null): x is string => !!x);
        const fromEmail = settings?.smtpConfig?.fromEmail;
        const billingDisabled = settings?.smtpConfig?.billingNotificationsEnabled === false;
        const boxKey = resolveBoxKey(entity.boxes as Record<string, EntityBox>);

        let dirty = false;
        const updatedInstallments = [...installments];

        for (let i = 0; i < updatedInstallments.length; i++) {
            const inst = updatedInstallments[i];
            if (inst.generated) continue;
            if (!inst.date || inst.date > today) continue;

            // Movement dedup: check (user, project, billing_period=inst.date)
            const { data: existingMov } = await db
                .from('movements')
                .select('id')
                .eq('user_id', body.userId)
                .eq('project_id', project.id)
                .eq('billing_period', inst.date)
                .maybeSingle();

            let amount = inst.amount;
            let description = `Proyecto: ${project.name}${inst.label ? ` - ${inst.label}` : ''}`;
            if (project.currency === 'UF') {
                const rate = await getUfRate();
                if (rate == null) { stats.errors.push(`UF unavailable for project ${project.id}`); continue; }
                amount = Math.round(inst.amount * rate);
                description += ` (${inst.amount} UF @ $${rate})`;
            }

            let movementId: string | undefined = existingMov?.id;
            if (!existingMov) {
                const { data: insertedRows, error: movErr } = await db.from('movements').insert({
                    user_id: body.userId,
                    entity_id: entity.id,
                    amount,
                    type: 'income',
                    description,
                    category_id: incomeCategory.id,
                    box: boxKey,
                    date: today,
                    status: 'pending',
                    client_id: project.client_id,
                    project_id: project.id,
                    billing_period: inst.date,
                }).select('id');
                if (movErr) {
                    stats.errors.push(`project mov fail ${project.id}/${inst.id}: ${movErr.message}`);
                    continue;
                }
                movementId = insertedRows?.[0]?.id;
                stats.projectInstallmentsBilled++;
            } else {
                stats.projectInstallmentsSkipped++;
            }

            updatedInstallments[i] = { ...inst, generated: true, movementId, generatedAt: today };
            dirty = true;

            if (!elasticApiKey || !fromEmail || billingDisabled || recipients.length === 0) continue;
            const billingTemplates = enabledTemplates(settings?.notificationSettings?.billingTemplates, client.id);
            for (const template of billingTemplates) {
                const vars = {
                    client_name: client.name,
                    service_name: project.name,
                    project_name: project.name,
                    item_name: project.name,
                    installment_label: inst.label ?? '',
                    amount,
                    due_date: inst.date,
                    entity_name: entity?.name ?? '',
                    date: inst.date,
                };
                const subject = render(template.subject!, vars);
                const html = render(template.body!, vars).replace(/\n/g, '<br>');
                const result = await sendIfNotDuplicated({
                    db, userId: body.userId, apiKey: elasticApiKey, fromEmail,
                    template, recipients, triggerType: 'billing_generated', subject, html,
                    dedup: { subscription_id: null, project_id: project.id, installment_id: inst.id, billing_period: inst.date },
                    client_id: client.id, entity_id: entity.id,
                });
                if (result === 'sent') stats.billingEmailsSent++;
                else if (result === 'failed') stats.billingEmailsFailed++;
            }
        }

        if (dirty) {
            const { error: projUpdErr } = await db.from('projects').update({ billing_installments: updatedInstallments }).eq('id', project.id);
            if (projUpdErr) stats.errors.push(`project update fail ${project.id}: ${projUpdErr.message}`);
        }
    }

    return new Response(JSON.stringify({ ok: true, stats }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

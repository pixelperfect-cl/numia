import { corsHeaders } from '../_shared/cors.ts';
import { requireUser, serviceClient } from '../_shared/auth.ts';

const ELASTIC_URL = 'https://api.elasticemail.com/v4/emails';

type TriggerType = 'service_due' | 'billing_generated' | 'scheduled' | 'project_status';

interface RequestBody {
  subscriptionId?: string;
  projectId?: string;
  installmentId?: string;
  statusId?: string; // For project_status trigger (the target list/status id)
  templateId?: string;
  triggerType?: TriggerType;
  toOverride?: string[];
}

interface EntitySmtpConfig {
  fromEmail?: string;
  billingNotificationsEnabled?: boolean;
}

interface EmailTrigger {
  id: string;
  subject?: string;
  body?: string;
  enabled?: boolean;
  recipientMode?: 'all' | 'specific';
  recipientClientIds?: string[];
}

interface EntitySettings {
  smtpConfig?: EntitySmtpConfig;
  notificationSettings?: {
    billingTemplates?: EmailTrigger[];
    scheduledTemplates?: EmailTrigger[];
  };
  serviceSettings?: {
    reminders?: EmailTrigger[];
  };
  projectSettings?: {
    statusChangeTemplates?: EmailTrigger[];
  };
}

function poolForTrigger(settings: EntitySettings, triggerType: TriggerType): EmailTrigger[] {
  if (triggerType === 'billing_generated') return settings.notificationSettings?.billingTemplates ?? [];
  if (triggerType === 'service_due') return settings.serviceSettings?.reminders ?? [];
  if (triggerType === 'scheduled') return settings.notificationSettings?.scheduledTemplates ?? [];
  if (triggerType === 'project_status') return settings.projectSettings?.statusChangeTemplates ?? [];
  return [];
}

function pickTriggers(settings: EntitySettings, triggerType: TriggerType, clientId: string, opts: { templateId?: string; statusId?: string }): EmailTrigger[] {
  const pool = poolForTrigger(settings, triggerType);

  if (opts.templateId) {
    const exact = pool.find((t) => t.id === opts.templateId);
    return exact ? [exact] : [];
  }

  return pool.filter((t) => {
    if (t.enabled === false) return false;
    if (!t.subject || !t.body) return false;
    // project_status templates are keyed by id == statusId; only match the relevant one.
    if (triggerType === 'project_status' && opts.statusId && t.id !== opts.statusId) return false;
    if (t.recipientMode === 'specific') {
      return Array.isArray(t.recipientClientIds) && t.recipientClientIds.includes(clientId);
    }
    return true;
  });
}

function render(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let user;
  try {
    user = await requireUser(req);
  } catch (resp) {
    if (resp instanceof Response) return new Response(resp.body, { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    throw resp;
  }

  const apiKey = Deno.env.get('ELASTICEMAIL_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ELASTICEMAIL_API_KEY no configurada' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (!body.subscriptionId && !body.projectId) {
    return new Response(JSON.stringify({ error: 'subscriptionId o projectId requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const triggerType: TriggerType = body.triggerType ?? (body.subscriptionId ? 'billing_generated' : 'project_status');
  const db = serviceClient();

  let itemName = '';
  let itemAmount: number | null = null;
  let itemDueDate = '';
  let clientId = '';
  let entityIdForFetch = '';

  let sub: any = null;
  let project: any = null;
  let installmentLabel = '';

  if (body.subscriptionId) {
    const { data, error } = await db
      .from('subscriptions')
      .select('id, user_id, client_id, name, amount, currency, frequency, next_billing_date')
      .eq('id', body.subscriptionId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!data) return new Response(JSON.stringify({ error: 'subscription not found or not owned by user' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    sub = data;
    itemName = sub.name;
    itemAmount = sub.amount;
    itemDueDate = sub.next_billing_date ?? '';
    clientId = sub.client_id;
  } else {
    const { data, error } = await db
      .from('projects')
      .select('id, user_id, client_id, entity_id, name, amount, currency, due_date, status, billing_installments')
      .eq('id', body.projectId!)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!data) return new Response(JSON.stringify({ error: 'project not found or not owned by user' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    project = data;
    itemName = project.name;
    entityIdForFetch = project.entity_id;
    clientId = project.client_id;

    if (body.installmentId) {
      const inst = (project.billing_installments ?? []).find((i: any) => i.id === body.installmentId);
      if (!inst) return new Response(JSON.stringify({ error: 'installment not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      itemAmount = inst.amount;
      itemDueDate = inst.date;
      installmentLabel = inst.label ?? '';
    } else {
      itemAmount = project.amount ?? null;
      itemDueDate = project.due_date ?? '';
    }
  }

  const { data: client, error: clientErr } = await db
    .from('clients')
    .select('id, entity_id, name, email, emails')
    .eq('id', clientId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (clientErr) return new Response(JSON.stringify({ error: clientErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (!client) return new Response(JSON.stringify({ error: 'client not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const entityId = entityIdForFetch || client.entity_id;
  const { data: entity, error: entErr } = await db
    .from('entities')
    .select('id, name, settings')
    .eq('id', entityId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (entErr) return new Response(JSON.stringify({ error: entErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (!entity) return new Response(JSON.stringify({ error: 'entity not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const settings: EntitySettings = entity.settings ?? {};
  const fromEmail = settings.smtpConfig?.fromEmail;
  if (!fromEmail) return new Response(JSON.stringify({ error: 'entidad sin fromEmail configurado' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  if (settings.smtpConfig?.billingNotificationsEnabled === false && triggerType === 'billing_generated') {
    return new Response(JSON.stringify({ ok: false, reason: 'billing notifications disabled' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const templates = pickTriggers(settings, triggerType, client.id, { templateId: body.templateId, statusId: body.statusId });
  if (templates.length === 0) {
    return new Response(JSON.stringify({ ok: false, reason: 'no matching template', triggerType, clientId: client.id, statusId: body.statusId }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const recipients = body.toOverride && body.toOverride.length > 0
    ? body.toOverride
    : [client.email, ...(client.emails ?? [])].filter((x): x is string => !!x);

  if (recipients.length === 0) {
    return new Response(JSON.stringify({ error: 'cliente sin destinatarios de email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Status name for project_status trigger
  let statusName = '';
  if (triggerType === 'project_status' && project) {
    const { data: list } = await db.from('project_lists').select('title').eq('id', project.status).maybeSingle();
    statusName = list?.title ?? '';
  }

  const vars: Record<string, string | number> = {
    client_name: client.name,
    service_name: itemName,
    project_name: itemName,
    item_name: itemName,
    amount: itemAmount ?? '',
    due_date: itemDueDate,
    entity_name: entity.name,
    date: itemDueDate,
    installment_label: installmentLabel,
    status_name: statusName,
  };

  const dedupKey = body.subscriptionId
    ? { subscription_id: sub.id, billing_period: itemDueDate || new Date().toISOString().slice(0, 10), project_id: null, installment_id: null }
    : { subscription_id: null, project_id: project.id, billing_period: itemDueDate || null, installment_id: body.installmentId ?? body.statusId ?? null };

  const results: Array<{ templateId: string; status: 'sent' | 'failed' | 'alreadySent'; providerMessageId?: string | null; error?: string }> = [];

  for (const template of templates) {
    let dedupQuery = db
      .from('email_log')
      .select('id')
      .eq('template_id', template.id)
      .eq('trigger_type', triggerType)
      .eq('status', 'sent');

    if (dedupKey.subscription_id) {
      dedupQuery = dedupQuery.eq('subscription_id', dedupKey.subscription_id).eq('billing_period', dedupKey.billing_period);
    } else {
      dedupQuery = dedupQuery.eq('project_id', dedupKey.project_id);
      if (dedupKey.installment_id) dedupQuery = dedupQuery.eq('installment_id', dedupKey.installment_id);
      else dedupQuery = dedupQuery.is('installment_id', null);
    }

    const { data: existing } = await dedupQuery.maybeSingle();
    if (existing) {
      results.push({ templateId: template.id, status: 'alreadySent' });
      continue;
    }

    const subject = render(template.subject!, vars);
    const html = render(template.body!, vars).replace(/\n/g, '<br>');

    const upstream = await fetch(ELASTIC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-ElasticEmail-ApiKey': apiKey },
      body: JSON.stringify({
        Recipients: recipients.map((to) => ({ Email: to })),
        Content: {
          Body: [{ ContentType: 'HTML', Content: html, Charset: 'utf-8' }],
          From: fromEmail,
          Subject: subject,
        },
      }),
    });

    const respText = await upstream.text();
    let providerData: any = null;
    try { providerData = JSON.parse(respText); } catch { providerData = { raw: respText }; }

    const status: 'sent' | 'failed' = upstream.ok ? 'sent' : 'failed';
    const providerMessageId = providerData?.MessageID ?? providerData?.TransactionID ?? null;

    const { error: logErr } = await db.from('email_log').insert({
      user_id: user.id,
      subscription_id: dedupKey.subscription_id,
      project_id: dedupKey.project_id,
      installment_id: dedupKey.installment_id,
      client_id: client.id,
      entity_id: entity.id,
      template_id: template.id,
      trigger_type: triggerType,
      billing_period: dedupKey.billing_period,
      recipients,
      subject,
      status,
      provider_message_id: providerMessageId,
      provider_response: providerData,
    });
    if (logErr) console.error('email_log insert failed', { templateId: template.id, error: logErr.message });

    results.push({ templateId: template.id, status, providerMessageId, error: upstream.ok ? undefined : `elasticemail ${upstream.status}` });
  }

  const anyFailed = results.some((r) => r.status === 'failed');
  return new Response(JSON.stringify({ ok: !anyFailed, recipients, results }), {
    status: anyFailed ? 502 : 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

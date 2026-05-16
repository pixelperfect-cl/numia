import { corsHeaders } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';

const ELASTIC_URL = 'https://api.elasticemail.com/v4/account/load';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    await requireUser(req);
  } catch (resp) {
    if (resp instanceof Response) return new Response(resp.body, { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    throw resp;
  }

  const apiKey = Deno.env.get('ELASTICEMAIL_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'ELASTICEMAIL_API_KEY no configurada en el servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const upstream = await fetch(ELASTIC_URL, {
    method: 'GET',
    headers: { 'X-ElasticEmail-ApiKey': apiKey },
  });

  const text = await upstream.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!upstream.ok) {
    return new Response(JSON.stringify({ ok: false, status: upstream.status, error: data?.Error ?? data?.error ?? 'error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, email: data?.Email ?? data?.email ?? null, reputation: data?.Reputation ?? null }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthedUser {
  id: string;
  email: string | null;
}

export async function requireUser(req: Request): Promise<AuthedUser> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response(JSON.stringify({ error: 'missing bearer token' }), { status: 401 });
  }
  const token = authHeader.slice('Bearer '.length);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const client = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: 'invalid token' }), { status: 401 });
  }
  return { id: data.user.id, email: data.user.email ?? null };
}

export function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, serviceKey);
}

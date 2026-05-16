import { corsHeaders } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS = 1024;

type ToolDef = { name: string; description: string; input_schema: Record<string, unknown> };

const tools: ToolDef[] = [
  {
    name: 'create_movement',
    description: 'Crea un nuevo movimiento (ingreso o gasto)',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['income', 'expense'] },
        amount: { type: 'number' },
        description: { type: 'string' },
        categoryId: { type: 'string' },
        entityId: { type: 'string' },
        box: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['type', 'amount', 'description', 'categoryId', 'entityId', 'box'],
    },
  },
  {
    name: 'create_transfer',
    description: 'Transfiere fondos entre cajas/entidades',
    input_schema: {
      type: 'object',
      properties: {
        fromEntityId: { type: 'string' },
        toEntityId: { type: 'string' },
        fromBox: { type: 'string' },
        toBox: { type: 'string' },
        amount: { type: 'number' },
        description: { type: 'string' },
        date: { type: 'string' },
      },
      required: ['fromEntityId', 'toEntityId', 'fromBox', 'toBox', 'amount', 'date'],
    },
  },
  {
    name: 'get_movements_summary',
    description: 'Resumen de movimientos con filtros',
    input_schema: {
      type: 'object',
      properties: {
        entityId: { type: 'string' },
        categoryId: { type: 'string' },
        type: { type: 'string', enum: ['income', 'expense'] },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
      },
    },
  },
  {
    name: 'create_category',
    description: 'Crea una nueva categoría',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['income', 'expense'] },
        color: { type: 'string' },
        icon: { type: 'string' },
      },
      required: ['name', 'type'],
    },
  },
  {
    name: 'create_loan',
    description: 'Registra un préstamo dado o recibido',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['given', 'received'] },
        amount: { type: 'number' },
        counterparty: { type: 'string' },
        entityId: { type: 'string' },
        date: { type: 'string' },
        dueDate: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['type', 'amount', 'counterparty', 'entityId'],
    },
  },
  {
    name: 'add_subcategory',
    description: 'Añade una subcategoría a una categoría existente',
    input_schema: {
      type: 'object',
      properties: {
        categoryId: { type: 'string' },
        subcategoryName: { type: 'string' },
      },
      required: ['categoryId', 'subcategoryName'],
    },
  },
];

interface ContextEntity { id: string; name: string; type: string; boxes: Record<string, unknown> }
interface ContextCategory { id: string; name: string; type: string; subcategories?: string[] }
interface ContextMovement { type: 'income' | 'expense'; amount: number }

function buildSystemPrompt(entities: ContextEntity[], categories: ContextCategory[], movements: ContextMovement[]): string {
  const entityList = entities.map((e) => `- ID: ${e.id}, Nombre: "${e.name}", Tipo: ${e.type}, Cajas: ${Object.keys(e.boxes).join(', ')}`).join('\n');
  const categoryList = categories.map((c) => `- ID: ${c.id}, Nombre: "${c.name}", Tipo: ${c.type}${c.subcategories ? `, Subcategorías: ${c.subcategories.join(', ')}` : ''}`).join('\n');

  const totalIncome = movements.filter((m) => m.type === 'income').reduce((s, m) => s + m.amount, 0);
  const totalExpense = movements.filter((m) => m.type === 'expense').reduce((s, m) => s + Math.abs(m.amount), 0);

  return `Eres el asistente financiero de [E]ntity, app de gestión financiera personal y empresarial.

PERSONALIDAD: amigable, cercano, hablas español de Chile. NUNCA menciones IDs ni términos técnicos al usuario. Usa nombres.

CONTEXTO:
Cuentas/Entidades:
${entityList || '(ninguna)'}

Categorías:
${categoryList || '(ninguna)'}

Resumen:
- Ingresos: $${totalIncome.toLocaleString('es-CL')}
- Gastos: $${totalExpense.toLocaleString('es-CL')}
- Balance: $${(totalIncome - totalExpense).toLocaleString('es-CL')}
- Movimientos: ${movements.length}

REGLAS:
1. Habla en español chileno natural.
2. Si el usuario menciona "Efectivo", "Banco", etc., busca el ID internamente, no lo expongas.
3. Confirma acciones con nombres, no IDs.
4. Si necesitas más datos, pregunta de forma conversacional.
5. Sé breve.
6. Si una categoría no existe, sugiere similares antes de crear una nueva.
7. Subcategorías: si el usuario menciona algo específico (Netflix, Spotify), búscale categoría padre y ofrece añadir subcategoría.`;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

interface RequestBody {
  message: string;
  conversationHistory: ChatMessage[];
  entities: ContextEntity[];
  categories: ContextCategory[];
  movements: ContextMovement[];
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[];
  stop_reason?: string;
  error?: { message?: string };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    await requireUser(req);
  } catch (resp) {
    if (resp instanceof Response) return new Response(resp.body, { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    throw resp;
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada en el servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const system = buildSystemPrompt(body.entities ?? [], body.categories ?? [], body.movements ?? []);
  const messages = [
    ...(body.conversationHistory ?? []).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: body.message },
  ];

  const upstream = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: MAX_TOKENS,
      system,
      tools,
      messages,
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    return new Response(JSON.stringify({ error: `Anthropic ${upstream.status}: ${errText}` }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const data: AnthropicResponse = await upstream.json();
  if (data.error) {
    return new Response(JSON.stringify({ error: data.error.message ?? 'anthropic error' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const textBlock = data.content?.find((b) => b.type === 'text');
  const toolBlock = data.content?.find((b) => b.type === 'tool_use');

  const result: Record<string, unknown> = { message: textBlock?.text ?? '' };
  if (toolBlock) {
    result.functionCall = { name: toolBlock.name, arguments: toolBlock.input };
    if (!result.message) result.message = 'Procesando acción...';
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

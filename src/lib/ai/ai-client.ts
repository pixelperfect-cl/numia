/**
 * Numia v1.0 - AI Client Service
 * Handles communication with OpenAI API
 */

import OpenAI from 'openai';
import type { AIMessage, Entity, Category, Movement } from '@/types';

// Note: En producción, esto debe moverse a Firebase Functions
// Por ahora usamos el cliente desde el frontend para desarrollo rápido
const getOpenAIClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY no está configurada en las variables de entorno');
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // Solo para desarrollo
  });
};

export interface SendMessageOptions {
  message: string;
  conversationHistory: AIMessage[];
  entities: Entity[];
  categories: Category[];
  movements: Movement[];
}

export interface AIResponse {
  message: string;
  functionCall?: {
    name: string;
    arguments: any;
  };
  error?: string;
}

/**
 * Genera el contexto del sistema para el asistente
 */
const generateSystemPrompt = (
  entities: Entity[],
  categories: Category[],
  movements: Movement[]
): string => {
  const entityList = entities.map(e => `- ID: ${e.id}, Nombre: "${e.name}", Tipo: ${e.type}, Cajas: ${Object.keys(e.boxes).join(', ')}`).join('\n');
  const categoryList = categories.map(c => `- ID: ${c.id}, Nombre: "${c.name}", Tipo: ${c.type}${c.subcategories ? `, Subcategorías: ${c.subcategories.join(', ')}` : ''}`).join('\n');

  const totalIncome = movements
    .filter(m => m.type === 'income')
    .reduce((sum, m) => sum + m.amount, 0);
  const totalExpense = movements
    .filter(m => m.type === 'expense')
    .reduce((sum, m) => sum + Math.abs(m.amount), 0);
  const balance = totalIncome - totalExpense;

  return `Eres el asistente financiero de Numia, una app de gestión financiera personal y de negocios.

**TU PERSONALIDAD:**
- Amigable, cercano y fácil de entender
- Hablas como un asesor financiero que explica las cosas de forma simple
- Usas lenguaje natural, SIN términos técnicos como "ID", "categoryId", "entityId"
- Cuando confirmes acciones, usa los NOMBRES de las cosas, no los IDs

**CONTEXTO DEL USUARIO:**

Cuentas/Entidades disponibles:
${entityList || 'No hay cuentas creadas aún'}

Categorías disponibles:
${categoryList}

Resumen actual:
- Ingresos totales: $${totalIncome.toLocaleString('es-CL')}
- Gastos totales: $${totalExpense.toLocaleString('es-CL')}
- Balance: $${balance.toLocaleString('es-CL')}
- Movimientos registrados: ${movements.length}

**REGLAS IMPORTANTES:**
1. Habla en español de Chile, de forma natural y amigable
2. Cuando el usuario mencione "Efectivo", "Banco", "Okey Okey SPA", etc., busca los IDs internamente pero NUNCA los menciones
3. Cuando confirmes una acción, di por ejemplo: "Voy a crear un ingreso de $5.000 en Efectivo" NO digas "ID: abc123"
4. Si necesitas más información, pregunta de forma conversacional
5. Sé breve y directo, evita explicaciones técnicas
6. Cuando crees algo exitoso, usa un tono positivo: "¡Listo! He registrado tu ingreso de $5.000 en Efectivo"

**LO QUE PUEDES HACER:**
- Registrar ingresos y gastos
- Crear y sugerir categorías
- **Añadir subcategorías** a categorías existentes (ej: añadir "Netflix" a "Tecnología")
- Registrar préstamos (dados o recibidos)
- Hacer transferencias entre tus cuentas
- Mostrar resúmenes de tus finanzas
- Analizar tus patrones de gasto

**IMPORTANTE sobre CATEGORÍAS Y SUBCATEGORÍAS:**
- Si el usuario menciona una categoría que no existe, NO la crees automáticamente
- Primero sugiere categorías similares que ya existan
- Si ninguna es adecuada, pregunta si quiere crear una nueva
- Ejemplo: Usuario dice "gasto en restaurant" → Sugieres "Comidas y Bebidas" si existe

**SOBRE SUBCATEGORÍAS:**
- Si el usuario menciona un gasto específico que podría ser una subcategoría (ej: "Netflix", "IA SAAS", "Spotify"):
  1. Busca una categoría padre apropiada (ej: "Tecnología" para "IA SAAS")
  2. Si la categoría padre existe, ofrece añadir la subcategoría automáticamente
  3. Si la subcategoría NO existe aún, puedes crearla directamente con la función add_subcategory
  4. Luego registra el gasto usando la subcategoría en el campo "description"
- Las subcategorías permiten detallar gastos sin crear muchas categorías
- Ejemplo: Usuario dice "gasté $5000 en IA SAAS" → Añades "IA SAAS" como subcategoría de "Tecnología" y creas el movimiento

Siempre usa un lenguaje simple y humano. Eres un asistente útil, no un robot técnico.`;
};

/**
 * Define las funciones disponibles para el AI
 */
const getAvailableFunctions = () => {
  return [
    {
      name: 'create_movement',
      description: 'Crea un nuevo movimiento (ingreso o gasto) en la aplicación',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['income', 'expense'],
            description: 'Tipo de movimiento: income para ingresos, expense para gastos',
          },
          amount: {
            type: 'number',
            description: 'Monto del movimiento (siempre positivo)',
          },
          description: {
            type: 'string',
            description: 'Descripción del movimiento',
          },
          categoryId: {
            type: 'string',
            description: 'ID de la categoría',
          },
          entityId: {
            type: 'string',
            description: 'ID de la entidad asociada',
          },
          box: {
            type: 'string',
            description: 'Nombre de la caja (Efectivo, Banco, etc.)',
          },
          date: {
            type: 'string',
            description: 'Fecha del movimiento en formato YYYY-MM-DD. Si no se especifica, usar la fecha actual (hoy es 2025-10-16)',
          },
        },
        required: ['type', 'amount', 'description', 'categoryId', 'entityId', 'box'],
      },
    },
    {
      name: 'create_transfer',
      description: 'Transfiere fondos de una entidad/caja a otra',
      parameters: {
        type: 'object',
        properties: {
          fromEntityId: {
            type: 'string',
            description: 'ID de la entidad origen',
          },
          toEntityId: {
            type: 'string',
            description: 'ID de la entidad destino',
          },
          fromBox: {
            type: 'string',
            description: 'Caja origen',
          },
          toBox: {
            type: 'string',
            description: 'Caja destino',
          },
          amount: {
            type: 'number',
            description: 'Monto a transferir',
          },
          description: {
            type: 'string',
            description: 'Descripción de la transferencia',
          },
          date: {
            type: 'string',
            description: 'Fecha en formato YYYY-MM-DD',
          },
        },
        required: ['fromEntityId', 'toEntityId', 'fromBox', 'toBox', 'amount', 'date'],
      },
    },
    {
      name: 'get_movements_summary',
      description: 'Obtiene un resumen de los movimientos con filtros opcionales',
      parameters: {
        type: 'object',
        properties: {
          entityId: {
            type: 'string',
            description: 'Filtrar por entidad específica',
          },
          categoryId: {
            type: 'string',
            description: 'Filtrar por categoría específica',
          },
          type: {
            type: 'string',
            enum: ['income', 'expense'],
            description: 'Filtrar por tipo de movimiento',
          },
          startDate: {
            type: 'string',
            description: 'Fecha inicio en formato YYYY-MM-DD',
          },
          endDate: {
            type: 'string',
            description: 'Fecha fin en formato YYYY-MM-DD',
          },
        },
      },
    },
    {
      name: 'create_category',
      description: 'Crea una nueva categoría de ingresos o gastos',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nombre de la categoría (ej: Supermercado, Restaurant, Transporte)',
          },
          type: {
            type: 'string',
            enum: ['income', 'expense'],
            description: 'Tipo: income para ingresos, expense para gastos',
          },
          color: {
            type: 'string',
            description: 'Color en formato hex (ej: #3b82f6). Si no se especifica, usar un color aleatorio apropiado',
          },
          icon: {
            type: 'string',
            description: 'Nombre del ícono (ej: ShoppingCart, Coffee, Car). Si no se especifica, usar un ícono genérico',
          },
        },
        required: ['name', 'type'],
      },
    },
    {
      name: 'create_loan',
      description: 'Registra un préstamo dado o recibido',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['given', 'received'],
            description: 'given si prestaste dinero a alguien, received si te prestaron',
          },
          amount: {
            type: 'number',
            description: 'Monto del préstamo',
          },
          counterparty: {
            type: 'string',
            description: 'Persona o entidad a quien se prestó o de quien se recibió',
          },
          entityId: {
            type: 'string',
            description: 'ID de la entidad asociada al préstamo',
          },
          date: {
            type: 'string',
            description: 'Fecha del préstamo en formato YYYY-MM-DD',
          },
          dueDate: {
            type: 'string',
            description: 'Fecha de vencimiento en formato YYYY-MM-DD (opcional)',
          },
          notes: {
            type: 'string',
            description: 'Notas adicionales sobre el préstamo (opcional)',
          },
        },
        required: ['type', 'amount', 'counterparty', 'entityId'],
      },
    },
    {
      name: 'add_subcategory',
      description: 'Añade una subcategoría a una categoría existente. Útil cuando el usuario quiere registrar gastos más específicos dentro de una categoría principal.',
      parameters: {
        type: 'object',
        properties: {
          categoryId: {
            type: 'string',
            description: 'ID de la categoría padre a la que se añadirá la subcategoría',
          },
          subcategoryName: {
            type: 'string',
            description: 'Nombre de la nueva subcategoría (ej: "Netflix", "Spotify", "IA SAAS")',
          },
        },
        required: ['categoryId', 'subcategoryName'],
      },
    },
  ];
};

/**
 * Envía un mensaje al asistente y obtiene respuesta
 */
export const sendMessageToAI = async (options: SendMessageOptions): Promise<AIResponse> => {
  try {
    const client = getOpenAIClient();
    const systemPrompt = generateSystemPrompt(options.entities, options.categories, options.movements);

    // Convertir historial de mensajes al formato de OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...options.conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      { role: 'user', content: options.message },
    ];

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      functions: getAvailableFunctions() as any,
      function_call: 'auto',
      temperature: 0.7,
      max_tokens: 1000,
    });

    const choice = response.choices[0];

    if (choice.finish_reason === 'function_call' && choice.message.function_call) {
      return {
        message: choice.message.content || 'Procesando acción...',
        functionCall: {
          name: choice.message.function_call.name,
          arguments: JSON.parse(choice.message.function_call.arguments),
        },
      };
    }

    return {
      message: choice.message.content || 'No pude generar una respuesta.',
    };
  } catch (error: any) {
    console.error('Error al comunicarse con OpenAI:', error);
    return {
      message: '',
      error: error.message || 'Error al comunicarse con el asistente',
    };
  }
};

/**
 * Procesa un documento (imagen o PDF) usando GPT-4 Vision
 */
export const processDocument = async (
  imageUrl: string,
  documentType: 'receipt' | 'bank_statement' | 'invoice'
): Promise<any> => {
  try {
    const client = getOpenAIClient();

    const prompt = documentType === 'receipt'
      ? 'Analiza esta boleta o recibo. Extrae: fecha, comercio/tienda, monto total, items comprados, y sugiere una categoría de gasto apropiada. Responde en formato JSON.'
      : documentType === 'bank_statement'
      ? 'Analiza esta cartola bancaria. Extrae todos los movimientos que encuentres con: fecha, descripción, monto, tipo (cargo o abono). Responde en formato JSON con un array de movimientos.'
      : 'Analiza esta factura. Extrae: número de factura, fecha, proveedor, monto total, items. Responde en formato JSON.';

    const response = await client.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No se pudo procesar el documento');
    }

    // Intentar parsear como JSON
    try {
      return JSON.parse(content);
    } catch {
      return { rawText: content };
    }
  } catch (error: any) {
    console.error('Error al procesar documento:', error);
    throw new Error(error.message || 'Error al procesar documento');
  }
};

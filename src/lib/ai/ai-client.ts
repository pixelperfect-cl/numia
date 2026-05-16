import { supabase } from '@/lib/supabase';
import type { AIMessage, Entity, Category, Movement } from '@/types';

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

const slimEntity = (e: Entity) => ({ id: e.id, name: e.name, type: e.type, boxes: e.boxes });
const slimCategory = (c: Category) => ({ id: c.id, name: c.name, type: c.type, subcategories: c.subcategories });
const slimMovement = (m: Movement) => ({ type: m.type, amount: m.amount });
const slimMessage = (m: AIMessage) => ({
  role: m.role === 'system' ? 'user' : m.role,
  content: m.content,
});

async function invokeEdge<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(error.message || `Edge function ${name} failed`);
  return data as T;
}

export const sendMessageToAI = async (options: SendMessageOptions): Promise<AIResponse> => {
  try {
    return await invokeEdge<AIResponse>('ai-chat', {
      message: options.message,
      conversationHistory: options.conversationHistory.map(slimMessage),
      entities: options.entities.map(slimEntity),
      categories: options.categories.map(slimCategory),
      movements: options.movements.map(slimMovement),
    });
  } catch (error: any) {
    console.error('Error al comunicarse con el asistente:', error);
    return { message: '', error: error.message ?? 'Error al comunicarse con el asistente' };
  }
};

export const processDocument = async (
  imageUrl: string,
  documentType: 'receipt' | 'bank_statement' | 'invoice'
): Promise<any> => {
  return await invokeEdge('process-document', { imageUrl, documentType });
};

/**
 * Numia v1.0 - AI Assistant Context
 */

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { AIMessage, AIConversation } from '@/types';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { sendMessageToAI } from '@/lib/ai/ai-client';
import { getTodayLocalDateString } from '@/lib/utils';

interface AIContextType {
  isOpen: boolean;
  isProcessing: boolean;
  currentConversation: AIConversation | null;
  messages: AIMessage[];
  error: string | null;
  openAssistant: () => void;
  closeAssistant: () => void;
  sendMessage: (message: string) => Promise<void>;
  clearConversation: () => void;
  executeFunction: (functionName: string, args: any) => Promise<any>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { entities, categories, movements, createMovement, createTransfer, createCategory, createLoan, updateCategory } = useData();
  const { createNotification } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);

  const openAssistant = useCallback(() => {
    setIsOpen(true);

    // Crear nueva conversación si no existe
    if (!currentConversation && user) {
      const newConversation: AIConversation = {
        id: `conv_${Date.now()}`,
        userId: user.uid,
        title: 'Nueva conversación',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setCurrentConversation(newConversation);

      // Mensaje de bienvenida
      const welcomeMessage: AIMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: '¡Hola! Soy tu asistente financiero de Numia. Puedo ayudarte a:\n\n• Crear movimientos (ingresos y gastos)\n• Hacer transferencias entre tus cuentas\n• Analizar tus finanzas\n• Responder preguntas sobre tu estado financiero\n\n¿En qué puedo ayudarte hoy?',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [currentConversation, user]);

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setCurrentConversation(null);
    setError(null);
  }, []);

  const executeFunction = useCallback(async (functionName: string, args: any): Promise<any> => {
    try {
      setError(null);

      switch (functionName) {
        case 'create_movement': {
          const { type, amount, description, categoryId, entityId, box, date } = args;

          console.log('🤖 AI intentando crear movimiento:', { type, amount, description, categoryId, entityId, box, date });

          // Validar que la categoría existe
          const category = categories.find(c => c.id === categoryId);
          if (!category) {
            console.error('❌ Categoría no encontrada. ID buscado:', categoryId);
            console.log('📋 Categorías disponibles:', categories.map(c => ({ id: c.id, name: c.name })));
            throw new Error(`Categoría con ID "${categoryId}" no encontrada`);
          }

          // Validar que la entidad existe
          const entity = entities.find(e => e.id === entityId);
          if (!entity) {
            console.error('❌ Entidad no encontrada. ID buscado:', entityId);
            console.log('📋 Entidades disponibles:', entities.map(e => ({ id: e.id, name: e.name })));
            throw new Error(`Entidad con ID "${entityId}" no encontrada`);
          }

          // Validar que la caja existe en la entidad
          if (!entity.boxes[box]) {
            console.error('❌ Caja no encontrada. Caja buscada:', box);
            console.log('📋 Cajas disponibles en', entity.name, ':', Object.keys(entity.boxes));
            throw new Error(`La caja "${box}" no existe en la entidad "${entity.name}"`);
          }

          console.log('✅ Validaciones pasadas. Creando movimiento...');

          const movementId = await createMovement({
            type,
            amount: Math.abs(amount),
            description,
            categoryId,
            box,
            entityId,
            date: date || getTodayLocalDateString(),
          });

          console.log('✅ Movimiento creado con ID:', movementId);

          return {
            success: true,
            message: `Movimiento creado exitosamente: ${type === 'income' ? 'Ingreso' : 'Gasto'} de $${amount.toLocaleString('es-CL')}`,
            movementId,
          };
        }

        case 'create_transfer': {
          const { fromEntityId, toEntityId, fromBox, toBox, amount, description, date } = args;

          await createTransfer({
            fromEntityId,
            toEntityId,
            fromBox,
            toBox,
            amount: Math.abs(amount),
            description,
            date: date || getTodayLocalDateString(),
          });

          const fromEntity = entities.find(e => e.id === fromEntityId);
          const toEntity = entities.find(e => e.id === toEntityId);

          return {
            success: true,
            message: `Transferencia completada: $${amount.toLocaleString('es-CL')} de ${fromEntity?.name} (${fromBox}) a ${toEntity?.name} (${toBox})`,
          };
        }

        case 'get_movements_summary': {
          const { entityId, categoryId, type, startDate, endDate } = args;

          let filtered = movements;

          if (entityId) {
            filtered = filtered.filter(m => m.entityId === entityId);
          }
          if (categoryId) {
            filtered = filtered.filter(m => m.categoryId === categoryId);
          }
          if (type) {
            filtered = filtered.filter(m => m.type === type);
          }
          if (startDate) {
            filtered = filtered.filter(m => m.date >= startDate);
          }
          if (endDate) {
            filtered = filtered.filter(m => m.date <= endDate);
          }

          const totalIncome = filtered
            .filter(m => m.type === 'income')
            .reduce((sum, m) => sum + m.amount, 0);

          const totalExpense = filtered
            .filter(m => m.type === 'expense')
            .reduce((sum, m) => sum + Math.abs(m.amount), 0);

          return {
            success: true,
            summary: {
              count: filtered.length,
              totalIncome,
              totalExpense,
              balance: totalIncome - totalExpense,
              movements: filtered.slice(0, 10), // Últimos 10
            },
          };
        }

        case 'create_category': {
          const { name, type, color, icon } = args;

          console.log('🤖 AI intentando crear categoría:', { name, type, color, icon });

          // Verificar si la categoría ya existe
          const existingCategory = categories.find(c =>
            c.name.toLowerCase() === name.toLowerCase() && c.type === type
          );

          if (existingCategory) {
            console.log('❌ La categoría ya existe:', existingCategory.name);
            return {
              success: false,
              error: `La categoría "${name}" ya existe`,
            };
          }

          console.log('✅ Creando nueva categoría...');

          const categoryId = await createCategory({
            name,
            type,
            color: color || '#3b82f6', // Default blue
            icon: icon || 'Folder',    // Default icon
          });

          console.log('✅ Categoría creada con ID:', categoryId);

          return {
            success: true,
            message: `Categoría "${name}" creada exitosamente`,
            categoryId,
          };
        }

        case 'create_loan': {
          const { type, amount, counterparty, entityId, date } = args;

          console.log('🤖 AI intentando crear préstamo:', { type, amount, counterparty, entityId, date });

          // Validar que la entidad existe
          const entity = entities.find(e => e.id === entityId);
          if (!entity) {
            console.error('❌ Entidad no encontrada. ID buscado:', entityId);
            console.log('📋 Entidades disponibles:', entities.map(e => ({ id: e.id, name: e.name })));
            throw new Error(`Entidad con ID "${entityId}" no encontrada`);
          }

          console.log('✅ Validaciones pasadas. Creando préstamo...');

          // Convertir el tipo de 'given' a 'lent' y 'received' a 'owe' para coincidir con LoanType
          const loanType: 'owe' | 'lent' = type === 'given' ? 'lent' : 'owe';

          const loanId = await createLoan({
            type: loanType,
            amount: Math.abs(amount),
            amountPaid: 0,
            personName: counterparty,
            entityId,
            date: date || getTodayLocalDateString(),
            isPaid: false,
            payments: [],
          });

          console.log('✅ Préstamo creado con ID:', loanId);

          return {
            success: true,
            message: `Préstamo ${type === 'given' ? 'dado a' : 'recibido de'} ${counterparty} por $${amount.toLocaleString('es-CL')} registrado exitosamente`,
            loanId,
          };
        }

        case 'add_subcategory': {
          const { categoryId, subcategoryName } = args;

          console.log('🤖 AI intentando añadir subcategoría:', { categoryId, subcategoryName });

          // Validar que la categoría existe
          const category = categories.find(c => c.id === categoryId);
          if (!category) {
            console.error('❌ Categoría no encontrada. ID buscado:', categoryId);
            console.log('📋 Categorías disponibles:', categories.map(c => ({ id: c.id, name: c.name })));
            throw new Error(`Categoría con ID "${categoryId}" no encontrada`);
          }

          // Verificar si la subcategoría ya existe
          const existingSubcategories = category.subcategories || [];
          if (existingSubcategories.includes(subcategoryName)) {
            console.log('❌ La subcategoría ya existe');
            return {
              success: false,
              error: `La subcategoría "${subcategoryName}" ya existe en "${category.name}"`,
            };
          }

          console.log('✅ Añadiendo subcategoría...');

          // Añadir la nueva subcategoría al array existente
          const updatedSubcategories = [...existingSubcategories, subcategoryName];
          await updateCategory(categoryId, { subcategories: updatedSubcategories });

          console.log('✅ Subcategoría añadida exitosamente');

          return {
            success: true,
            message: `Subcategoría "${subcategoryName}" añadida a "${category.name}" exitosamente`,
          };
        }

        default:
          throw new Error(`Función "${functionName}" no implementada`);
      }
    } catch (error: any) {
      console.error(`Error ejecutando función ${functionName}:`, error);
      return {
        success: false,
        error: error.message || 'Error al ejecutar la acción',
      };
    }
  }, [entities, categories, movements, createMovement, createTransfer, createCategory, createLoan, updateCategory]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    // Agregar mensaje del usuario
    const userMessage: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Enviar a la AI
      const response = await sendMessageToAI({
        message: messageText,
        conversationHistory: messages,
        entities,
        categories,
        movements,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Si hay una llamada a función, ejecutarla
      if (response.functionCall) {
        const functionResult = await executeFunction(
          response.functionCall.name,
          response.functionCall.arguments
        );

        // Crear notificación para acciones exitosas del asistente
        if (functionResult.success) {
          await createNotification({
            title: 'Asistente IA',
            message: functionResult.message || 'Acción completada exitosamente',
            read: false,
            date: new Date().toISOString(),
            type: 'success',
          });
        }

        // Crear mensaje con el resultado de la función
        const resultMessage: AIMessage = {
          id: `msg_${Date.now()}_result`,
          role: 'assistant',
          content: functionResult.success
            ? `✅ ${functionResult.message || 'Acción completada exitosamente'}`
            : `❌ ${functionResult.error || 'Error al ejecutar la acción'}`,
          timestamp: new Date(),
          functionCall: {
            name: response.functionCall.name,
            arguments: response.functionCall.arguments,
            result: functionResult,
            status: functionResult.success ? 'completed' : 'error',
          },
        };

        setMessages(prev => [...prev, resultMessage]);
      } else {
        // Respuesta normal de texto
        const assistantMessage: AIMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error('Error al enviar mensaje:', error);
      setError(error.message || 'Error al comunicarse con el asistente');

      const errorMessage: AIMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: '❌ Lo siento, ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        timestamp: new Date(),
        error: error.message,
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, messages, entities, categories, movements, executeFunction]);

  return (
    <AIContext.Provider
      value={{
        isOpen,
        isProcessing,
        currentConversation,
        messages,
        error,
        openAssistant,
        closeAssistant,
        sendMessage,
        clearConversation,
        executeFunction,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

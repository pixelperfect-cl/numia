/**
 * Numia v1.0 - AI Assistant Side Tab Button
 */

import { useAI } from '@/contexts/AIContext';
import { Bot, Sparkles } from 'lucide-react';

export function AIAssistantButton() {
  const { isOpen, openAssistant } = useAI();

  if (isOpen) return null;

  return (
    <button
      onClick={openAssistant}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-2xl transition-all hover:pr-2 group"
      style={{
        writingMode: 'vertical-rl',
        padding: '20px 12px',
        borderTopLeftRadius: '12px',
        borderBottomLeftRadius: '12px',
      }}
      title="Abrir Asistente de IA"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse group-hover:scale-110 transition-transform" />
        <span className="font-semibold text-sm tracking-wide">Asistente</span>
        <Bot className="h-5 w-5 group-hover:scale-110 transition-transform" />
      </div>
    </button>
  );
}

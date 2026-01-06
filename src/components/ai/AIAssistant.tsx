/**
 * Numia v1.0 - AI Assistant Component
 * Floating panel similar to ChatGPT
 */

import { useState, useRef, useEffect } from 'react';
import { useAI } from '@/contexts/AIContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, X, Send, Loader2, Trash2, Sparkles, Mic, MicOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function AIAssistant() {
  const { isOpen, isProcessing, messages, error, closeAssistant, sendMessage, clearConversation } = useAI();
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'es-ES';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) {
      alert('Tu navegador no soporta reconocimiento de voz. Intenta usar Chrome o Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    const message = inputValue;
    setInputValue('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="fixed bottom-0 right-0 md:bottom-4 md:right-4 z-50 w-full h-[100dvh] md:w-[500px] md:h-[650px] lg:w-[400px] lg:h-[600px]">
      <Card className="flex flex-col h-full shadow-2xl md:border-2 border-0 md:rounded-lg rounded-none overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bot className="h-6 w-6 text-white" />
              {isProcessing && (
                <Loader2 className="absolute -top-1 -right-1 h-3 w-3 text-white animate-spin" />
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold">Asistente Numia</h3>
              <p className="text-white/80 text-xs">
                {isProcessing ? 'Procesando...' : 'En línea'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={clearConversation}
              title="Nueva conversación"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={closeAssistant}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.error
                      ? 'bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-100 border border-red-300 dark:border-red-800'
                      : 'bg-muted'
                  }`}
                >
                  {message.role === 'assistant' && !message.error && (
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                        Asistente
                      </span>
                    </div>
                  )}

                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>

                  {message.functionCall && (
                    <div className="mt-2 pt-2 border-t border-current/20">
                      <div className="flex items-center gap-1 text-xs opacity-75">
                        <Sparkles className="h-3 w-3" />
                        <span>Acción: {message.functionCall.name}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-1 text-xs opacity-60">
                    {formatDistanceToNow(message.timestamp, { addSuffix: true, locale: es })}
                  </div>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 max-w-[85%]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600 dark:text-purple-400" />
                    <span className="text-sm">Pensando...</span>
                  </div>
                </div>
              </div>
            )}
            {/* Elemento invisible para hacer scroll automático */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-950/50 border-t border-red-200 dark:border-red-800">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Escuchando...' : 'Escribe o habla...'}
              disabled={isProcessing || isListening}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={toggleVoiceRecognition}
              disabled={isProcessing}
              size="icon"
              variant={isListening ? "default" : "outline"}
              className={isListening ? "bg-red-600 hover:bg-red-700 animate-pulse" : ""}
              title={isListening ? "Detener grabación" : "Hablar por micrófono"}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="submit"
              disabled={!inputValue.trim() || isProcessing || isListening}
              size="icon"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {isListening
              ? '🎤 Hablando... (el reconocimiento se detendrá automáticamente)'
              : 'Escribe, habla o presiona Enter para enviar. El asistente puede cometer errores.'
            }
          </p>
        </form>
      </Card>
    </div>
  );
}

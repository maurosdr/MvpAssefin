'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { BacktestStrategy } from '@/app/api/trading/backtest/route';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type AIModel = 'claude' | 'gemini';

interface TradingChatProps {
  onBacktestFound: (strategy: BacktestStrategy) => void;
  isRunningBacktest: boolean;
  keysConfigured?: boolean;
  onOpenSettings?: () => void;
}

function extractBacktestStrategy(text: string): BacktestStrategy | null {
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
  let match;
  while ((match = jsonBlockRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.type === 'backtest_strategy') {
        return parsed as BacktestStrategy;
      }
    } catch {
      // Not valid JSON, continue
    }
  }
  return null;
}

function renderMessageContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const firstNewline = part.indexOf('\n');
      const lang = firstNewline > 3 ? part.slice(3, firstNewline).trim() : '';
      const code = firstNewline > 0 ? part.slice(firstNewline + 1, -3) : part.slice(3, -3);
      return (
        <div key={idx} className="my-3">
          {lang && (
            <div className="flex items-center gap-2 px-3 py-1 bg-[var(--bg)] border border-[var(--border)] rounded-t-lg text-xs text-[var(--text-muted)] font-mono">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              {lang}
            </div>
          )}
          <pre className={`overflow-x-auto p-4 text-xs font-mono bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap ${lang ? 'rounded-b-lg border-t-0' : 'rounded-lg'}`}>
            <code>{code}</code>
          </pre>
        </div>
      );
    }
    // Render inline formatting for bold (**text**) and newlines
    return (
      <span key={idx}>
        {part.split('\n').map((line, lineIdx, arr) => {
          const boldParts = line.split(/(\*\*[^*]+\*\*)/g).map((segment, sIdx) => {
            if (segment.startsWith('**') && segment.endsWith('**')) {
              return <strong key={sIdx} className="font-semibold text-[var(--text-primary)]">{segment.slice(2, -2)}</strong>;
            }
            return <span key={sIdx}>{segment}</span>;
          });
          return (
            <span key={lineIdx}>
              {boldParts}
              {lineIdx < arr.length - 1 && <br />}
            </span>
          );
        })}
      </span>
    );
  });
}

export default function TradingChat({ onBacktestFound, isRunningBacktest, keysConfigured, onOpenSettings }: TradingChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>('claude');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch('/api/trading/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, model: selectedModel }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Erro na requisição');
      }

      const data = await res.json();
      const assistantContent: string = data.content ?? '';

      setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }]);

      // Detect backtest strategy in response
      const strategy = extractBacktestStrategy(assistantContent);
      if (strategy) {
        onBacktestFound(strategy);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Erro ao conectar com a IA: ${errorMessage}\n\nVerifique se as chaves de API (ANTHROPIC_API_KEY ou GEMINI_API_KEY) estão configuradas no arquivo .env.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, selectedModel, onBacktestFound]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  return (
    <div className="modern-card flex flex-col h-[720px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-lg">
            🤖
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Trading AI</h2>
            <p className="text-xs text-[var(--text-muted)]">Estratégias com Backtest Automático</p>
          </div>
        </div>

        {/* Model selector */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
          <button
            onClick={() => setSelectedModel('claude')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedModel === 'claude'
                ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
            Claude
          </button>
          <button
            onClick={() => setSelectedModel('gemini')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedModel === 'gemini'
                ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Gemini
          </button>
        </div>
      </div>

      {/* No keys warning */}
      {keysConfigured === false && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--warning-soft,#fffbe6)] border-b border-[var(--warning,#f59e0b)]/30 text-xs text-[var(--warning,#b45309)] flex-shrink-0">
          <span>⚠️</span>
          <span className="flex-1">Chaves de API não configuradas. O chat não vai funcionar sem elas.</span>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="font-bold underline hover:no-underline whitespace-nowrap"
            >
              Configurar agora →
            </button>
          )}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 py-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-soft)] flex items-center justify-center text-3xl">
              📈
            </div>
            <div>
              <p className="text-[var(--text-primary)] font-semibold text-base mb-2">
                Descreva suas regras de Trading para
              </p>
              <p className="text-[var(--accent)] font-bold text-lg">
                Cripto ou Prediction Markets
              </p>
              <p className="text-[var(--text-muted)] text-sm mt-3 max-w-sm">
                A IA vai guiá-lo pelo processo de backtest antes de qualquer implementação ao vivo.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-md">
              {[
                'Quero criar uma estratégia de cruzamento de médias para BTC',
                'Estratégia baseada em RSI para ETH no Polymarket',
                'Momentum trading em altcoins com stop loss',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-left text-xs px-4 py-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--accent)]/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                🤖
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)] rounded-tr-sm'
                  : 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-tl-sm'
              }`}
            >
              {renderMessageContent(msg.content)}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-sm ml-2 flex-shrink-0 mt-1">
                👤
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-sm mr-2 flex-shrink-0">
              🤖
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {isRunningBacktest && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-soft)] rounded-full border border-[var(--accent)]/30 text-xs text-[var(--accent)] font-semibold">
              <div className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              Executando backtest com dados históricos...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-[var(--border)] flex-shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Descreva suas regras de Trading para Cripto ou Prediction Markets..."
              rows={1}
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
              style={{ minHeight: '48px', maxHeight: '160px' }}
              disabled={loading}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center shadow-sm"
            aria-label="Enviar mensagem"
          >
            <svg className="w-4 h-4 text-[var(--text-inverse)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2 text-center">
          Enter para enviar · Shift+Enter para nova linha · Usando{' '}
          <span className="text-[var(--accent)] font-medium">
            {selectedModel === 'claude' ? 'Claude Sonnet' : 'Gemini 2.5 Flash'}
          </span>
        </p>
      </div>
    </div>
  );
}

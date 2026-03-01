'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface AIKeys {
  claude?: string;
  openai?: string;
  gemini?: string;
  activeProvider?: 'claude' | 'openai' | 'gemini';
}

const SUGGESTED_QUESTIONS = [
  'Análise quantitativa com dados da BrAPI',
  'Quais os principais riscos e notícias recentes?',
  'Faça uma análise de valuation e múltiplos',
];

function getAIKeys(): AIKeys {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('assefin_ai_keys') || '{}');
  } catch {
    return {};
  }
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown renderer for bold, links, headers, lists
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <p key={i} className="text-sm font-bold text-[var(--text-primary)] mt-3 mb-1">{line.slice(3)}</p>;
        }
        if (line.startsWith('### ')) {
          return <p key={i} className="text-xs font-semibold text-[var(--accent)] mt-2 mb-0.5">{line.slice(4)}</p>;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const text = line.slice(2);
          return (
            <p key={i} className="text-xs text-[var(--text-secondary)] flex gap-1.5">
              <span className="text-[var(--accent)] flex-shrink-0 mt-0.5">•</span>
              <span dangerouslySetInnerHTML={{ __html: renderInline(text) }} />
            </p>
          );
        }
        if (line.startsWith('> ')) {
          return (
            <div key={i} className="border-l-2 border-[var(--accent)]/40 pl-2 my-1">
              <p className="text-xs text-[var(--text-muted)] italic" dangerouslySetInnerHTML={{ __html: renderInline(line.slice(2)) }} />
            </div>
          );
        }
        if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
          return <p key={i} className="text-xs text-[var(--text-muted)] italic" dangerouslySetInnerHTML={{ __html: renderInline(line) }} />;
        }
        if (line.trim() === '' || line.trim() === '---') {
          return <div key={i} className="h-1" />;
        }
        if (line.match(/^\d+\. /)) {
          const text = line.replace(/^\d+\. /, '');
          return (
            <p key={i} className="text-xs text-[var(--text-secondary)] flex gap-1.5">
              <span className="text-[var(--accent)] flex-shrink-0 font-bold">{line.match(/^\d+/)?.[0]}.</span>
              <span dangerouslySetInnerHTML={{ __html: renderInline(text) }} />
            </p>
          );
        }
        return (
          <p key={i} className="text-xs text-[var(--text-secondary)] leading-relaxed" dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
        );
      })}
    </div>
  );
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text-primary)] font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-[var(--surface)] px-1 rounded text-[var(--accent)] text-xs">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--accent)] underline underline-offset-2 hover:opacity-80">$1</a>');
}

export default function AssetChat({
  symbol,
  assetType = 'stock',
}: {
  symbol: string;
  assetType?: 'stock' | 'crypto';
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Welcome message on mount
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `## Olá! Sou o Assistente ASSEFIN 👋\n\nEstou pronto para analisar **${symbol}** com você.\n\nPosso ajudar com:\n- Dados quantitativos via BrAPI\n- Riscos e notícias recentes\n- Valuation e múltiplos\n\nConfigure uma chave de API (Claude, GPT ou Gemini) em **APIs & Conexões** para respostas completas com IA.`,
      },
    ]);
  }, [symbol]);

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question.trim(),
    };

    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const keys = getAIKeys();
      const provider = keys.activeProvider || 'claude';
      const apiKey = keys[provider] || '';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, question: question.trim(), provider, apiKey }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to connect to chat API');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated, isStreaming: true } : m
          )
        );
      }

      // Finalize streaming
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: accumulated, isStreaming: false } : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `❌ Erro: ${err instanceof Error ? err.message : 'Falha na conexão'}. Verifique suas configurações de API.`,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [symbol, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-6 z-40 flex items-center gap-2 px-4 py-3 bg-[var(--accent)] text-[var(--text-inverse)] rounded-full shadow-lg hover:bg-[var(--accent-hover)] transition-all active:scale-95 font-semibold text-sm"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Agente {symbol}
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] border-l border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] flex items-center justify-center shadow-sm flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)] leading-none">Agente ASSEFIN</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{symbol} · {assetType === 'stock' ? 'B3' : 'Crypto'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isLoading && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--accent-soft)]">
              <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" />
              <span className="text-xs text-[var(--accent)] font-medium">Pensando</span>
            </div>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Minimizar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              msg.role === 'user'
                ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                : 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
            }`}>
              {msg.role === 'user' ? 'U' : 'A'}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)] rounded-tr-sm'
                  : 'bg-[var(--bg-elevated)] border border-[var(--border)] rounded-tl-sm'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="text-xs leading-relaxed">{msg.content}</p>
              ) : (
                <>
                  {msg.content ? (
                    <MarkdownContent content={msg.content} />
                  ) : (
                    <div className="flex items-center gap-1.5 py-1">
                      <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                  {msg.isStreaming && msg.content && (
                    <span className="inline-block w-0.5 h-3 bg-[var(--accent)] ml-0.5 animate-pulse" />
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions — show when no user messages yet */}
      {messages.filter((m) => m.role === 'user').length === 0 && (
        <div className="px-3 pb-2 flex-shrink-0">
          <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">Sugestões:</p>
          <div className="flex flex-col gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={isLoading}
                className="text-left text-xs px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-[var(--border)] flex-shrink-0 bg-[var(--bg-elevated)]">
        <div className="flex items-end gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 focus-within:border-[var(--accent)]/60 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Pergunte sobre ${symbol}…`}
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none outline-none leading-relaxed max-h-24 disabled:opacity-50"
            style={{ minHeight: '20px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-7 h-7 rounded-lg bg-[var(--accent)] text-[var(--text-inverse)] flex items-center justify-center hover:bg-[var(--accent-hover)] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 text-center">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface AssetInfo {
  symbol: string;
  name: string;
  type: 'crypto' | 'stock' | 'etf';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type AIModel = 'claude' | 'gemini' | 'gpt';

const MODEL_OPTIONS: { id: AIModel; label: string; short: string }[] = [
  { id: 'claude', label: 'Claude Sonnet', short: 'Claude' },
  { id: 'gemini', label: 'Gemini 2.5 Flash', short: 'Gemini' },
  { id: 'gpt', label: 'GPT-4o', short: 'GPT' },
];

const QUICK_ACTIONS = [
  'Análise completa do ativo',
  'Quais são os principais riscos?',
  'Últimas notícias relevantes',
  'Indicadores fundamentalistas',
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  // Simple markdown-like rendering: bold, code blocks, line breaks
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
      return (
        <span key={i}>
          {parts.map((part, j) => {
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code key={j} className="bg-[var(--surface)] px-1.5 py-0.5 rounded text-xs font-mono text-[var(--accent)]">
                  {part.slice(1, -1)}
                </code>
              );
            }
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
          {i < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-xs mr-2 mt-1 flex-shrink-0">
          🤖
        </div>
      )}
      <div
        className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-[var(--accent)] text-[var(--text-inverse)] rounded-br-sm'
            : 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-bl-sm'
        }`}
      >
        {renderContent(message.content)}
      </div>
    </div>
  );
}

export default function AssetChatPanel({
  isOpen,
  asset,
  onClose,
}: {
  isOpen: boolean;
  asset: AssetInfo | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<AIModel>('claude');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // Reset messages when asset changes
  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [asset?.symbol]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Close model menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/asset/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          model,
          asset,
        }),
      });

      const data = await res.json();
      if (data.content) {
        setMessages([...newMessages, { role: 'assistant', content: data.content }]);
      } else {
        setMessages([...newMessages, {
          role: 'assistant',
          content: `❌ ${data.error || 'Erro desconhecido. Verifique sua chave de API.'}`,
        }]);
      }
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: '❌ Erro de conexão. Tente novamente.',
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, model, asset]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const typeBadgeStyle = (type: AssetInfo['type']) => {
    if (type === 'crypto') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (type === 'etf') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  const typeBadgeLabel = (type: AssetInfo['type']) => {
    if (type === 'crypto') return 'Cripto';
    if (type === 'etf') return 'ETF';
    return 'Ações';
  };

  const currentModel = MODEL_OPTIONS.find((m) => m.id === model)!;

  return (
    <>
      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[55] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-[var(--bg-elevated)] border-l border-[var(--border)] shadow-2xl z-[60] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col min-w-0">
              {asset ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)] text-base">{asset.symbol}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${typeBadgeStyle(asset.type)}`}>
                      {typeBadgeLabel(asset.type)}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">{asset.name}</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-[var(--text-muted)]">Selecione um ativo</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Model selector */}
            <div className="relative" ref={modelMenuRef}>
              <button
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/50 transition-all"
              >
                <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                {currentModel.short}
                <svg className={`w-3 h-3 transition-transform ${showModelMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showModelMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-10 overflow-hidden">
                  {MODEL_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setModel(opt.id); setShowModelMenu(false); }}
                      className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                        model === opt.id
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${model === opt.id ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              aria-label="Fechar painel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {messages.length === 0 && asset && (
            <div className="flex flex-col items-center justify-center h-full gap-4 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] flex items-center justify-center text-2xl">
                📊
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Análise de {asset.symbol}
                </p>
                <p className="text-xs text-[var(--text-muted)] max-w-[260px] leading-relaxed">
                  Faça perguntas sobre este ativo. O agente usa dados da BrAPI e pesquisa notícias recentes.
                </p>
              </div>

              {/* Quick actions */}
              <div className="w-full space-y-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action}
                    onClick={() => sendMessage(action)}
                    className="w-full text-left px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-hover)] transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-[var(--accent)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.length === 0 && !asset && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[var(--surface)] flex items-center justify-center text-2xl">
                🔍
              </div>
              <p className="text-sm text-[var(--text-muted)] text-center max-w-[220px]">
                Pesquise um ativo na barra de busca para iniciar a análise
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {loading && (
            <div className="flex justify-start mb-3">
              <div className="w-6 h-6 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-xs mr-2 mt-1 flex-shrink-0">
                🤖
              </div>
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl rounded-bl-sm">
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={asset ? `Pergunte sobre ${asset.symbol}...` : 'Selecione um ativo para começar...'}
              disabled={!asset || loading}
              rows={1}
              className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 resize-none max-h-32 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '40px' }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!asset || !input.trim() || loading}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0"
              aria-label="Enviar mensagem"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5 text-center">
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </>
  );
}

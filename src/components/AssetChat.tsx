'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type AIProvider = 'claude' | 'openai' | 'gemini';

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
}

const PROVIDERS: { id: AIProvider; label: string; short: string; placeholder: string }[] = [
  { id: 'claude', label: 'Claude', short: 'Claude', placeholder: 'sk-ant-api03-...' },
  { id: 'openai', label: 'GPT-4o', short: 'GPT', placeholder: 'sk-proj-...' },
  { id: 'gemini', label: 'Gemini', short: 'Gemini', placeholder: 'AIzaSy...' },
];

const SUGGESTED_QUESTIONS = [
  'Análise quantitativa com dados da BrAPI',
  'Quais os principais riscos e notícias recentes?',
  'Faça uma análise de valuation e múltiplos',
];

function loadKeys(): AIKeys {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('assefin_ai_keys') || '{}'); }
  catch { return {}; }
}

function saveKeys(keys: AIKeys) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('assefin_ai_keys', JSON.stringify(keys));
}

function MarkdownContent({ content }: { content: string }) {
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
          return (
            <p key={i} className="text-xs text-[var(--text-secondary)] flex gap-1.5">
              <span className="text-[var(--accent)] flex-shrink-0 mt-0.5">•</span>
              <span dangerouslySetInnerHTML={{ __html: renderInline(line.slice(2)) }} />
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
        if (line.match(/^\d+\. /)) {
          const text = line.replace(/^\d+\. /, '');
          return (
            <p key={i} className="text-xs text-[var(--text-secondary)] flex gap-1.5">
              <span className="text-[var(--accent)] flex-shrink-0 font-bold">{line.match(/^\d+/)?.[0]}.</span>
              <span dangerouslySetInnerHTML={{ __html: renderInline(text) }} />
            </p>
          );
        }
        if (line.trim() === '' || line.trim() === '---') return <div key={i} className="h-1" />;
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

  // Model selector state
  const [aiKeys, setAiKeys] = useState<AIKeys>({});
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('claude');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInputValue, setKeyInputValue] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const keys = loadKeys();
    setAiKeys(keys);
    // Auto-select first provider with a key
    const active = PROVIDERS.find((p) => keys[p.id]);
    if (active) setSelectedProvider(active.id);
  }, []);

  useEffect(() => {
    setKeyInputValue(aiKeys[selectedProvider] || '');
    setShowKeyInput(false);
  }, [selectedProvider, aiKeys]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `## Agente ASSEFIN — ${symbol}\n\nPosso ajudar com:\n- Dados quantitativos via BrAPI\n- Riscos e notícias recentes (com fontes)\n- Valuation e múltiplos\n\nEscolha um modelo acima e conecte sua API key para começar.`,
      },
    ]);
  }, [symbol]);

  const handleSaveKey = () => {
    const updated = { ...aiKeys, [selectedProvider]: keyInputValue.trim() };
    saveKeys(updated);
    setAiKeys(updated);
    setShowKeyInput(false);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const hasKey = !!aiKeys[selectedProvider];

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: question.trim() };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', isStreaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          question: question.trim(),
          provider: selectedProvider,
          apiKey: aiKeys[selectedProvider] || '',
        }),
      });

      if (!response.ok || !response.body) throw new Error('Falha na conexão com a API');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: accumulated, isStreaming: true } : m));
      }

      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: accumulated, isStreaming: false } : m));
    } catch (err) {
      setMessages((prev) => prev.map((m) =>
        m.id === assistantId
          ? { ...m, content: `❌ ${err instanceof Error ? err.message : 'Erro desconhecido'}`, isStreaming: false }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, [symbol, isLoading, selectedProvider, aiKeys]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-6 z-50 flex items-center gap-2 px-4 py-3 bg-[var(--accent)] text-[var(--text-inverse)] rounded-full shadow-lg hover:bg-[var(--accent-hover)] transition-all active:scale-95 font-semibold text-sm"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Agente {symbol}
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] overflow-hidden">
      {/* Spacer that sits behind the top header (MarketTickerBar + AppHeader) */}
      <div className="h-[120px] flex-shrink-0 bg-[var(--bg-elevated)] border-b border-[var(--border)]" />

      {/* ── Model Selector ── */}
      <div className="flex-shrink-0 px-3 py-2.5 bg-[var(--bg-elevated)] border-b border-[var(--border)] space-y-2">
        {/* Provider pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide flex-shrink-0">Modelo</span>
          <div className="flex gap-1 flex-1">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProvider(p.id)}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  selectedProvider === p.id
                    ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-sm'
                    : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                }`}
              >
                {p.short}
                {aiKeys[p.id] && (
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedProvider === p.id ? 'bg-white/70' : 'bg-green-500'}`} />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* API Key row */}
        {!showKeyInput ? (
          <div className="flex items-center gap-2">
            {hasKey ? (
              <div className="flex items-center gap-1.5 flex-1">
                <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                <span className="text-[11px] text-green-400 font-medium">API conectada</span>
                <button
                  onClick={() => { setShowKeyInput(true); setKeyInputValue(aiKeys[selectedProvider] || ''); }}
                  className="ml-auto text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                >
                  alterar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowKeyInput(true)}
                className="flex items-center gap-1.5 flex-1 py-1.5 px-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-all text-[11px] font-semibold"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Conectar API Key
              </button>
            )}
            {isLoading && (
              <span className="flex items-center gap-1 text-[10px] text-[var(--accent)] font-medium">
                <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" />
                Gerando
              </span>
            )}
          </div>
        ) : (
          <div className="flex gap-1.5">
            <input
              type="password"
              value={keyInputValue}
              onChange={(e) => setKeyInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey(); if (e.key === 'Escape') setShowKeyInput(false); }}
              placeholder={PROVIDERS.find((p) => p.id === selectedProvider)?.placeholder}
              autoFocus
              className="flex-1 bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none font-mono min-w-0"
            />
            <button
              onClick={handleSaveKey}
              disabled={!keyInputValue.trim()}
              className="px-3 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg text-[11px] font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
            >
              {keySaved ? '✓' : 'Salvar'}
            </button>
            <button
              onClick={() => setShowKeyInput(false)}
              className="px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] rounded-lg text-[11px] hover:text-[var(--text-primary)] transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ── Agent Header ── */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] flex items-center justify-center shadow-sm flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--text-primary)] leading-none">Agente ASSEFIN</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{symbol} · {assetType === 'stock' ? 'B3' : 'Crypto'} · {PROVIDERS.find(p => p.id === selectedProvider)?.label}</p>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
              msg.role === 'user' ? 'bg-[var(--accent)] text-[var(--text-inverse)]' : 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
            }`}>
              {msg.role === 'user' ? 'U' : 'A'}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2.5 ${
              msg.role === 'user'
                ? 'bg-[var(--accent)] text-[var(--text-inverse)] rounded-tr-sm'
                : 'bg-[var(--bg-elevated)] border border-[var(--border)] rounded-tl-sm'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-xs leading-relaxed">{msg.content}</p>
              ) : (
                <>
                  {msg.content ? (
                    <MarkdownContent content={msg.content} />
                  ) : (
                    <div className="flex items-center gap-1.5 py-1">
                      {[0, 150, 300].map((delay) => (
                        <div key={delay} className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                      ))}
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

      {/* ── Suggested questions ── */}
      {messages.filter((m) => m.role === 'user').length === 0 && (
        <div className="px-3 pb-2 flex-shrink-0">
          <p className="text-[10px] text-[var(--text-muted)] mb-2 font-medium uppercase tracking-wide">Sugestões</p>
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

      {/* ── Input ── */}
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

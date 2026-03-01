'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AssetChatProps {
  symbol: string;
  assetType: 'stock' | 'crypto';
  assetName?: string;
  onClose: () => void;
}

const SUGGESTED_QUESTIONS = [
  'Quais são os principais riscos deste ativo?',
  'Como está o desempenho recente?',
  'Qual a perspectiva dos analistas?',
];

export default function AssetChat({ symbol, assetType, assetName, onClose }: AssetChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [provider, setProvider] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const savedProvider = localStorage.getItem('ai_provider') || 'claude';
    setProvider(savedProvider);
    setHasKey(!!localStorage.getItem(`ai_key_${savedProvider}`));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getApiKey = useCallback(() => {
    const p = localStorage.getItem('ai_provider') || 'claude';
    return localStorage.getItem(`ai_key_${p}`) || '';
  }, []);

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || streaming) return;

      const apiKey = getApiKey();
      if (!apiKey) return;

      const currentProvider = localStorage.getItem('ai_provider') || 'claude';

      const userMsg: Message = { role: 'user', content };
      const nextMessages = [...messages, userMsg];

      setMessages(nextMessages);
      setInput('');
      setStreaming(true);

      // Append empty assistant message for streaming
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      abortRef.current = new AbortController();

      try {
        const response = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: nextMessages,
            provider: currentProvider,
            apiKey,
            symbol,
            assetType,
            assetName,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'Erro ao obter resposta');
        }

        if (!response.body) throw new Error('Sem corpo na resposta');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = { ...last, content: last.content + parsed.text };
                  return updated;
                });
              }
            } catch {
              // ignore parse errors for partial chunks
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: `⚠️ ${msg}`,
          };
          return updated;
        });
      } finally {
        setStreaming(false);
        abortRef.current = null;
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [input, messages, streaming, getApiKey, symbol, assetType, assetName]
  );

  const providerLabel: Record<string, string> = {
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    gemini: 'Gemini',
  };

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
              Chat IA — {assetName || symbol}
            </p>
            {provider && (
              <p className="text-xs text-[var(--text-muted)] leading-tight">
                {providerLabel[provider] || provider}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            abortRef.current?.abort();
            onClose();
          }}
          className="shrink-0 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)] transition-colors"
          aria-label="Fechar chat"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* No key warning */}
      {!hasKey && (
        <div className="mx-4 mt-3 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg shrink-0">
          <p className="text-yellow-400 text-xs font-medium">Nenhuma API Key de IA configurada</p>
          <p className="text-yellow-600 text-xs mt-0.5">
            Vá em Conectar APIs → IA para adicionar uma chave.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center pt-4 pb-2">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-[var(--text-primary)] text-sm font-medium mb-1">
              Agente de Análise — {symbol}
            </p>
            <p className="text-[var(--text-muted)] text-xs mb-4">
              Pergunte sobre dados quantitativos, riscos e notícias recentes do ativo.
            </p>

            {/* Suggested questions */}
            <div className="w-full space-y-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => hasKey && sendMessage(q)}
                  disabled={!hasKey || streaming}
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 text-[var(--text-secondary)] text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[var(--accent)] text-white rounded-br-sm'
                  : 'bg-[var(--bg)] text-[var(--text-primary)] border border-[var(--border)] rounded-bl-sm'
              }`}
            >
              {msg.content || (
                streaming && i === messages.length - 1 ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                ) : ''
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-[var(--border)] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasKey ? `Pergunte sobre ${symbol}...` : 'Configure uma API Key de IA'}
            disabled={!hasKey || streaming}
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!hasKey || !input.trim() || streaming}
            className="shrink-0 w-10 h-10 flex items-center justify-center bg-[var(--accent)] text-white rounded-xl disabled:opacity-40 hover:opacity-90 transition-all active:scale-95"
            aria-label="Enviar"
          >
            {streaming ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

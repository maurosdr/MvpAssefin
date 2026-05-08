'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SIDEBAR_WIDTH_PX = 420;

export type AgentSkill = 'crypto' | 'equity' | 'portfolio';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentSidebarProps {
  skill: AgentSkill;
  context: unknown;
  title?: string;
  subtitle?: string;
  /** Stable identity for context (e.g. symbol). When this changes, history resets. */
  contextKey?: string;
}

const SKILL_META: Record<AgentSkill, { title: string; subtitle: string; greeting: string; suggestions: string[] }> = {
  crypto: {
    title: 'Analista Cripto',
    subtitle: 'Análise de mercado cripto',
    greeting:
      'Olá! Sou o analista de cripto. Vejo o ativo desta página em tempo real (preço, volume, RSI, MA, volatilidade) e suas posições conectadas. Pode me perguntar sobre o ativo ou sobre como ele se encaixa na sua carteira.',
    suggestions: [
      'Qual a leitura técnica desse ativo agora?',
      'Faz sentido aumentar exposição aqui?',
      'Que stop loss você sugere?',
    ],
  },
  equity: {
    title: 'Analista de Ações',
    subtitle: 'Análise fundamentalista',
    greeting:
      'Olá! Sou o analista de equity research. Tenho os fundamentos da empresa (DRE, balanço, fluxo de caixa, múltiplos) carregados desta página. Pode me perguntar sobre tese, valuation ou riscos.',
    suggestions: [
      'Qual a sua tese resumida?',
      'A ação está cara nos múltiplos atuais?',
      'Quais os principais riscos da posição?',
    ],
  },
  portfolio: {
    title: 'Gestor de Carteira',
    subtitle: 'Gestão de carteira',
    greeting:
      'Olá! Sou o gestor de portfólio. Estou olhando suas posições, pesos, retornos, vol e drawdown agora. Posso revisar a carteira, sugerir rebalanceamentos ou avaliar uma ideia específica.',
    suggestions: [
      'Faça um diagnóstico da minha carteira',
      'Onde estou concentrado demais?',
      'Que rebalanceamento você sugere?',
    ],
  },
};

export default function AgentSidebar({ skill, context, title, subtitle, contextKey }: AgentSidebarProps) {
  const meta = SKILL_META[skill];

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Reset when skill or context identity changes
  useEffect(() => {
    setMessages([]);
    setError(null);
    abortRef.current?.abort();
  }, [skill, contextKey]);

  // Layout shift: when the sidebar opens, push the rest of the UI in
  // by setting a CSS variable that .app-shell consumes, plus a body class
  // so dense chrome (navbar) can compress.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    if (open) {
      root.style.setProperty('--sidebar-offset', `${SIDEBAR_WIDTH_PX}px`);
      body.classList.add('agent-sidebar-open');
    } else {
      root.style.setProperty('--sidebar-offset', '0px');
      body.classList.remove('agent-sidebar-open');
    }
    return () => {
      root.style.setProperty('--sidebar-offset', '0px');
      body.classList.remove('agent-sidebar-open');
    };
  }, [open]);

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;
      setError(null);

      const userMsg: ChatMessage = { role: 'user', content: text.trim() };
      const next = [...messages, userMsg];
      setMessages([...next, { role: 'assistant', content: '' }]);
      setInput('');
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skill, context, messages: next }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const msg = `HTTP ${res.status}`;
          throw new Error(msg);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let collected = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);

            const lines = chunk.split('\n');
            let event = 'message';
            let data = '';
            for (const line of lines) {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              else if (line.startsWith('data:')) data += line.slice(5).trim();
            }
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);
              if (event === 'delta' && typeof parsed.text === 'string') {
                // Buffer silently — UI keeps showing "Pensando..." until done.
                collected += parsed.text;
              } else if (event === 'error') {
                throw new Error(parsed.message || 'erro do agente');
              }
            } catch (e) {
              if (event === 'error') throw e;
            }
          }
        }

        // Reveal full answer at once when stream finishes.
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === 'assistant') {
            copy[copy.length - 1] = { ...last, content: collected };
          }
          return copy;
        });
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        const msg = e instanceof Error ? e.message : 'erro inesperado';
        setError(msg);
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === 'assistant' && last.content === '') copy.pop();
          return copy;
        });
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [skill, context, messages, streaming]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setStreaming(false);
  }, []);

  const headerTitle = title || meta.title;
  const headerSubtitle = subtitle || meta.subtitle;

  const showGreeting = messages.length === 0;

  const suggestions = useMemo(() => meta.suggestions, [meta]);

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir assistente"
          className="fixed right-4 bottom-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold shadow-lg shadow-yellow-500/30 transition-all active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="hidden sm:inline text-sm">{headerTitle}</span>
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 z-50 h-screen w-full sm:w-[420px] bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl transition-transform duration-300 flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text)] truncate">{headerTitle}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{headerSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={reset}
                title="Nova conversa"
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-gray-800/50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              title="Fechar"
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-gray-800/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {showGreeting && (
            <>
              <div className="bg-gray-800/40 border border-[var(--border)] rounded-2xl p-3 text-sm text-[var(--text)] leading-relaxed">
                {meta.greeting}
              </div>
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={streaming}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface)]/40 hover:border-yellow-500/50 hover:bg-yellow-500/5 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
                m.role === 'user'
                  ? 'ml-6 bg-yellow-500/15 border border-yellow-500/30 text-[var(--text)] whitespace-pre-wrap'
                  : 'mr-6 bg-gray-800/40 border border-[var(--border)] text-[var(--text)]'
              }`}
            >
              {m.role === 'assistant' ? (
                m.content ? (
                  <div className="agent-md">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                ) : streaming && i === messages.length - 1 ? (
                  <ThinkingIndicator />
                ) : null
              ) : (
                m.content
              )}
            </div>
          ))}

          {error && (
            <div className="rounded-xl px-3 py-2 text-xs bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-[var(--border)] p-3 bg-[var(--surface)]/80 backdrop-blur-sm"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Pergunte algo…"
              rows={1}
              disabled={streaming}
              className="flex-1 resize-none bg-gray-800/50 border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-yellow-500/60 max-h-32"
            />
            {streaming ? (
              <button
                type="button"
                onClick={stop}
                className="px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
              >
                Parar
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-3 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-black transition-colors text-sm font-semibold"
              >
                Enviar
              </button>
            )}
          </div>
          <p className="mt-2 text-[10px] text-[var(--text-muted)]">
            Análises geradas por IA. Não constituem recomendação personalizada.
          </p>
        </form>
      </aside>
    </>
  );
}

function ThinkingIndicator() {
  return (
    <span className="inline-flex items-center gap-2 text-[var(--text-muted)] italic text-sm">
      <span className="inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-pulse" />
        <span
          className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-pulse"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-pulse"
          style={{ animationDelay: '300ms' }}
        />
      </span>
      <span>Pensando...</span>
    </span>
  );
}

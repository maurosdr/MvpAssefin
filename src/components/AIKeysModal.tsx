'use client';

import { useState, useEffect, useCallback } from 'react';

type Provider = 'claude' | 'gemini' | 'gpt';

interface KeyStatus {
  configured: boolean;
  preview: string | null;
}

interface KeysState {
  anthropic: KeyStatus;
  gemini: KeyStatus;
  openai: KeyStatus;
}

const PROVIDERS: { id: Provider; label: string; subtitle: string; cookieName: string; placeholder: string; docsUrl: string; color: string }[] = [
  {
    id: 'claude',
    label: 'Claude (Anthropic)',
    subtitle: 'Para usar o modelo Claude Sonnet',
    cookieName: 'anthropic',
    placeholder: 'sk-ant-api...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    color: 'orange',
  },
  {
    id: 'gemini',
    label: 'Gemini (Google)',
    subtitle: 'Para usar o Gemini 2.5 Flash',
    cookieName: 'gemini',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    color: 'blue',
  },
  {
    id: 'gpt',
    label: 'GPT (OpenAI)',
    subtitle: 'Para usar o GPT-4o',
    cookieName: 'openai',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    color: 'green',
  },
];

export default function AIKeysModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<Provider>('claude');
  const [inputKey, setInputKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<KeysState>({
    anthropic: { configured: false, preview: null },
    gemini: { configured: false, preview: null },
    openai: { configured: false, preview: null },
  });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/trading/keys');
      if (res.ok) {
        const data = await res.json();
        setStatus({
          anthropic: data.anthropic ?? { configured: false, preview: null },
          gemini: data.gemini ?? { configured: false, preview: null },
          openai: data.openai ?? { configured: false, preview: null },
        });
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchStatus();
      setInputKey('');
      setError('');
    }
  }, [open, fetchStatus]);

  if (!open) return null;

  const current = PROVIDERS.find((p) => p.id === selected)!;
  const currentStatus = selected === 'claude' ? status.anthropic : selected === 'gemini' ? status.gemini : status.openai;
  const configuredCount = [status.anthropic.configured, status.gemini.configured, status.openai.configured].filter(Boolean).length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!inputKey.trim()) return;
    setSaving(true);
    try {
      const body = selected === 'claude'
        ? { anthropicKey: inputKey.trim() }
        : selected === 'gemini'
        ? { geminiKey: inputKey.trim() }
        : { openaiKey: inputKey.trim() };

      const res = await fetch('/api/trading/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      await fetchStatus();
      setInputKey('');
    } catch {
      setError('Falha ao salvar a chave. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const provider = selected === 'claude' ? 'anthropic' : selected === 'gemini' ? 'gemini' : 'openai';
      await fetch('/api/trading/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      await fetchStatus();
    } catch {
      // silently ignore
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)]/70 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-base">
              🔑
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">APIs de IA</h2>
              <p className="text-xs text-[var(--text-muted)]">{configuredCount}/3 APIs configuradas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-lg leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 mb-5">
          {PROVIDERS.map((p) => {
            const st = p.id === 'claude' ? status.anthropic : p.id === 'gemini' ? status.gemini : status.openai;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                  st.configured
                    ? 'bg-[var(--success-soft)] border-[var(--success)]/30 text-[var(--success)]'
                    : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${st.configured ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`} />
                {p.label.split(' ')[0]}
                {st.configured && <span>✓</span>}
              </div>
            );
          })}
        </div>

        {/* Provider tabs */}
        <div className="flex gap-2 mb-5">
          {PROVIDERS.map((p) => {
            const st = p.id === 'claude' ? status.anthropic : p.id === 'gemini' ? status.gemini : status.openai;
            return (
              <button
                key={p.id}
                onClick={() => { setSelected(p.id); setError(''); setInputKey(''); }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  selected === p.id
                    ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-sm'
                    : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                {p.label.split(' ')[0]}
                {st.configured && (
                  <span className="w-2 h-2 bg-[var(--success)] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{current.label}</p>
              <p className="text-xs text-[var(--text-muted)]">{current.subtitle}</p>
            </div>
            <a
              href={current.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              Obter chave
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {currentStatus.configured ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-4 py-3 bg-[var(--success-soft)] border border-[var(--success)]/30 rounded-xl">
                <span className="w-2.5 h-2.5 bg-[var(--success)] rounded-full flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[var(--success)]">Configurada</p>
                  <p className="text-xs text-[var(--text-muted)] font-mono">{currentStatus.preview}</p>
                </div>
              </div>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="w-full py-2.5 bg-[var(--danger-soft)] hover:bg-[var(--danger)]/20 border border-[var(--danger)]/30 text-[var(--danger)] rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              >
                {removing ? 'Removendo...' : `Remover chave ${current.label.split(' ')[0]}`}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">API Key</label>
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 text-sm font-mono transition-all"
                  placeholder={current.placeholder}
                  required
                />
              </div>
              {error && (
                <p className="text-xs text-[var(--danger)] flex items-center gap-1">
                  <span>⚠</span> {error}
                </p>
              )}
              <button
                type="submit"
                disabled={saving || !inputKey.trim()}
                className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-inverse)] rounded-xl font-bold text-sm transition-all"
              >
                {saving ? 'Salvando...' : `Salvar chave ${current.label.split(' ')[0]}`}
              </button>
            </form>
          )}

          <p className="text-[10px] text-[var(--text-muted)] text-center leading-relaxed">
            🔒 Chaves armazenadas em cookies httpOnly no seu navegador. Nunca enviadas a terceiros.
          </p>
        </div>

        {/* Done button */}
        {configuredCount > 0 && (
          <button
            onClick={onClose}
            className="w-full mt-4 py-2.5 bg-[var(--bg)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-secondary)] rounded-xl font-semibold text-sm transition-colors"
          >
            {configuredCount === 3 ? 'Pronto' : 'Pronto (configurar mais depois)'}
          </button>
        )}
      </div>
    </div>
  );
}

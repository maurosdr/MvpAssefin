'use client';

import { useState, useEffect, useCallback } from 'react';
import { useExchange, ExchangeName } from '@/context/ExchangeContext';

/* ─── Types ─────────────────────────────────────────── */
type Category = 'ai' | 'crypto' | 'prediction';

interface KeyStatus {
  configured: boolean;
  preview: string | null;
}

interface KeysState {
  anthropic:  KeyStatus;
  gemini:     KeyStatus;
  openai:     KeyStatus;
  polymarket: KeyStatus;
  kalshi:     KeyStatus;
}

const EMPTY_KEYS: KeysState = {
  anthropic:  { configured: false, preview: null },
  gemini:     { configured: false, preview: null },
  openai:     { configured: false, preview: null },
  polymarket: { configured: false, preview: null },
  kalshi:     { configured: false, preview: null },
};

/* ─── AI providers config ────────────────────────────── */
const AI_PROVIDERS = [
  {
    id: 'claude',
    label: 'Claude',
    subtitle: 'Claude Sonnet 4.6 · Anthropic',
    placeholder: 'sk-ant-api...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    bodyKey: 'anthropicKey',
    statusKey: 'anthropic' as keyof KeysState,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    subtitle: 'Gemini 2.5 Flash · Google',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    bodyKey: 'geminiKey',
    statusKey: 'gemini' as keyof KeysState,
  },
  {
    id: 'gpt',
    label: 'GPT',
    subtitle: 'GPT-4o · OpenAI',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    bodyKey: 'openaiKey',
    statusKey: 'openai' as keyof KeysState,
  },
];

/* ─── Exchange config ────────────────────────────────── */
const EXCHANGE_OPTIONS: { id: ExchangeName; label: string; accent: string }[] = [
  { id: 'binance',  label: 'Binance',  accent: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10' },
  { id: 'coinbase', label: 'Coinbase', accent: 'text-blue-400 border-blue-500/40 bg-blue-500/10' },
];

/* ─── Prediction market config ───────────────────────── */
const PREDICTION_PROVIDERS = [
  {
    id: 'polymarket',
    label: 'Polymarket',
    subtitle: 'Chave privada da wallet Polygon',
    placeholder: '0x...',
    docsUrl: 'https://polymarket.com/profile',
    bodyKey: 'polymarketKey',
    statusKey: 'polymarket' as keyof KeysState,
  },
  {
    id: 'kalshi',
    label: 'Kalshi',
    subtitle: 'API Key para prediction markets',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-...',
    docsUrl: 'https://kalshi.com/account/api',
    bodyKey: 'kalshiKey',
    statusKey: 'kalshi' as keyof KeysState,
  },
];

/* ─── Reusable key-input form ───────────────────────── */
function KeyForm({
  provider,
  status,
  onSaved,
  onRemoved,
}: {
  provider: (typeof AI_PROVIDERS)[0] | (typeof PREDICTION_PROVIDERS)[0];
  status: KeyStatus;
  onSaved: () => void;
  onRemoved: () => void;
}) {
  const [input, setInput]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError]     = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/trading/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [provider.bodyKey]: input.trim() }),
      });
      if (!res.ok) throw new Error();
      setInput('');
      onSaved();
    } catch {
      setError('Falha ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await fetch('/api/trading/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.statusKey }),
      });
      onRemoved();
    } catch {
      // ignore
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{provider.label}</p>
          <p className="text-xs text-[var(--text-muted)]">{provider.subtitle}</p>
        </div>
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 flex-shrink-0"
        >
          Obter chave
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {status.configured ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-[var(--success-soft)] border border-[var(--success)]/30 rounded-xl">
            <span className="w-2 h-2 bg-[var(--success)] rounded-full flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--success)]">Configurada</p>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">{status.preview}</p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="w-full py-2 bg-[var(--danger-soft)] hover:bg-[var(--danger)]/20 border border-[var(--danger)]/30 text-[var(--danger)] rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          >
            {removing ? 'Removendo...' : `Remover ${provider.label}`}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-2">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={provider.placeholder}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 font-mono transition-all"
            required
          />
          {error && <p className="text-xs text-[var(--danger)]">⚠ {error}</p>}
          <button
            type="submit"
            disabled={saving || !input.trim()}
            className="w-full py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-inverse)] rounded-xl text-sm font-bold transition-all"
          >
            {saving ? 'Salvando...' : `Salvar ${provider.label}`}
          </button>
        </form>
      )}
    </div>
  );
}

/* ─── AI Section ─────────────────────────────────────── */
function AISection({ keys, onRefresh }: { keys: KeysState; onRefresh: () => void }) {
  const [selected, setSelected] = useState(0);
  const provider = AI_PROVIDERS[selected];

  return (
    <div className="space-y-4">
      {/* Status row */}
      <div className="flex gap-2">
        {AI_PROVIDERS.map((p, i) => {
          const st = keys[p.statusKey];
          return (
            <button
              key={p.id}
              onClick={() => setSelected(i)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all border ${
                selected === i
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)] border-transparent'
                  : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {p.label}
              {st.configured && <span className="w-2 h-2 rounded-full bg-[var(--success)]" />}
            </button>
          );
        })}
      </div>

      <KeyForm
        provider={provider}
        status={keys[provider.statusKey]}
        onSaved={onRefresh}
        onRemoved={onRefresh}
      />

      <p className="text-[10px] text-[var(--text-muted)] text-center">
        🔒 Chaves em cookies httpOnly. Nunca enviadas a terceiros.
      </p>
    </div>
  );
}

/* ─── Crypto / Exchange Section ─────────────────────── */
function CryptoSection() {
  const { exchanges, connect, disconnect, connectedExchanges } = useExchange();
  const [selected, setSelected] = useState<ExchangeName>('binance');
  const [apiKey, setApiKey]     = useState('');
  const [secret, setSecret]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const currentEx = exchanges[selected];

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const ok = await connect(selected, apiKey, secret);
    setSaving(false);
    if (ok) {
      setApiKey('');
      setSecret('');
      const next = EXCHANGE_OPTIONS.find((ex) => ex.id !== selected && !exchanges[ex.id].connected);
      if (next) setSelected(next.id);
    } else {
      setError(`Falha ao conectar ${selected}. Verifique suas chaves.`);
    }
  };

  const handleDisconnect = async () => {
    await disconnect(selected);
  };

  return (
    <div className="space-y-4">
      {/* Status row */}
      <div className="flex gap-2">
        {EXCHANGE_OPTIONS.map((ex) => (
          <button
            key={ex.id}
            onClick={() => { setSelected(ex.id); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all border ${
              selected === ex.id
                ? 'bg-[var(--accent)] text-[var(--text-inverse)] border-transparent'
                : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {ex.label}
            {exchanges[ex.id].connected && <span className="w-2 h-2 rounded-full bg-[var(--success)]" />}
          </button>
        ))}
      </div>

      {currentEx.connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-[var(--success-soft)] border border-[var(--success)]/30 rounded-xl">
            <span className="w-2 h-2 bg-[var(--success)] rounded-full flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[var(--success)] capitalize">{selected} Conectado</p>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">{currentEx.apiKeyPreview}</p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="w-full py-2.5 bg-[var(--danger-soft)] hover:bg-[var(--danger)]/20 border border-[var(--danger)]/30 text-[var(--danger)] rounded-xl text-sm font-semibold transition-all capitalize"
          >
            Desconectar {selected}
          </button>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`${selected} API Key`}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Secret Key</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={`${selected} Secret Key`}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-all"
              required
            />
          </div>
          {error && <p className="text-xs text-[var(--danger)]">⚠ {error}</p>}
          <p className="text-[10px] text-[var(--text-muted)]">
            🔒 Use chaves somente-leitura para maior segurança.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-[var(--text-inverse)] rounded-xl text-sm font-bold transition-all capitalize"
          >
            {saving ? 'Conectando...' : `Conectar ${selected}`}
          </button>
        </form>
      )}

      {connectedExchanges.length > 0 && (
        <p className="text-xs text-center text-[var(--success)]">
          {connectedExchanges.length}/2 exchange{connectedExchanges.length > 1 ? 's' : ''} conectada{connectedExchanges.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

/* ─── Prediction Market Section ─────────────────────── */
function PredictionSection({ keys, onRefresh }: { keys: KeysState; onRefresh: () => void }) {
  const [selected, setSelected] = useState(0);
  const provider = PREDICTION_PROVIDERS[selected];

  return (
    <div className="space-y-4">
      {/* Status row */}
      <div className="flex gap-2">
        {PREDICTION_PROVIDERS.map((p, i) => {
          const st = keys[p.statusKey];
          return (
            <button
              key={p.id}
              onClick={() => setSelected(i)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all border ${
                selected === i
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)] border-transparent'
                  : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {p.label}
              {st.configured && <span className="w-2 h-2 rounded-full bg-[var(--success)]" />}
            </button>
          );
        })}
      </div>

      <KeyForm
        provider={provider}
        status={keys[provider.statusKey]}
        onSaved={onRefresh}
        onRemoved={onRefresh}
      />

      <p className="text-[10px] text-[var(--text-muted)] text-center">
        🔒 Chaves em cookies httpOnly. Nunca enviadas a terceiros.
      </p>
    </div>
  );
}

/* ─── Main Modal ─────────────────────────────────────── */
export default function ConnectionsModal({
  open,
  onClose,
  defaultCategory = 'ai',
}: {
  open: boolean;
  onClose: () => void;
  defaultCategory?: Category;
}) {
  const [category, setCategory] = useState<Category>(defaultCategory);
  const [keys, setKeys]         = useState<KeysState>(EMPTY_KEYS);
  const { connectedExchanges }  = useExchange();

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/trading/keys');
      if (res.ok) {
        const data = await res.json();
        setKeys({
          anthropic:  data.anthropic  ?? EMPTY_KEYS.anthropic,
          gemini:     data.gemini     ?? EMPTY_KEYS.gemini,
          openai:     data.openai     ?? EMPTY_KEYS.openai,
          polymarket: data.polymarket ?? EMPTY_KEYS.polymarket,
          kalshi:     data.kalshi     ?? EMPTY_KEYS.kalshi,
        });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (open) {
      setCategory(defaultCategory);
      fetchKeys();
    }
  }, [open, defaultCategory, fetchKeys]);

  if (!open) return null;

  const aiCount     = [keys.anthropic, keys.gemini, keys.openai].filter((k) => k.configured).length;
  const cryptoCount = connectedExchanges.length;
  const predCount   = [keys.polymarket, keys.kalshi].filter((k) => k.configured).length;
  const totalActive = aiCount + cryptoCount + predCount;

  const TABS: { id: Category; label: string; icon: string; count: number }[] = [
    { id: 'ai',         label: 'IA',         icon: '🤖', count: aiCount     },
    { id: 'crypto',     label: 'Cripto',      icon: '💱', count: cryptoCount },
    { id: 'prediction', label: 'Pred. Market',icon: '📊', count: predCount   },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)]/70 backdrop-blur-sm p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-lg">
              🔗
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Conexões</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {totalActive > 0 ? `${totalActive} ativa${totalActive > 1 ? 's' : ''}` : 'Nenhuma configurada'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Category tabs */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className="flex gap-1.5 bg-[var(--bg)] p-1 rounded-xl">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategory(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  category === tab.id
                    ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[var(--success)] text-[var(--text-inverse)] text-[9px] font-bold flex items-center justify-center leading-none">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content (scrollable) */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {category === 'ai'         && <AISection         keys={keys} onRefresh={fetchKeys} />}
          {category === 'crypto'     && <CryptoSection />}
          {category === 'prediction' && <PredictionSection keys={keys} onRefresh={fetchKeys} />}
        </div>

        {/* Footer */}
        {totalActive > 0 && (
          <div className="px-6 pb-5 flex-shrink-0 border-t border-[var(--border)] pt-4">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[var(--bg)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-secondary)] rounded-xl text-sm font-semibold transition-colors"
            >
              Pronto
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

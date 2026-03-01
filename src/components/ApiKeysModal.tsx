'use client';

import { useState, useEffect } from 'react';
import { useExchange, ExchangeName } from '@/context/ExchangeContext';

type ModalTab = 'crypto' | 'prediction' | 'ai';
type AIProvider = 'claude' | 'openai' | 'gemini';

interface AIKeys {
  claude?: string;
  openai?: string;
  gemini?: string;
  activeProvider?: AIProvider;
}

const EXCHANGE_OPTIONS: { id: ExchangeName; label: string; color: string }[] = [
  { id: 'binance', label: 'Binance', color: 'yellow' },
  { id: 'coinbase', label: 'Coinbase', color: 'blue' },
];

const AI_PROVIDERS: { id: AIProvider; label: string; color: string; placeholder: string; docsUrl: string }[] = [
  {
    id: 'claude',
    label: 'Claude (Anthropic)',
    color: 'orange',
    placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'openai',
    label: 'GPT (OpenAI)',
    color: 'green',
    placeholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'gemini',
    label: 'Gemini (Google)',
    color: 'blue',
    placeholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
];

function loadAIKeys(): AIKeys {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('assefin_ai_keys') || '{}');
  } catch {
    return {};
  }
}

function saveAIKeys(keys: AIKeys) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('assefin_ai_keys', JSON.stringify(keys));
}

export default function ApiKeysModal({
  open,
  onClose,
  initialTab = 'crypto',
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: ModalTab;
}) {
  const { exchanges, connect, disconnect, connectedExchanges } = useExchange();
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);

  // Crypto state
  const [selectedExchange, setSelectedExchange] = useState<ExchangeName>('binance');
  const [apiKey, setApiKey] = useState('');
  const [secret, setSecret] = useState('');
  const [exchangeError, setExchangeError] = useState('');
  const [saving, setSaving] = useState(false);
  const [justConnected, setJustConnected] = useState<ExchangeName | null>(null);

  // AI state
  const [aiKeys, setAiKeys] = useState<AIKeys>({});
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('claude');
  const [aiKeyInput, setAiKeyInput] = useState('');
  const [aiSaved, setAiSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setAiKeys(loadAIKeys());
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  useEffect(() => {
    setAiKeyInput(aiKeys[selectedProvider] || '');
  }, [selectedProvider, aiKeys]);

  if (!open) return null;

  const currentExchange = exchanges[selectedExchange];
  const allExchangesConnected = EXCHANGE_OPTIONS.every((ex) => exchanges[ex.id].connected);

  const handleExchangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExchangeError('');
    setSaving(true);
    const success = await connect(selectedExchange, apiKey, secret);
    setSaving(false);
    if (success) {
      setApiKey('');
      setSecret('');
      setJustConnected(selectedExchange);
      const other = EXCHANGE_OPTIONS.find((ex) => ex.id !== selectedExchange && !exchanges[ex.id].connected);
      if (other) setSelectedExchange(other.id);
    } else {
      setExchangeError(`Falha ao conectar com ${selectedExchange}. Verifique suas chaves.`);
    }
  };

  const handleExchangeDisconnect = async () => {
    await disconnect(selectedExchange);
    setJustConnected(null);
  };

  const handleSaveAIKey = () => {
    const updated = { ...aiKeys, [selectedProvider]: aiKeyInput, activeProvider: selectedProvider };
    saveAIKeys(updated);
    setAiKeys(updated);
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2000);
  };

  const handleRemoveAIKey = () => {
    const updated = { ...aiKeys };
    delete updated[selectedProvider];
    if (updated.activeProvider === selectedProvider) {
      const remaining = AI_PROVIDERS.find((p) => p.id !== selectedProvider && updated[p.id]);
      updated.activeProvider = remaining?.id;
    }
    saveAIKeys(updated);
    setAiKeys(updated);
    setAiKeyInput('');
  };

  const tabs: { id: ModalTab; label: string; icon: string }[] = [
    { id: 'crypto', label: 'Crypto', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'prediction', label: 'Prediction Market', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'ai', label: 'AI', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)]/70 backdrop-blur-sm p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">APIs & Conexões</h2>
              <p className="text-xs text-[var(--text-muted)]">Gerencie suas integrações</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1 p-3 bg-[var(--bg-elevated)] border-b border-[var(--border)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">

          {/* ─── CRYPTO TAB ─── */}
          {activeTab === 'crypto' && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                {EXCHANGE_OPTIONS.map((ex) => {
                  const isConn = exchanges[ex.id].connected;
                  return (
                    <div key={ex.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium flex-1 justify-center ${
                      isConn ? 'bg-green-900/30 border-green-700/50 text-green-400' : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${isConn ? 'bg-green-500' : 'bg-gray-600'}`} />
                      {ex.label}
                      {isConn && <span>✓</span>}
                    </div>
                  );
                })}
              </div>

              {justConnected && !allExchangesConnected && (
                <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-3">
                  <p className="text-green-400 text-xs">
                    {justConnected.charAt(0).toUpperCase() + justConnected.slice(1)} conectado! Você pode conectar outra exchange.
                  </p>
                </div>
              )}

              {/* Exchange Tabs */}
              <div className="flex gap-2">
                {EXCHANGE_OPTIONS.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => { setSelectedExchange(ex.id); setExchangeError(''); setJustConnected(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      selectedExchange === ex.id
                        ? ex.color === 'yellow'
                          ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                          : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {ex.label}
                    {exchanges[ex.id].connected && <span className="w-2 h-2 bg-green-500 rounded-full" />}
                  </button>
                ))}
              </div>

              {currentExchange.connected ? (
                <div className="space-y-3">
                  <div className="bg-green-900/30 border border-green-700 rounded-xl p-4">
                    <p className="text-green-400 font-medium text-sm">
                      {selectedExchange.charAt(0).toUpperCase() + selectedExchange.slice(1)} Conectado
                    </p>
                    <p className="text-[var(--text-muted)] text-xs mt-1">Chave: {currentExchange.apiKeyPreview}</p>
                  </div>
                  <button
                    onClick={handleExchangeDisconnect}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-sm transition-colors"
                  >
                    Desconectar {selectedExchange.charAt(0).toUpperCase() + selectedExchange.slice(1)}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleExchangeSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1.5">API Key</label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                      placeholder={`Sua ${selectedExchange} API Key`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1.5">Secret Key</label>
                    <input
                      type="password"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                      placeholder="Secret Key"
                      required
                    />
                  </div>
                  {exchangeError && <p className="text-red-400 text-xs">{exchangeError}</p>}
                  <p className="text-[var(--text-muted)] text-xs">Chaves armazenadas em cookies httpOnly. Use chaves somente-leitura.</p>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`w-full py-2.5 font-bold rounded-xl transition-colors disabled:opacity-50 text-sm ${
                      selectedExchange === 'coinbase' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                    }`}
                  >
                    {saving ? 'Conectando...' : `Conectar ${selectedExchange.charAt(0).toUpperCase() + selectedExchange.slice(1)}`}
                  </button>
                </form>
              )}

              {connectedExchanges.length > 0 && (
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-[var(--surface-hover)] hover:bg-[var(--surface)] text-[var(--text-secondary)] rounded-xl font-medium text-sm transition-colors border border-[var(--border)]"
                >
                  {allExchangesConnected ? 'Concluído' : 'Concluído (adicionar depois)'}
                </button>
              )}
            </div>
          )}

          {/* ─── PREDICTION MARKET TAB ─── */}
          {activeTab === 'prediction' && (
            <div className="space-y-4">
              <div className="bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-semibold text-[var(--accent)]">Mercados de Predição</p>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  O ASSEFIN integra com Polymarket e Kalshi automaticamente. Dados públicos não requerem API key.
                </p>
              </div>

              {[
                { name: 'Polymarket', status: 'Ativo', desc: 'Mercados de previsão descentralizados (Polygon)' },
                { name: 'Kalshi', status: 'Ativo', desc: 'Exchange de contratos de evento regulamentada (EUA)' },
              ].map((market) => (
                <div key={market.name} className="flex items-center justify-between p-4 bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{market.name}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{market.desc}</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-900/30 border border-green-700/40 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    {market.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ─── AI TAB ─── */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              {/* Provider selector */}
              <div className="flex gap-1.5">
                {AI_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProvider(p.id)}
                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                      selectedProvider === p.id
                        ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                        : 'bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {p.label.split(' ')[0]}
                    {aiKeys[p.id] && (
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedProvider === p.id ? 'bg-white/80' : 'bg-green-500'}`} />
                    )}
                  </button>
                ))}
              </div>

              {/* Active provider indicator */}
              {aiKeys.activeProvider && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-xl">
                  <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-[var(--accent)] font-medium">
                    Provedor ativo: {AI_PROVIDERS.find((p) => p.id === aiKeys.activeProvider)?.label}
                  </p>
                </div>
              )}

              {/* Key input */}
              {(() => {
                const provider = AI_PROVIDERS.find((p) => p.id === selectedProvider)!;
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs text-[var(--text-muted)] font-medium">{provider.label} — API Key</label>
                        <a
                          href={provider.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--accent)] hover:underline"
                        >
                          Obter chave →
                        </a>
                      </div>
                      <input
                        type="password"
                        value={aiKeyInput}
                        onChange={(e) => setAiKeyInput(e.target.value)}
                        className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] font-mono"
                        placeholder={provider.placeholder}
                      />
                    </div>

                    <p className="text-xs text-[var(--text-muted)]">
                      Chaves armazenadas localmente no seu navegador. Nunca enviadas para nossos servidores sem seu consentimento explícito.
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveAIKey}
                        disabled={!aiKeyInput.trim()}
                        className="flex-1 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {aiSaved ? '✓ Salvo!' : `Salvar & Ativar ${provider.label.split(' ')[0]}`}
                      </button>
                      {aiKeys[selectedProvider] && (
                        <button
                          onClick={handleRemoveAIKey}
                          className="px-3 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl text-sm font-medium transition-colors border border-red-600/20"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Status of all providers */}
              <div className="border-t border-[var(--border)] pt-3">
                <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">Provedores configurados:</p>
                <div className="space-y-2">
                  {AI_PROVIDERS.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[var(--surface-hover)]">
                      <span className="text-xs text-[var(--text-secondary)]">{p.label}</span>
                      <div className="flex items-center gap-2">
                        {aiKeys.activeProvider === p.id && (
                          <span className="text-xs text-[var(--accent)] font-medium">ativo</span>
                        )}
                        <span className={`w-2 h-2 rounded-full ${aiKeys[p.id] ? 'bg-green-500' : 'bg-gray-600'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

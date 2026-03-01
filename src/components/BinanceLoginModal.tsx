'use client';

import { useState, useEffect } from 'react';
import { useExchange, ExchangeName } from '@/context/ExchangeContext';

type ModalCategory = 'crypto' | 'ai' | 'prediction';
type AIProvider = 'chatgpt' | 'claude' | 'gemini';

const EXCHANGE_OPTIONS: { id: ExchangeName; label: string; color: string }[] = [
  { id: 'binance', label: 'Binance', color: 'yellow' },
  { id: 'coinbase', label: 'Coinbase', color: 'blue' },
];

const AI_PROVIDERS: { id: AIProvider; label: string; color: string; placeholder: string }[] = [
  { id: 'chatgpt', label: 'ChatGPT', color: 'green', placeholder: 'sk-...' },
  { id: 'claude', label: 'Claude', color: 'orange', placeholder: 'sk-ant-...' },
  { id: 'gemini', label: 'Gemini', color: 'blue', placeholder: 'AIza...' },
];

const CATEGORY_TABS: { id: ModalCategory; label: string; icon: string }[] = [
  {
    id: 'prediction',
    label: 'Prediction Market',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    id: 'crypto',
    label: 'Crypto',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    id: 'ai',
    label: 'IA',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2',
  },
];

export default function ExchangeLoginModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { exchanges, connect, disconnect, connectedExchanges } = useExchange();
  const [category, setCategory] = useState<ModalCategory>('crypto');
  const [selectedExchange, setSelectedExchange] = useState<ExchangeName>('binance');
  const [apiKey, setApiKey] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [justConnected, setJustConnected] = useState<ExchangeName | null>(null);

  // AI state
  const [selectedAI, setSelectedAI] = useState<AIProvider>('claude');
  const [aiKey, setAiKey] = useState('');
  const [connectedAIs, setConnectedAIs] = useState<Record<AIProvider, boolean>>({
    chatgpt: false,
    claude: false,
    gemini: false,
  });
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    // Load saved AI keys from localStorage
    const updated: Record<AIProvider, boolean> = { chatgpt: false, claude: false, gemini: false };
    AI_PROVIDERS.forEach((p) => {
      updated[p.id] = !!localStorage.getItem(`ai_key_${p.id}`);
    });
    setConnectedAIs(updated);
    const savedProvider = localStorage.getItem('ai_provider') as AIProvider | null;
    if (savedProvider) setSelectedAI(savedProvider);
  }, [open]);

  if (!open) return null;

  const currentExchange = exchanges[selectedExchange];
  const allConnected = EXCHANGE_OPTIONS.every((ex) => exchanges[ex.id].connected);

  const handleExchangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const success = await connect(selectedExchange, apiKey, secret);
    setSaving(false);
    if (success) {
      setApiKey('');
      setSecret('');
      setJustConnected(selectedExchange);
      const otherExchange = EXCHANGE_OPTIONS.find(
        (ex) => ex.id !== selectedExchange && !exchanges[ex.id].connected
      );
      if (otherExchange) setSelectedExchange(otherExchange.id);
    } else {
      setError(`Falha ao conectar ${selectedExchange}. Verifique suas chaves.`);
    }
  };

  const handleExchangeDisconnect = async () => {
    await disconnect(selectedExchange);
    setJustConnected(null);
  };

  const handleAISave = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiError('');
    if (!aiKey.trim()) {
      setAiError('Insira a API Key');
      return;
    }
    setAiSaving(true);
    // Validate key with a quick test call
    try {
      const res = await fetch('/api/ai-chat/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedAI, apiKey: aiKey.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        setAiError(err.error || 'Chave inválida');
        setAiSaving(false);
        return;
      }
    } catch {
      // If validation endpoint doesn't exist yet, just save
    }
    localStorage.setItem(`ai_key_${selectedAI}`, aiKey.trim());
    localStorage.setItem('ai_provider', selectedAI);
    setConnectedAIs((prev) => ({ ...prev, [selectedAI]: true }));
    setAiKey('');
    setAiSaving(false);
  };

  const handleAIDisconnect = (provider: AIProvider) => {
    localStorage.removeItem(`ai_key_${provider}`);
    if (localStorage.getItem('ai_provider') === provider) {
      localStorage.removeItem('ai_provider');
    }
    setConnectedAIs((prev) => ({ ...prev, [provider]: false }));
  };

  const selectedAIProvider = AI_PROVIDERS.find((p) => p.id === selectedAI)!;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)]/70 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-[var(--text)]">Conectar APIs</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-[var(--text)] text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* Category selector */}
        <div className="flex gap-1.5 mb-5 bg-gray-900/50 rounded-xl p-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setCategory(tab.id);
                setError('');
                setAiError('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-medium text-xs transition-all ${
                category === tab.id
                  ? 'bg-[var(--accent)] text-white shadow-lg'
                  : 'text-gray-400 hover:text-[var(--text)] hover:bg-gray-800/50'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── CRYPTO CATEGORY ── */}
        {category === 'crypto' && (
          <>
            {/* Connection Status */}
            <div className="flex items-center gap-3 mb-5">
              {EXCHANGE_OPTIONS.map((ex) => {
                const isConn = exchanges[ex.id].connected;
                return (
                  <div
                    key={ex.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                      isConn
                        ? 'bg-green-900/30 border-green-700/50 text-green-400'
                        : 'bg-gray-800/50 border-gray-700/50 text-[var(--text-muted)]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isConn ? 'bg-green-500' : 'bg-gray-600'}`} />
                    {ex.label}
                    {isConn && <span className="text-green-600">&#10003;</span>}
                  </div>
                );
              })}
            </div>

            {justConnected && !allConnected && (
              <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 mb-4">
                <p className="text-green-400 text-sm">
                  {justConnected.charAt(0).toUpperCase() + justConnected.slice(1)} conectado! Conecte outra exchange para consolidar seu portfólio.
                </p>
              </div>
            )}

            {/* Exchange Tabs */}
            <div className="flex gap-2 mb-5">
              {EXCHANGE_OPTIONS.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => {
                    setSelectedExchange(ex.id);
                    setError('');
                    setJustConnected(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    selectedExchange === ex.id
                      ? ex.color === 'yellow'
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                        : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-gray-800 text-gray-400 hover:text-[var(--text)] hover:bg-gray-700'
                  }`}
                >
                  {ex.label}
                  {exchanges[ex.id].connected && (
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {currentExchange.connected ? (
              <div className="space-y-4">
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                  <p className="text-green-400 font-medium">
                    {selectedExchange.charAt(0).toUpperCase() + selectedExchange.slice(1)} Conectado
                  </p>
                  <p className="text-gray-400 text-sm mt-1">API Key: {currentExchange.apiKeyPreview}</p>
                </div>
                <button
                  onClick={handleExchangeDisconnect}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Desconectar {selectedExchange.charAt(0).toUpperCase() + selectedExchange.slice(1)}
                </button>
              </div>
            ) : (
              <form onSubmit={handleExchangeSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">API Key</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-[var(--text)] placeholder-gray-500 focus:outline-none focus:border-[var(--accent)]"
                    placeholder={`API Key do ${selectedExchange}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Secret Key</label>
                  <input
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-[var(--text)] placeholder-gray-500 focus:outline-none focus:border-[var(--accent)]"
                    placeholder={`Secret Key do ${selectedExchange}`}
                    required
                  />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <p className="text-[var(--text-muted)] text-xs">
                  Chaves armazenadas em cookies httpOnly. Use chaves somente-leitura.
                </p>
                <button
                  type="submit"
                  disabled={saving}
                  className={`w-full py-3 font-bold rounded-lg transition-colors disabled:opacity-50 ${
                    selectedExchange === 'coinbase'
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                  }`}
                >
                  {saving ? 'Conectando...' : `Conectar ${selectedExchange.charAt(0).toUpperCase() + selectedExchange.slice(1)}`}
                </button>
              </form>
            )}

            {connectedExchanges.length > 0 && (
              <button
                onClick={onClose}
                className="w-full mt-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium text-sm transition-colors border border-gray-700"
              >
                {allConnected ? 'Concluído' : 'Concluído (conectar mais depois)'}
              </button>
            )}
          </>
        )}

        {/* ── AI CATEGORY ── */}
        {category === 'ai' && (
          <>
            {/* AI Provider Status */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              {AI_PROVIDERS.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                    connectedAIs[p.id]
                      ? 'bg-green-900/30 border-green-700/50 text-green-400'
                      : 'bg-gray-800/50 border-gray-700/50 text-[var(--text-muted)]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${connectedAIs[p.id] ? 'bg-green-500' : 'bg-gray-600'}`} />
                  {p.label}
                </div>
              ))}
            </div>

            {/* AI Provider Tabs */}
            <div className="flex gap-2 mb-5">
              {AI_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedAI(p.id);
                    setAiKey('');
                    setAiError('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl font-medium text-sm transition-all ${
                    selectedAI === p.id
                      ? p.id === 'chatgpt'
                        ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                        : p.id === 'claude'
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-gray-800 text-gray-400 hover:text-[var(--text)] hover:bg-gray-700'
                  }`}
                >
                  {p.label}
                  {connectedAIs[p.id] && <span className="w-2 h-2 bg-green-400 rounded-full" />}
                </button>
              ))}
            </div>

            {connectedAIs[selectedAI] ? (
              <div className="space-y-4">
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                  <p className="text-green-400 font-medium">{selectedAIProvider.label} Conectado</p>
                  <p className="text-gray-400 text-sm mt-1">
                    API Key salva localmente
                  </p>
                  {localStorage.getItem('ai_provider') === selectedAI && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded">
                      ✦ Provedor ativo no Chat IA
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem('ai_provider', selectedAI);
                  }}
                  className="w-full py-2.5 bg-[var(--accent)]/20 hover:bg-[var(--accent)]/30 text-[var(--accent)] rounded-lg font-medium text-sm transition-colors border border-[var(--accent)]/30"
                >
                  Usar {selectedAIProvider.label} como padrão
                </button>
                <button
                  onClick={() => handleAIDisconnect(selectedAI)}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Remover chave do {selectedAIProvider.label}
                </button>
              </div>
            ) : (
              <form onSubmit={handleAISave} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    API Key — {selectedAIProvider.label}
                  </label>
                  <input
                    type="password"
                    value={aiKey}
                    onChange={(e) => setAiKey(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-[var(--text)] placeholder-gray-500 focus:outline-none focus:border-[var(--accent)] font-mono text-sm"
                    placeholder={selectedAIProvider.placeholder}
                    required
                  />
                </div>
                {aiError && <p className="text-red-400 text-sm">{aiError}</p>}
                <p className="text-[var(--text-muted)] text-xs">
                  A chave é armazenada apenas no seu navegador (localStorage) e usada para o Chat IA nas páginas de ativos.
                </p>
                <button
                  type="submit"
                  disabled={aiSaving}
                  className={`w-full py-3 font-bold rounded-lg transition-colors disabled:opacity-50 text-white ${
                    selectedAI === 'chatgpt'
                      ? 'bg-green-600 hover:bg-green-700'
                      : selectedAI === 'claude'
                      ? 'bg-orange-500 hover:bg-orange-600'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {aiSaving ? 'Salvando...' : `Conectar ${selectedAIProvider.label}`}
                </button>
              </form>
            )}
          </>
        )}

        {/* ── PREDICTION MARKET CATEGORY ── */}
        {category === 'prediction' && (
          <div className="space-y-4">
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-[var(--text)] text-sm">Polymarket</p>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">Mercados de predição descentralizados na Polygon</p>
                </div>
                <span className="ml-auto text-xs text-green-400 bg-green-900/30 border border-green-700/30 px-2 py-0.5 rounded font-medium">
                  Ativo
                </span>
              </div>
              <p className="text-[var(--text-muted)] text-xs">
                Dados de Polymarket são exibidos automaticamente sem necessidade de API Key.
              </p>
            </div>

            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-[var(--text)] text-sm">Kalshi</p>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">Exchange regulamentada de contratos de eventos</p>
                </div>
                <span className="ml-auto text-xs text-green-400 bg-green-900/30 border border-green-700/30 px-2 py-0.5 rounded font-medium">
                  Ativo
                </span>
              </div>
              <p className="text-[var(--text-muted)] text-xs">
                Dados de Kalshi são exibidos automaticamente sem necessidade de API Key.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium text-sm transition-colors border border-gray-700"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

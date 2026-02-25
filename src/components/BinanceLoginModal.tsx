'use client';

import { useState } from 'react';
import { useExchange, ExchangeName } from '@/context/ExchangeContext';

interface ExchangeOption {
  id: ExchangeName;
  label: string;
  color: string;
  category: 'exchange' | 'prediction';
  fields: ('apiKey' | 'secret')[];
  keyLabel: string;
  secretLabel: string;
  placeholder: string;
  secretPlaceholder: string;
}

const EXCHANGE_OPTIONS: ExchangeOption[] = [
  {
    id: 'binance',
    label: 'Binance',
    color: 'yellow',
    category: 'exchange',
    fields: ['apiKey', 'secret'],
    keyLabel: 'API Key',
    secretLabel: 'Secret Key',
    placeholder: 'Enter your Binance API Key',
    secretPlaceholder: 'Enter your Binance Secret Key',
  },
  {
    id: 'coinbase',
    label: 'Coinbase',
    color: 'blue',
    category: 'exchange',
    fields: ['apiKey', 'secret'],
    keyLabel: 'API Key',
    secretLabel: 'Secret Key',
    placeholder: 'Enter your Coinbase API Key',
    secretPlaceholder: 'Enter your Coinbase Secret Key',
  },
  {
    id: 'kalshi',
    label: 'Kalshi',
    color: 'green',
    category: 'prediction',
    fields: ['apiKey', 'secret'],
    keyLabel: 'API Key ID',
    secretLabel: 'Private Key',
    placeholder: 'Enter your Kalshi API Key ID',
    secretPlaceholder: 'Enter your Kalshi Private Key',
  },
  {
    id: 'polymarket',
    label: 'Polymarket',
    color: 'purple',
    category: 'prediction',
    fields: ['apiKey'],
    keyLabel: 'API Key',
    secretLabel: '',
    placeholder: 'Enter your Polymarket CLOB API Key',
    secretPlaceholder: '',
  },
];

const COLOR_MAP: Record<string, { active: string; hover: string }> = {
  yellow: { active: 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20', hover: 'hover:bg-yellow-500/20' },
  blue: { active: 'bg-blue-500 text-white shadow-lg shadow-blue-500/20', hover: 'hover:bg-blue-500/20' },
  green: { active: 'bg-green-500 text-white shadow-lg shadow-green-500/20', hover: 'hover:bg-green-500/20' },
  purple: { active: 'bg-purple-500 text-white shadow-lg shadow-purple-500/20', hover: 'hover:bg-purple-500/20' },
};

export default function ExchangeLoginModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { exchanges, connect, disconnect, connectedExchanges } = useExchange();
  const [selectedExchange, setSelectedExchange] = useState<ExchangeName>('binance');
  const [apiKey, setApiKey] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [justConnected, setJustConnected] = useState<ExchangeName | null>(null);

  if (!open) return null;

  const currentOption = EXCHANGE_OPTIONS.find((ex) => ex.id === selectedExchange)!;
  const currentExchange = exchanges[selectedExchange];
  const allConnected = EXCHANGE_OPTIONS.every((ex) => exchanges[ex.id].connected);
  const exchangeGroup = EXCHANGE_OPTIONS.filter((ex) => ex.category === 'exchange');
  const predictionGroup = EXCHANGE_OPTIONS.filter((ex) => ex.category === 'prediction');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const needsSecret = currentOption.fields.includes('secret');
    const success = await connect(selectedExchange, apiKey, needsSecret ? secret : undefined);
    setSaving(false);
    if (success) {
      setApiKey('');
      setSecret('');
      setJustConnected(selectedExchange);
      const nextExchange = EXCHANGE_OPTIONS.find(
        (ex) => ex.id !== selectedExchange && !exchanges[ex.id].connected
      );
      if (nextExchange) {
        setSelectedExchange(nextExchange.id);
      }
    } else {
      setError(`Failed to connect to ${currentOption.label}. Please check your credentials.`);
    }
  };

  const handleDisconnect = async () => {
    await disconnect(selectedExchange);
    setJustConnected(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)]/70 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-gray-700 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[var(--text)]">Connect Services</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-[var(--text)] text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* Connection Status Summary */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
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

        {/* Just connected notice */}
        {justConnected && !allConnected && (
          <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 mb-4">
            <p className="text-green-400 text-sm">
              {EXCHANGE_OPTIONS.find((ex) => ex.id === justConnected)?.label} connected! You can now connect another service.
            </p>
          </div>
        )}

        {/* Exchanges Group */}
        <div className="mb-3">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Crypto Exchanges</p>
          <div className="flex gap-2">
            {exchangeGroup.map((ex) => {
              const colors = COLOR_MAP[ex.color];
              return (
                <button
                  key={ex.id}
                  onClick={() => {
                    setSelectedExchange(ex.id);
                    setError('');
                    setJustConnected(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    selectedExchange === ex.id
                      ? colors.active
                      : `bg-gray-800 text-gray-400 hover:text-[var(--text)] hover:bg-gray-700`
                  }`}
                >
                  {ex.label}
                  {exchanges[ex.id].connected && (
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prediction Markets Group */}
        <div className="mb-5">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Prediction Markets</p>
          <div className="flex gap-2">
            {predictionGroup.map((ex) => {
              const colors = COLOR_MAP[ex.color];
              return (
                <button
                  key={ex.id}
                  onClick={() => {
                    setSelectedExchange(ex.id);
                    setError('');
                    setJustConnected(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    selectedExchange === ex.id
                      ? colors.active
                      : `bg-gray-800 text-gray-400 hover:text-[var(--text)] hover:bg-gray-700`
                  }`}
                >
                  {ex.label}
                  {exchanges[ex.id].connected && (
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current exchange state */}
        {currentExchange.connected ? (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
              <p className="text-green-400 font-medium">
                {currentOption.label} Connected
              </p>
              <p className="text-gray-400 text-sm mt-1">API Key: {currentExchange.apiKeyPreview}</p>
            </div>
            <button
              onClick={handleDisconnect}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-[var(--text)] rounded-lg font-medium transition-colors"
            >
              Disconnect {currentOption.label}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{currentOption.keyLabel}</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-[var(--text)] placeholder-gray-500 focus:outline-none focus:border-[var(--accent)]"
                placeholder={currentOption.placeholder}
                required
              />
            </div>
            {currentOption.fields.includes('secret') && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">{currentOption.secretLabel}</label>
                <input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-[var(--text)] placeholder-gray-500 focus:outline-none focus:border-[var(--accent)]"
                  placeholder={currentOption.secretPlaceholder}
                  required
                />
              </div>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <p className="text-[var(--text-muted)] text-xs">
              Keys are stored in httpOnly cookies. Use read-only API keys for safety.
            </p>
            <button
              type="submit"
              disabled={saving}
              className={`w-full py-3 font-bold rounded-lg transition-colors disabled:opacity-50 ${COLOR_MAP[currentOption.color].active}`}
            >
              {saving
                ? 'Connecting...'
                : `Connect ${currentOption.label}`}
            </button>
          </form>
        )}

        {/* Done button when at least one connected */}
        {connectedExchanges.length > 0 && (
          <button
            onClick={onClose}
            className="w-full mt-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium text-sm transition-colors border border-gray-700"
          >
            {allConnected ? 'Done' : 'Done (connect more later)'}
          </button>
        )}
      </div>
    </div>
  );
}

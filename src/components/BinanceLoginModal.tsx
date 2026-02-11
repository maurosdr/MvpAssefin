'use client';

import { useState } from 'react';
import { useExchange, ExchangeName } from '@/context/ExchangeContext';

const EXCHANGE_OPTIONS: { id: ExchangeName; label: string; color: string }[] = [
  { id: 'binance', label: 'Binance', color: 'yellow' },
  { id: 'coinbase', label: 'Coinbase', color: 'blue' },
];

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

  const currentExchange = exchanges[selectedExchange];
  const allConnected = EXCHANGE_OPTIONS.every((ex) => exchanges[ex.id].connected);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const success = await connect(selectedExchange, apiKey, secret);
    setSaving(false);
    if (success) {
      setApiKey('');
      setSecret('');
      setJustConnected(selectedExchange);
      // Auto-switch to the other exchange if not connected
      const otherExchange = EXCHANGE_OPTIONS.find(
        (ex) => ex.id !== selectedExchange && !exchanges[ex.id].connected
      );
      if (otherExchange) {
        setSelectedExchange(otherExchange.id);
      }
    } else {
      setError(`Failed to connect to ${selectedExchange}. Please check your API keys.`);
    }
  };

  const handleDisconnect = async () => {
    await disconnect(selectedExchange);
    setJustConnected(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Connect Exchanges</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* Connection Status Summary */}
        <div className="flex items-center gap-3 mb-5">
          {EXCHANGE_OPTIONS.map((ex) => {
            const isConn = exchanges[ex.id].connected;
            return (
              <div
                key={ex.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                  isConn
                    ? 'bg-green-900/30 border-green-700/50 text-green-400'
                    : 'bg-gray-800/50 border-gray-700/50 text-gray-500'
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
              {justConnected.charAt(0).toUpperCase() + justConnected.slice(1)} connected! You can now connect another exchange to consolidate your book.
            </p>
          </div>
        )}

        {/* Exchange Selector Tabs */}
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
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {ex.label}
              {exchanges[ex.id].connected && (
                <span className="w-2 h-2 bg-green-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Current exchange state */}
        {currentExchange.connected ? (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
              <p className="text-green-400 font-medium">
                {selectedExchange.charAt(0).toUpperCase() + selectedExchange.slice(1)} Connected
              </p>
              <p className="text-gray-400 text-sm mt-1">API Key: {currentExchange.apiKeyPreview}</p>
            </div>
            <button
              onClick={handleDisconnect}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Disconnect {selectedExchange.charAt(0).toUpperCase() + selectedExchange.slice(1)}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                placeholder={`Enter your ${selectedExchange} API Key`}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Secret Key</label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                placeholder={`Enter your ${selectedExchange} Secret Key`}
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <p className="text-gray-500 text-xs">
              Keys are stored in httpOnly cookies. Use read-only API keys for safety.
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
              {saving
                ? 'Connecting...'
                : `Connect ${selectedExchange.charAt(0).toUpperCase() + selectedExchange.slice(1)}`}
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

'use client';

import { useState } from 'react';
import { useExchange, ExchangeName } from '@/context/ExchangeContext';

const EXCHANGE_OPTIONS: { id: ExchangeName; label: string; icon: JSX.Element }[] = [
  {
    id: 'binance',
    label: 'Binance',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L6.5 7.5 12 13l5.5-5.5L12 2zm0 22l5.5-5.5L12 13l-5.5 5.5L12 24zm-10-10l5.5 5.5L13 12 7.5 6.5 2 12zm20 0l-5.5-5.5L11 12l5.5 5.5L22 12z" />
      </svg>
    ),
  },
  {
    id: 'coinbase',
    label: 'Coinbase',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
      </svg>
    ),
  },
];

export default function ExchangeLoginModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { exchanges, connect, disconnect } = useExchange();
  const [selectedExchange, setSelectedExchange] = useState<ExchangeName>('binance');
  const [apiKey, setApiKey] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const currentExchange = exchanges[selectedExchange];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const success = await connect(selectedExchange, apiKey, secret);
    setSaving(false);
    if (success) {
      setApiKey('');
      setSecret('');
      onClose();
    } else {
      setError(`Failed to connect to ${selectedExchange}. Please check your API keys.`);
    }
  };

  const handleDisconnect = async () => {
    await disconnect(selectedExchange);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Exchange API</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            &times;
          </button>
        </div>

        {/* Exchange Selector */}
        <div className="flex gap-2 mb-6">
          {EXCHANGE_OPTIONS.map((ex) => (
            <button
              key={ex.id}
              onClick={() => {
                setSelectedExchange(ex.id);
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                selectedExchange === ex.id
                  ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {ex.icon}
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
              Your keys are stored securely in an httpOnly cookie. Use read-only API keys for safety.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {saving
                ? 'Connecting...'
                : `Connect to ${selectedExchange.charAt(0).toUpperCase() + selectedExchange.slice(1)}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

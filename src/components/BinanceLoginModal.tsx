'use client';

import { useState } from 'react';
import { useBinance } from '@/context/BinanceContext';

export default function BinanceLoginModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { connect, connected, disconnect, apiKeyPreview } = useBinance();
  const [apiKey, setApiKey] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const success = await connect(apiKey, secret);
    setSaving(false);
    if (success) {
      setApiKey('');
      setSecret('');
      onClose();
    } else {
      setError('Failed to save API keys. Please check and try again.');
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L6.5 7.5 12 13l5.5-5.5L12 2zm0 22l5.5-5.5L12 13l-5.5 5.5L12 24zm-10-10l5.5 5.5L13 12 7.5 6.5 2 12zm20 0l-5.5-5.5L11 12l5.5 5.5L22 12z" />
            </svg>
            Binance API
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            &times;
          </button>
        </div>

        {connected ? (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
              <p className="text-green-400 font-medium">Connected</p>
              <p className="text-gray-400 text-sm mt-1">API Key: {apiKeyPreview}</p>
            </div>
            <button
              onClick={handleDisconnect}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Disconnect
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
                placeholder="Enter your Binance API Key"
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
                placeholder="Enter your Binance Secret Key"
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
              {saving ? 'Saving...' : 'Connect to Binance'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

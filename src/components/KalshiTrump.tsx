'use client';

import { useEffect, useState } from 'react';

interface KalshiEvent {
  title: string;
  yes_price: number;
  no_price: number;
  volume: number;
}

export default function KalshiTrump() {
  const [events, setEvents] = useState<KalshiEvent[]>([]);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/kalshi')
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events || []);
        setSource(data.source || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">What Will Trump Say?</h2>
            <p className="text-gray-500 text-sm mt-1">
              Prediction market probabilities via{' '}
              <a
                href="https://kalshi.com/markets/kxtrumpmention/what-will-trump-say/kxtrumpmention-26jan28"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-500 hover:text-yellow-400"
              >
                Kalshi
              </a>
            </p>
          </div>
          {source === 'cache' && (
            <span className="text-xs bg-gray-800 text-gray-500 px-2 py-1 rounded">Cached</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3">Event</th>
                <th className="text-right px-6 py-3">Yes %</th>
                <th className="text-right px-6 py-3">No %</th>
                <th className="text-right px-6 py-3">Volume</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => (
                <tr key={i} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-6 py-3 text-white text-sm">{event.title}</td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-green-400 font-mono font-medium">
                      {(event.yes_price * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-red-400 font-mono font-medium">
                      {(event.no_price * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-400 font-mono text-sm">
                    {event.volume.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

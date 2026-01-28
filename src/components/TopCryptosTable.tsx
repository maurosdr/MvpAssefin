'use client';

import { useRouter } from 'next/navigation';
import { getCryptoName } from '@/lib/crypto-names';

interface CryptoRow {
  symbol: string;
  base: string;
  price: number;
  coinbasePrice?: number | null;
  changePercent24h: number;
  volume24h: number;
}

export default function TopCryptosTable({ data }: { data: CryptoRow[] }) {
  const router = useRouter();
  const top10 = data.slice(0, 10);

  const formatPrice = (p: number) => {
    if (p >= 1) return '$' + p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return '$' + p.toFixed(6);
  };

  const formatVolume = (v: number) => {
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(2) + 'K';
    return '$' + v.toFixed(2);
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <h2 className="text-lg font-bold text-white">Top 10 Cryptos by Volume</h2>
        <p className="text-gray-500 text-sm mt-1">Live data from Binance & Coinbase via CCXT</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-gray-400 text-xs uppercase tracking-wider">
              <th className="text-left px-6 py-3">#</th>
              <th className="text-left px-6 py-3">Name</th>
              <th className="text-right px-6 py-3">Binance Price</th>
              <th className="text-right px-6 py-3">Coinbase Price</th>
              <th className="text-right px-6 py-3">24h Change</th>
              <th className="text-right px-6 py-3">Volume (24h)</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((crypto, i) => (
              <tr
                key={crypto.symbol}
                onClick={() => router.push(`/crypto/${crypto.base}`)}
                className="border-t border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                <td className="px-6 py-4">
                  <div>
                    <span className="text-white font-medium">{crypto.base}</span>
                    <span className="text-gray-500 ml-2 text-sm">{getCryptoName(crypto.base)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-white font-mono">
                  {formatPrice(crypto.price)}
                </td>
                <td className="px-6 py-4 text-right text-gray-400 font-mono">
                  {crypto.coinbasePrice ? formatPrice(crypto.coinbasePrice) : '—'}
                </td>
                <td
                  className={`px-6 py-4 text-right font-mono font-medium ${
                    crypto.changePercent24h >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {crypto.changePercent24h >= 0 ? '+' : ''}
                  {crypto.changePercent24h.toFixed(2)}%
                </td>
                <td className="px-6 py-4 text-right text-gray-300 font-mono">
                  {formatVolume(crypto.volume24h)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

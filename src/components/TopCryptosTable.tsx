'use client'

import { useRouter } from 'next/navigation'
import { getCryptoName } from '@/lib/crypto-names'

interface CryptoRow {
  symbol: string
  base: string
  price: number
  coinbasePrice?: number | null
  changePercent24h: number
  volume24h: number
}

export default function TopCryptosTable({ data }: { data: CryptoRow[] }) {
  const router = useRouter()
  const top10 = data.slice(0, 10)

  const formatPrice = (p: number) =>
    p >= 1 ? `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${p.toFixed(6)}`

  const totalVolume = data.reduce((sum, c) => sum + c.volume24h, 0)
  const marketCap = data.reduce((sum, c) => sum + (c.price * 1000000), 0) // Simplified

  return (
    <div className="modern-card h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-1 h-8 bg-gradient-to-b from-[var(--accent)] to-[var(--accent-strong)] rounded-full" />
            <div className="absolute top-0 left-0 w-1 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="section-title text-[var(--accent)] mb-1 flex items-center gap-2">
              <span>LIVE MARKET FEED</span>
              <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" />
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="data-value text-[var(--text-secondary)]">
                VOL: <span className="text-[var(--text-primary)] font-bold">${(totalVolume / 1e9).toFixed(1)}B</span>
              </span>
              <span className="text-[var(--border-strong)]">|</span>
              <span className="data-value text-[var(--text-secondary)]">
                MKT CAP: <span className="text-[var(--text-primary)] font-bold">${(marketCap / 1e12).toFixed(1)}T</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--success-soft)] to-[var(--success-soft)]/50 border border-[var(--success)]/30 rounded-lg shadow-sm">
          <span className="relative">
            <span className="w-2 h-2 bg-[var(--success)] rounded-full animate-pulse" />
            <span className="absolute inset-0 w-2 h-2 bg-[var(--success)] rounded-full animate-ping opacity-75" />
          </span>
          <span className="text-xs font-bold text-[var(--success)] uppercase tracking-wider">LIVE</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)] border-b-2 border-[var(--border)]">
              <th className="pb-4 text-left">ASSET</th>
              <th className="pb-4 text-right">PRICE</th>
              <th className="pb-4 text-right">24H</th>
              <th className="pb-4 text-right">TREND</th>
              <th className="pb-4 text-right">VOLUME</th>
              <th className="pb-4 text-right w-20"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-subtle)]">
            {top10.map((c, idx) => {
              const isPositive = c.changePercent24h >= 0
              return (
                <tr
                  key={c.symbol}
                  onClick={() => router.push(`/crypto/${c.base}`)}
                  className="group hover:bg-[var(--surface-hover)] transition-all cursor-pointer relative"
                >
                  {/* Row number indicator */}
                  <td className="py-4 w-8">
                    <div className="flex items-center justify-center">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] opacity-50">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                  </td>

                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isPositive ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'} opacity-60`} />
                      <div className="flex flex-col">
                        <p className="font-bold text-base text-[var(--text-primary)] leading-tight">{c.base}</p>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold mt-0.5 tracking-wider">
                          {getCryptoName(c.base)}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 text-right">
                    <span className="data-value text-base font-bold text-[var(--text-primary)]">
                      {formatPrice(c.price)}
                    </span>
                  </td>

                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`text-lg ${isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {isPositive ? '▲' : '▼'}
                      </span>
                      <span
                        className={`data-value text-sm font-bold ${
                          isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {c.changePercent24h.toFixed(2)}%
                      </span>
                    </div>
                  </td>

                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-2 bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                        <div
                          className={`h-full transition-all ${
                            isPositive 
                              ? 'bg-gradient-to-r from-[var(--success)] to-[var(--success)]/80' 
                              : 'bg-gradient-to-r from-[var(--danger)] to-[var(--danger)]/80'
                          }`}
                          style={{ width: `${Math.min(Math.abs(c.changePercent24h) * 3, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-4 text-right">
                    <span className="data-value text-xs text-[var(--text-secondary)] font-medium">
                      ${(c.volume24h / 1e6).toFixed(1)}M
                    </span>
                  </td>

                  <td className="py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/crypto/${c.base}`)
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-[var(--accent-soft)] to-[var(--accent-soft)]/80 hover:from-[var(--accent)] hover:to-[var(--accent-strong)] text-[var(--accent)] hover:text-[var(--text-inverse)] rounded-lg text-xs font-bold uppercase tracking-wider transition-all opacity-0 group-hover:opacity-100 shadow-sm hover:shadow-md"
                    >
                      TRADE
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

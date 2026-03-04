'use client';

import { useState } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { MAIN_STOCKS, MAIN_ETFS, STOCK_NAMES } from '@/lib/stocks-data';
import { AssetCategory } from '@/types/portfolio';

const BDRS = [
  'ROXO34', 'M1TA34', 'AAPL34', 'AMZO34', 'GOGL34',
  'MSFT34', 'TSLA34', 'NVDC34', 'NFLX34', 'DISB34',
];

type TabType = 'stocks' | 'etfs' | 'bdrs' | 'prediction';

export default function AddPositionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addPosition } = usePortfolio();
  const [tab, setTab] = useState<TabType>('stocks');
  const [search, setSearch] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Prediction market fields
  const [marketName, setMarketName] = useState('');
  const [side, setSide] = useState<'YES' | 'NO'>('YES');

  if (!open) return null;

  const tabConfig: { id: TabType; label: string; symbols: string[]; category: AssetCategory }[] = [
    { id: 'stocks', label: 'Ações', symbols: MAIN_STOCKS, category: 'stock' },
    { id: 'etfs', label: 'ETFs', symbols: MAIN_ETFS, category: 'etf' },
    { id: 'bdrs', label: 'BDRs', symbols: BDRS, category: 'bdr' },
    { id: 'prediction', label: 'Pred. Markets', symbols: [], category: 'prediction' },
  ];

  const currentTab = tabConfig.find((t) => t.id === tab)!;

  const filteredSymbols = currentTab.symbols.filter((s) => {
    const q = search.toUpperCase();
    const name = STOCK_NAMES[s] || '';
    return s.includes(q) || name.toUpperCase().includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (tab === 'prediction') {
        if (!marketName || !entryPrice || !quantity) {
          setError('Preencha todos os campos.');
          setSaving(false);
          return;
        }

        addPosition({
          type: 'prediction',
          symbol: side,
          name: marketName,
          entryDate,
          entryPrice: parseFloat(entryPrice),
          quantity: parseFloat(quantity),
          side,
          market: marketName,
        });
      } else {
        if (!selectedSymbol || !entryPrice || !quantity) {
          setError('Preencha todos os campos.');
          setSaving(false);
          return;
        }

        // Fetch current price
        let currentPrice: number | undefined;
        try {
          const res = await fetch(
            `/api/stocks/quote?symbol=${selectedSymbol}&range=1d&interval=1d`
          );
          if (res.ok) {
            const data = await res.json();
            currentPrice = data.currentPrice;
          }
        } catch {
          // Current price fetch failed, continue without it
        }

        addPosition({
          type: currentTab.category,
          symbol: selectedSymbol,
          name: STOCK_NAMES[selectedSymbol] || selectedSymbol,
          entryDate,
          entryPrice: parseFloat(entryPrice),
          quantity: parseFloat(quantity),
          currentPrice,
        });
      }

      // Reset form
      setSelectedSymbol('');
      setQuantity('');
      setEntryPrice('');
      setMarketName('');
      setSearch('');
      onClose();
    } catch {
      setError('Erro ao adicionar posição.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)]/70 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-gray-700 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[var(--text)]">Adicionar Posição</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-[var(--text)] text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-800/50 rounded-lg p-1">
          {tabConfig.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSearch('');
                setSelectedSymbol('');
                setError('');
              }}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                tab === t.id
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow'
                  : 'text-gray-400 hover:text-[var(--text)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'prediction' ? (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome do Mercado</label>
                <input
                  type="text"
                  value={marketName}
                  onChange={(e) => setMarketName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-[var(--text)] placeholder-gray-500 focus:outline-none focus:border-[var(--accent)]"
                  placeholder="Ex: Bitcoin above $150k by 2026"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Lado</label>
                <div className="flex gap-2">
                  {(['YES', 'NO'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSide(s)}
                      className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        side === s
                          ? s === 'YES'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                          : 'bg-gray-800 text-gray-400 border border-gray-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Symbol Search */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Ativo</label>
                <input
                  type="text"
                  value={selectedSymbol || search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedSymbol('');
                  }}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-[var(--text)] placeholder-gray-500 focus:outline-none focus:border-[var(--accent)]"
                  placeholder="Buscar por código ou nome..."
                  required
                />
                {search && !selectedSymbol && filteredSymbols.length > 0 && (
                  <div className="mt-1 bg-gray-800 border border-gray-600 rounded-lg max-h-40 overflow-y-auto">
                    {filteredSymbols.slice(0, 10).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setSelectedSymbol(s);
                          setSearch('');
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm transition-colors"
                      >
                        <span className="font-medium text-[var(--text)]">{s}</span>
                        <span className="text-gray-400 ml-2">{STOCK_NAMES[s] || ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Common fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {tab === 'prediction' ? 'Preço (centavos)' : 'Preço de Entrada (R$)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-[var(--text)] placeholder-gray-500 focus:outline-none focus:border-[var(--accent)]"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {tab === 'prediction' ? 'Contratos' : 'Quantidade'}
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-[var(--text)] placeholder-gray-500 focus:outline-none focus:border-[var(--accent)]"
                placeholder="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Data de Entrada</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Adicionando...' : 'Adicionar Posição'}
          </button>
        </form>
      </div>
    </div>
  );
}

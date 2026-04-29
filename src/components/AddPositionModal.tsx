'use client';

import { useState } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { useTrades } from '@/context/TradesContext';
import { MAIN_STOCKS, MAIN_ETFS, STOCK_NAMES } from '@/lib/stocks-data';
import { AssetCategory } from '@/types/portfolio';

const BDRS = [
  'ROXO34', 'M1TA34', 'AAPL34', 'AMZO34', 'GOGL34',
  'MSFT34', 'TSLA34', 'NVDC34', 'NFLX34', 'DISB34',
  'VISA34', 'JPMC34', 'BERK34', 'JNJB34', 'WEGE34',
];

type TabType = 'assets' | 'prediction';

const ETF_SET = new Set(MAIN_ETFS);
const BDR_SET = new Set(BDRS);
const ALL_SYMBOLS = [...MAIN_STOCKS, ...MAIN_ETFS, ...BDRS];

function getCategoryForSymbol(symbol: string): AssetCategory {
  if (ETF_SET.has(symbol)) return 'etf';
  if (BDR_SET.has(symbol)) return 'bdr';
  return 'stock';
}

export default function AddPositionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addPosition } = usePortfolio();
  const { addTrade } = useTrades();

  const [tab, setTab] = useState<TabType>('assets');
  const [operation, setOperation] = useState<'buy' | 'sell'>('buy');
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

  const filteredSymbols = ALL_SYMBOLS.filter((s) => {
    const q = search.toUpperCase();
    if (!q) return false;
    const name = STOCK_NAMES[s] || '';
    return s.includes(q) || name.toUpperCase().includes(q);
  });

  const resetForm = () => {
    setSelectedSymbol('');
    setQuantity('');
    setEntryPrice('');
    setMarketName('');
    setSearch('');
    setError('');
  };

  const qty = parseFloat(quantity);
  const px = parseFloat(entryPrice);
  const total = (qty || 0) * (px || 0);

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

        // Register trade
        addTrade({
          type: 'prediction',
          symbol: side,
          name: marketName,
          operation,
          date: entryDate,
          quantity: parseFloat(quantity),
          price: parseFloat(entryPrice),
          total: parseFloat(quantity) * parseFloat(entryPrice),
        });

        // Only add position on buy
        if (operation === 'buy') {
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
        }
      } else {
        if (!selectedSymbol || !entryPrice || !quantity) {
          setError('Selecione um ativo e preencha todos os campos.');
          setSaving(false);
          return;
        }

        const assetType = getCategoryForSymbol(selectedSymbol);
        const assetName = STOCK_NAMES[selectedSymbol] || selectedSymbol;

        // Register trade always
        addTrade({
          type: assetType,
          symbol: selectedSymbol,
          name: assetName,
          operation,
          date: entryDate,
          quantity: parseFloat(quantity),
          price: parseFloat(entryPrice),
          total: parseFloat(quantity) * parseFloat(entryPrice),
        });

        // Only add position on buy
        if (operation === 'buy') {
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
            // proceed without current price
          }

          addPosition({
            type: assetType,
            symbol: selectedSymbol,
            name: assetName,
            entryDate,
            entryPrice: parseFloat(entryPrice),
            quantity: parseFloat(quantity),
            currentPrice,
          });
        }
      }

      resetForm();
      onClose();
    } catch {
      setError('Erro ao registrar operação.');
    } finally {
      setSaving(false);
    }
  };

  const isBuy = operation === 'buy';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)]/70 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-gray-700 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[var(--text)]">
            {isBuy ? 'Adicionar Posição' : 'Registrar Venda'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-[var(--text)] text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Buy / Sell toggle */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {(['buy', 'sell'] as const).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => { setOperation(op); setError(''); }}
              className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
                operation === op
                  ? op === 'buy'
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                    : 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                  : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-[var(--text)]'
              }`}
            >
              {op === 'buy' ? '↑ Compra' : '↓ Venda'}
            </button>
          ))}
        </div>

        {/* Asset type tabs */}
        <div className="flex gap-1 mb-5 bg-gray-800/50 rounded-lg p-1">
          {([
            { id: 'assets' as TabType, label: 'Ativos' },
            { id: 'prediction' as TabType, label: 'Prediction Markets' },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                resetForm();
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
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ativo</label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedSymbol || search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedSymbol('');
                  }}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-[var(--text)] placeholder-gray-500 focus:outline-none focus:border-[var(--accent)]"
                  placeholder="Buscar ação, ETF ou BDR..."
                  autoComplete="off"
                  required
                />
                {selectedSymbol && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] bg-gray-700 px-2 py-0.5 rounded">
                    {getCategoryForSymbol(selectedSymbol).toUpperCase()}
                  </span>
                )}
              </div>
              {search && !selectedSymbol && filteredSymbols.length > 0 && (
                <div className="mt-1 bg-gray-800 border border-gray-600 rounded-lg max-h-44 overflow-y-auto z-10 relative">
                  {filteredSymbols.slice(0, 12).map((s) => {
                    const cat = getCategoryForSymbol(s);
                    const catColors: Record<string, string> = {
                      etf: 'text-blue-400',
                      bdr: 'text-purple-400',
                      stock: 'text-green-400',
                    };
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setSelectedSymbol(s);
                          setSearch('');
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-700 text-sm transition-colors flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-[var(--text)]">{s}</span>
                          <span className="text-gray-400 ml-2 text-xs">{STOCK_NAMES[s] || ''}</span>
                        </div>
                        <span className={`text-xs font-medium ${catColors[cat] || 'text-gray-400'}`}>
                          {cat.toUpperCase()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {search && !selectedSymbol && filteredSymbols.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] mt-1 px-1">
                  Nenhum ativo encontrado. Verifique o código (ex: PETR4, BOVA11, AAPL34).
                </p>
              )}
            </div>
          )}

          {/* Common fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {tab === 'prediction' ? 'Preço ($)' : `Preço ${isBuy ? 'de Entrada' : 'de Venda'} (R$)`}
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

          {/* Total preview */}
          {total > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <span className="text-xs text-[var(--text-muted)]">Total</span>
              <span className="font-bold text-[var(--text)]">
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {isBuy ? 'Data de Entrada' : 'Data de Venda'}
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              required
            />
          </div>

          {!isBuy && (
            <p className="text-xs text-[var(--text-muted)] bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2">
              A venda será registrada no histórico de Operações. A posição na carteira permanece e pode ser removida manualmente.
            </p>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className={`w-full py-3 font-bold rounded-lg transition-colors disabled:opacity-50 ${
              isBuy
                ? 'bg-green-500 hover:bg-green-400 text-white'
                : 'bg-red-500 hover:bg-red-400 text-white'
            }`}
          >
            {saving
              ? 'Registrando...'
              : isBuy
              ? 'Adicionar Posição'
              : 'Registrar Venda'}
          </button>
        </form>
      </div>
    </div>
  );
}

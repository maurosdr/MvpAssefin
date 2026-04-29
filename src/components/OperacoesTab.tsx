'use client';

import { useState, useMemo } from 'react';
import { useTrades } from '@/context/TradesContext';
import { Trade, AssetCategory } from '@/types/portfolio';

const ASSET_TYPES: { value: AssetCategory; label: string }[] = [
  { value: 'stock', label: 'Ação' },
  { value: 'etf', label: 'ETF' },
  { value: 'bdr', label: 'BDR' },
  { value: 'fii', label: 'FII' },
  { value: 'crypto', label: 'Cripto' },
  { value: 'prediction', label: 'Mercado de Previsão' },
];

const TYPE_LABEL: Record<AssetCategory, string> = {
  stock: 'Ação',
  etf: 'ETF',
  bdr: 'BDR',
  fii: 'FII',
  crypto: 'Cripto',
  prediction: 'Previsão',
};

const TYPE_COLOR: Record<AssetCategory, string> = {
  stock: 'text-blue-400',
  etf: 'text-purple-400',
  bdr: 'text-indigo-400',
  fii: 'text-orange-400',
  crypto: 'text-yellow-400',
  prediction: 'text-pink-400',
};

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface AddTradeModalProps {
  onClose: () => void;
}

function AddTradeModal({ onClose }: AddTradeModalProps) {
  const { addTrade } = useTrades();
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    symbol: '',
    name: '',
    type: 'stock' as AssetCategory,
    operation: 'buy' as 'buy' | 'sell',
    date: today,
    quantity: '',
    price: '',
    notes: '',
  });

  const total = (parseFloat(form.quantity) || 0) * (parseFloat(form.price) || 0);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(form.quantity);
    const px = parseFloat(form.price);
    if (!form.symbol.trim() || !qty || !px || qty <= 0 || px <= 0) return;

    addTrade({
      type: form.type,
      symbol: form.symbol.trim().toUpperCase(),
      name: form.name.trim() || form.symbol.trim().toUpperCase(),
      operation: form.operation,
      date: form.date,
      quantity: qty,
      price: px,
      total: qty * px,
      notes: form.notes.trim() || undefined,
    });
    onClose();
  }

  const labelCls = 'block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1';
  const inputCls = 'w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-yellow-500 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="text-base font-bold text-[var(--text)]">Nova Operação</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Buy / Sell toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(['buy', 'sell'] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setForm((f) => ({ ...f, operation: op }))}
                className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
                  form.operation === op
                    ? op === 'buy'
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                      : 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                    : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {op === 'buy' ? 'Compra' : 'Venda'}
              </button>
            ))}
          </div>

          {/* Symbol + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Ticker / Símbolo</label>
              <input className={inputCls} placeholder="ex: PETR4" value={form.symbol} onChange={set('symbol')} required />
            </div>
            <div>
              <label className={labelCls}>Tipo</label>
              <select className={inputCls} value={form.type} onChange={set('type')}>
                {ASSET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className={labelCls}>Nome do Ativo <span className="normal-case text-[var(--text-muted)] font-normal">(opcional)</span></label>
            <input className={inputCls} placeholder="ex: Petrobras PN" value={form.name} onChange={set('name')} />
          </div>

          {/* Date */}
          <div>
            <label className={labelCls}>Data</label>
            <input type="date" className={inputCls} value={form.date} onChange={set('date')} required />
          </div>

          {/* Qty + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Quantidade</label>
              <input type="number" min="0" step="any" className={inputCls} placeholder="0" value={form.quantity} onChange={set('quantity')} required />
            </div>
            <div>
              <label className={labelCls}>Preço Unitário (R$)</label>
              <input type="number" min="0" step="any" className={inputCls} placeholder="0,00" value={form.price} onChange={set('price')} required />
            </div>
          </div>

          {/* Total preview */}
          {total > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <span className="text-xs text-[var(--text-muted)]">Total</span>
              <span className="font-bold text-[var(--text)]">R$ {formatCurrency(total)}</span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>Observações <span className="normal-case text-[var(--text-muted)] font-normal">(opcional)</span></label>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="ex: Aporte mensal, stop loss..." value={form.notes} onChange={set('notes')} />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
              form.operation === 'buy'
                ? 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/20'
                : 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/20'
            }`}
          >
            Registrar {form.operation === 'buy' ? 'Compra' : 'Venda'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OperacoesTab() {
  const { trades, removeTrade } = useTrades();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterOp, setFilterOp] = useState<'all' | 'buy' | 'sell'>('all');
  const [filterType, setFilterType] = useState<AssetCategory | 'all'>('all');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...trades];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
    }
    if (filterOp !== 'all') list = list.filter((t) => t.operation === filterOp);
    if (filterType !== 'all') list = list.filter((t) => t.type === filterType);
    list.sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortDir === 'desc' ? -diff : diff;
    });
    return list;
  }, [trades, search, filterOp, filterType, sortDir]);

  const stats = useMemo(() => {
    const buys = trades.filter((t) => t.operation === 'buy');
    const sells = trades.filter((t) => t.operation === 'sell');
    const totalBuy = buys.reduce((s, t) => s + t.total, 0);
    const totalSell = sells.reduce((s, t) => s + t.total, 0);
    return { totalBuy, totalSell, pnl: totalSell - totalBuy, count: trades.length };
  }, [trades]);

  function handleDelete(id: string) {
    if (confirmDelete === id) {
      removeTrade(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total Compras" value={`R$ ${formatCurrency(stats.totalBuy)}`} color="text-green-400" />
        <SummaryCard label="Total Vendas" value={`R$ ${formatCurrency(stats.totalSell)}`} color="text-red-400" />
        <SummaryCard
          label="P&L Realizado"
          value={`${stats.pnl >= 0 ? '+' : ''}R$ ${formatCurrency(stats.pnl)}`}
          color={stats.pnl >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <SummaryCard label="Operações" value={stats.count.toString()} color="text-[var(--accent)]" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-yellow-500 transition-colors"
            placeholder="Buscar ativo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Operation filter */}
        <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
          {(['all', 'buy', 'sell'] as const).map((op) => (
            <button
              key={op}
              onClick={() => setFilterOp(op)}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${
                filterOp === op ? 'bg-yellow-500 text-black' : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {op === 'all' ? 'Todos' : op === 'buy' ? 'Compras' : 'Vendas'}
            </button>
          ))}
        </div>

        {/* Asset type filter */}
        <select
          className="px-3 py-2 text-xs rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] focus:outline-none focus:border-yellow-500"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as AssetCategory | 'all')}
        >
          <option value="all">Todos os tipos</option>
          {ASSET_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Sort dir */}
        <button
          onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          title="Ordenar por data"
        >
          <svg className={`w-4 h-4 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
        </button>

        {/* Add */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] text-sm font-semibold transition-all active:scale-95 shadow-sm ml-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Operação
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState onAdd={() => setShowModal(true)} hasFilter={!!search || filterOp !== 'all' || filterType !== 'all'} />
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {/* Desktop table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg)]/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Ativo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Operação</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Qtd</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Preço</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hidden lg:table-cell">Obs.</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((trade) => (
                  <TradeRow
                    key={trade.id}
                    trade={trade}
                    confirmDelete={confirmDelete}
                    onDelete={handleDelete}
                    onCancelDelete={() => setConfirmDelete(null)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer row count */}
          <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--bg)]/20 text-xs text-[var(--text-muted)]">
            {filtered.length} operação{filtered.length !== 1 ? 'ões' : ''} exibida{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== trades.length && ` (${trades.length} no total)`}
          </div>
        </div>
      )}

      {showModal && <AddTradeModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function TradeRow({
  trade,
  confirmDelete,
  onDelete,
  onCancelDelete,
}: {
  trade: Trade;
  confirmDelete: string | null;
  onDelete: (id: string) => void;
  onCancelDelete: () => void;
}) {
  const isBuy = trade.operation === 'buy';
  const isConfirming = confirmDelete === trade.id;

  return (
    <tr className="hover:bg-[var(--bg)]/30 transition-colors group">
      <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{formatDate(trade.date)}</td>
      <td className="px-4 py-3">
        <div>
          <span className="font-bold text-[var(--text)]">{trade.symbol}</span>
          {trade.name !== trade.symbol && (
            <p className="text-xs text-[var(--text-muted)] truncate max-w-[140px]">{trade.name}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-semibold ${TYPE_COLOR[trade.type]}`}>{TYPE_LABEL[trade.type]}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
          isBuy ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {isBuy ? (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
          {isBuy ? 'Compra' : 'Venda'}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-mono text-[var(--text)]">{trade.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 8 })}</td>
      <td className="px-4 py-3 text-right font-mono text-[var(--text)]">R$ {formatCurrency(trade.price)}</td>
      <td className={`px-4 py-3 text-right font-bold font-mono ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
        {isBuy ? '+' : '-'}R$ {formatCurrency(trade.total)}
      </td>
      <td className="px-4 py-3 text-xs text-[var(--text-muted)] hidden lg:table-cell max-w-[160px]">
        <span className="truncate block">{trade.notes || '—'}</span>
      </td>
      <td className="px-4 py-3">
        {isConfirming ? (
          <div className="flex items-center gap-1">
            <button onClick={() => onDelete(trade.id)} className="text-xs text-red-400 font-semibold hover:text-red-300">Excluir</button>
            <span className="text-[var(--text-muted)]">·</span>
            <button onClick={onCancelDelete} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]">Não</button>
          </div>
        ) : (
          <button
            onClick={() => onDelete(trade.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-red-400 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </td>
    </tr>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg sm:text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function EmptyState({ onAdd, hasFilter }: { onAdd: () => void; hasFilter: boolean }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-[var(--bg)] flex items-center justify-center mb-4 border border-[var(--border)]">
        <svg className="w-7 h-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      </div>
      <p className="text-[var(--text)] font-semibold mb-1">{hasFilter ? 'Nenhuma operação encontrada' : 'Nenhuma operação registrada'}</p>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        {hasFilter ? 'Tente ajustar os filtros.' : 'Registre suas compras e vendas para acompanhar o histórico.'}
      </p>
      {!hasFilter && (
        <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-inverse)] text-sm font-semibold transition-all active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar primeira operação
        </button>
      )}
    </div>
  );
}

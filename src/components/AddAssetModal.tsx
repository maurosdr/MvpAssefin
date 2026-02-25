'use client';

import { useState, useEffect } from 'react';

export type AssetType = 'crypto' | 'stock' | 'fixed-income' | 'etf';

export interface ManualAsset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  quantity: number;
  avgPrice: number;
  purchaseDate: string;
}

const TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'crypto', label: 'Criptomoeda' },
  { value: 'stock', label: 'Ação' },
  { value: 'etf', label: 'ETF / FII' },
  { value: 'fixed-income', label: 'Renda Fixa' },
];

interface AddAssetModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (asset: ManualAsset) => void;
  editAsset?: ManualAsset | null;
}

const EMPTY_FORM = {
  symbol: '',
  name: '',
  type: 'stock' as AssetType,
  quantity: '',
  avgPrice: '',
  purchaseDate: new Date().toISOString().split('T')[0],
};

export default function AddAssetModal({ open, onClose, onAdd, editAsset }: AddAssetModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (editAsset) {
        setForm({
          symbol: editAsset.symbol,
          name: editAsset.name,
          type: editAsset.type,
          quantity: String(editAsset.quantity),
          avgPrice: String(editAsset.avgPrice),
          purchaseDate: editAsset.purchaseDate,
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setError('');
    }
  }, [open, editAsset]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const symbol = form.symbol.trim().toUpperCase();
    const name = form.name.trim() || symbol;
    const quantity = parseFloat(form.quantity);
    const avgPrice = parseFloat(form.avgPrice);

    if (!symbol) { setError('Informe o código do ativo.'); return; }
    if (isNaN(quantity) || quantity <= 0) { setError('Quantidade deve ser maior que zero.'); return; }
    if (isNaN(avgPrice) || avgPrice < 0) { setError('Preço médio inválido.'); return; }

    onAdd({
      id: editAsset?.id ?? `manual-${Date.now()}`,
      symbol,
      name,
      type: form.type,
      quantity,
      avgPrice,
      purchaseDate: form.purchaseDate,
    });
    onClose();
  }

  const inputClass =
    'w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors';
  const labelClass = 'block text-xs font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-bold text-[var(--text)] flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {editAsset ? 'Editar Ativo' : 'Adicionar Ativo'}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text)] p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo */}
          <div>
            <label className={labelClass}>Tipo de Ativo</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: opt.value }))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    form.type === opt.value
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40'
                      : 'bg-gray-800 text-[var(--text-muted)] border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Código + Nome */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Código</label>
              <input
                type="text"
                placeholder="Ex: PETR4"
                value={form.symbol}
                onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                className={inputClass}
                autoFocus
              />
            </div>
            <div>
              <label className={labelClass}>Nome (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Petrobras"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          {/* Quantidade + Preço Médio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Quantidade</label>
              <input
                type="number"
                placeholder="0"
                min="0"
                step="any"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Preço Médio {form.type === 'crypto' ? '(USD)' : '(BRL)'}
              </label>
              <input
                type="number"
                placeholder="0,00"
                min="0"
                step="any"
                value={form.avgPrice}
                onChange={(e) => setForm((f) => ({ ...f, avgPrice: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          {/* Data de Compra */}
          <div>
            <label className={labelClass}>Data de Compra</label>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
              className={inputClass}
            />
          </div>

          {/* Resumo */}
          {form.quantity && form.avgPrice && (
            <div className="bg-gray-800/50 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Valor total investido</span>
              <span className="font-bold text-[var(--text)] font-mono">
                {form.type === 'crypto' ? 'USD' : 'R$'}{' '}
                {(parseFloat(form.quantity || '0') * parseFloat(form.avgPrice || '0')).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gray-800 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-gray-700 transition-colors border border-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-sm"
            >
              {editAsset ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

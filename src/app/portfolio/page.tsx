'use client';

import { lazy, Suspense, useState, useEffect } from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import AddAssetModal, { type ManualAsset } from '@/components/AddAssetModal';

const PortfolioChart = lazy(() => import('@/components/PortfolioChart'));
const PortfolioAllocation = lazy(() => import('@/components/PortfolioAllocation'));
const PortfolioRiskCard = lazy(() => import('@/components/PortfolioRiskCard'));
const PortfolioPositionsTable = lazy(() => import('@/components/PortfolioPositionsTable'));
const BinancePortfolio = lazy(() => import('@/components/BinancePortfolio'));

const STORAGE_KEY = 'assefin_manual_assets';

function LoadingSpinner() {
  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-8 flex items-center justify-center min-h-[200px]">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function PortfolioPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editAsset, setEditAsset] = useState<ManualAsset | null>(null);
  const [manualAssets, setManualAssets] = useState<ManualAsset[]>([]);

  // Carregar ativos do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setManualAssets(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  function saveAssets(assets: ManualAsset[]) {
    setManualAssets(assets);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
    } catch {
      // ignore
    }
  }

  function handleAdd(asset: ManualAsset) {
    const existing = manualAssets.find((a) => a.id === asset.id);
    if (existing) {
      saveAssets(manualAssets.map((a) => (a.id === asset.id ? asset : a)));
    } else {
      saveAssets([...manualAssets, asset]);
    }
  }

  function handleEdit(asset: ManualAsset) {
    setEditAsset(asset);
    setShowAddModal(true);
  }

  function handleDelete(id: string) {
    saveAssets(manualAssets.filter((a) => a.id !== id));
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8 space-y-6">
        {/* Page Title */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              Portfolio
            </h1>
            <p className="text-[var(--text-secondary)] text-sm ml-[52px]">
              Visão consolidada dos seus investimentos em exchanges conectadas e ativos manuais
            </p>
          </div>

          {/* Botão Adicionar Ativo */}
          <button
            onClick={() => { setEditAsset(null); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-hover)] transition-all shadow-sm active:scale-95 flex-shrink-0 mt-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Adicionar Ativo</span>
            <span className="sm:hidden">Adicionar</span>
          </button>
        </div>

        {/* Row 1: Portfolio Chart */}
        <Suspense fallback={<LoadingSpinner />}>
          <PortfolioChart />
        </Suspense>

        {/* Row 2: Allocation + Risk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<LoadingSpinner />}>
            <PortfolioAllocation />
          </Suspense>
          <Suspense fallback={<LoadingSpinner />}>
            <PortfolioRiskCard />
          </Suspense>
        </div>

        {/* Row 3: Manual Positions Table */}
        <Suspense fallback={<LoadingSpinner />}>
          <PortfolioPositionsTable
            manualAssets={manualAssets}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddFirst={() => { setEditAsset(null); setShowAddModal(true); }}
          />
        </Suspense>

        {/* Row 4: Exchange Book (existing component) */}
        <Suspense fallback={<LoadingSpinner />}>
          <BinancePortfolio />
        </Suspense>
      </main>

      {/* Modal de adição/edição */}
      <AddAssetModal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setEditAsset(null); }}
        onAdd={handleAdd}
        editAsset={editAsset}
      />
    </div>
  );
}

import { countBusinessDays } from './brazilian-holidays';

// === Indexer Types ===
export type IndexerType = 'cdi-plus' | 'pct-cdi' | 'pre-fixado' | 'ipca-plus';

export type TesouroBondType = 'selic' | 'prefixado' | 'ipca-plus';

export interface FixedIncomeInput {
  principal: number;
  rate: number;            // Annual rate or spread (e.g., 13.5 for 13.5%, or 2.0 for CDI+2%)
  indexerType: IndexerType;
  maturityDate: Date;
  investmentDate: Date;
  currentCDI: number;      // Current CDI rate (% p.a.)
  currentIPCA: number;     // Current IPCA rate (% p.a.)
}

export interface FixedIncomeResult {
  grossReturn: number;
  netReturn: number;
  irAmount: number;
  iofAmount: number;
  irRate: number;
  holdingDays: number;
  businessDays: number;
  finalGrossValue: number;
  finalNetValue: number;
  effectiveAnnualRate: number;
  custodyFee: number;
}

// === IR Degressive Table (Tabela Regressiva de IR) ===
export function getIRRate(holdingDays: number): number {
  if (holdingDays <= 180) return 0.225;
  if (holdingDays <= 360) return 0.20;
  if (holdingDays <= 720) return 0.175;
  return 0.15;
}

// === IOF Table ===
// IOF applies only in the first 30 days, degressive
const IOF_TABLE = [96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3, 0];

export function getIOFRate(holdingDays: number): number {
  if (holdingDays <= 0) return 0.96;
  if (holdingDays > 30) return 0;
  return IOF_TABLE[holdingDays - 1] / 100;
}

// B3 custody fee for Tesouro Direto: 0.20% p.a. on amounts above R$10,000
const B3_CUSTODY_FEE_RATE = 0.002; // 0.20% p.a.
const B3_CUSTODY_EXEMPT = 10000;   // R$10,000 exempt

export function calculateFixedIncome(input: FixedIncomeInput): FixedIncomeResult {
  const { principal, rate, indexerType, maturityDate, investmentDate, currentCDI, currentIPCA } = input;

  const holdingDays = Math.max(1, Math.ceil((maturityDate.getTime() - investmentDate.getTime()) / (1000 * 60 * 60 * 24)));
  const businessDays = countBusinessDays(investmentDate, maturityDate);

  let effectiveAnnualRate: number;

  switch (indexerType) {
    case 'cdi-plus':
      // CDI + spread (e.g., rate=2 means CDI + 2%)
      effectiveAnnualRate = currentCDI + rate;
      break;
    case 'pct-cdi':
      // % of CDI (e.g., rate=110 means 110% CDI)
      effectiveAnnualRate = currentCDI * (rate / 100);
      break;
    case 'pre-fixado':
      effectiveAnnualRate = rate;
      break;
    case 'ipca-plus':
      // IPCA + spread: (1 + IPCA) * (1 + spread) - 1 simplified to additive for annualized
      effectiveAnnualRate = ((1 + currentIPCA / 100) * (1 + rate / 100) - 1) * 100;
      break;
    default:
      effectiveAnnualRate = rate;
  }

  // Brazilian convention: compound daily over 252 business days
  const factor = Math.pow(1 + effectiveAnnualRate / 100, businessDays / 252);
  const finalGrossValue = principal * factor;
  const grossReturn = finalGrossValue - principal;

  // B3 Custody Fee (pro-rata for holding period)
  const taxableBase = Math.max(0, principal - B3_CUSTODY_EXEMPT);
  const custodyFee = taxableBase * B3_CUSTODY_FEE_RATE * (holdingDays / 365);

  // IOF (only if holding < 30 days)
  const iofRate = getIOFRate(holdingDays);
  const iofAmount = grossReturn * iofRate;

  // IR on (grossReturn - IOF)
  const irRate = getIRRate(holdingDays);
  const irAmount = (grossReturn - iofAmount) * irRate;

  const netReturn = grossReturn - iofAmount - irAmount - custodyFee;
  const finalNetValue = principal + netReturn;

  return {
    grossReturn,
    netReturn,
    irAmount,
    iofAmount,
    irRate,
    holdingDays,
    businessDays,
    finalGrossValue,
    finalNetValue,
    effectiveAnnualRate,
    custodyFee,
  };
}

// Tesouro Direto presets
export interface TesouroBondPreset {
  type: TesouroBondType;
  label: string;
  indexerType: IndexerType;
  defaultSpread: number;
  description: string;
}

export const TESOURO_PRESETS: TesouroBondPreset[] = [
  {
    type: 'selic',
    label: 'Tesouro Selic',
    indexerType: 'cdi-plus',
    defaultSpread: 0.1,
    description: 'Selic + spread. Baixo risco de marcação a mercado.',
  },
  {
    type: 'prefixado',
    label: 'Tesouro Prefixado',
    indexerType: 'pre-fixado',
    defaultSpread: 14.5,
    description: 'Taxa fixa pré-definida. Risco de marcação a mercado.',
  },
  {
    type: 'ipca-plus',
    label: 'Tesouro IPCA+',
    indexerType: 'ipca-plus',
    defaultSpread: 6.5,
    description: 'IPCA + spread fixo. Proteção contra inflação.',
  },
];

// Format helpers
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

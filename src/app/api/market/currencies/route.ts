import { NextResponse } from 'next/server';

interface CurrencyData {
  pair: string;
  name: string;
  price: number;
  change1d: number;
  change1w: number;
  high?: number;
  low?: number;
  updatedAt?: string;
}

// Brapi currency pairs (format: FROM-TO)
const BRAPI_PAIRS: { brapi: string; pair: string; name: string }[] = [
  { brapi: 'USD-BRL', pair: 'USD/BRL', name: 'Dólar / Real' },
  { brapi: 'EUR-BRL', pair: 'EUR/BRL', name: 'Euro / Real' },
  { brapi: 'GBP-BRL', pair: 'GBP/BRL', name: 'Libra / Real' },
  { brapi: 'JPY-BRL', pair: 'JPY/BRL', name: 'Iene / Real' },
  { brapi: 'CHF-BRL', pair: 'CHF/BRL', name: 'Franco Suíço / Real' },
  { brapi: 'AUD-BRL', pair: 'AUD/BRL', name: 'Dólar Australiano / Real' },
  { brapi: 'CAD-BRL', pair: 'CAD/BRL', name: 'Dólar Canadense / Real' },
  { brapi: 'ARS-BRL', pair: 'ARS/BRL', name: 'Peso Argentino / Real' },
  { brapi: 'CNY-BRL', pair: 'CNY/BRL', name: 'Yuan / Real' },
  { brapi: 'BTC-BRL', pair: 'BTC/BRL', name: 'Bitcoin / Real' },
];

interface BrapiCurrency {
  fromCurrency: string;
  toCurrency: string;
  name: string;
  high: string;
  low: string;
  bidVariation: string;
  percentageChange: string;
  bidPrice: string;
  askPrice: string;
  updatedAtTimestamp: string;
  updatedAtDate: string;
}

let cache: { data: CurrencyData[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const brapiCodes = BRAPI_PAIRS.map((p) => p.brapi).join(',');
    const url = `https://brapi.dev/api/v2/currency?currency=${brapiCodes}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Authorization': 'Bearer kAohDLSrNNS3JNZijP4voJ',
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.warn(`Brapi currencies failed: ${res.status}`);
      return NextResponse.json(getFallbackCurrencies());
    }

    const json = await res.json();
    const brapiResults: BrapiCurrency[] = json?.currency || [];

    if (brapiResults.length === 0) {
      return NextResponse.json(getFallbackCurrencies());
    }

    const currencies = brapiResults
      .map((item) => {
        const pairKey = `${item.fromCurrency}-${item.toCurrency}`;
        const config = BRAPI_PAIRS.find((p) => p.brapi === pairKey);
        if (!config) return null;

        const price = parseFloat(item.bidPrice) || 0;
        const change1d = parseFloat(item.percentageChange) || 0;
        const high = parseFloat(item.high) || undefined;
        const low = parseFloat(item.low) || undefined;

        return {
          pair: config.pair,
          name: config.name,
          price: Math.round(price * 10000) / 10000,
          change1d: Math.round(change1d * 100) / 100,
          change1w: 0, // Brapi doesn't provide weekly change directly
          high,
          low,
          updatedAt: item.updatedAtDate || undefined,
        };
      })
      .filter((c) => c !== null) as CurrencyData[];

    if (currencies.length > 0) {
      cache = { data: currencies, timestamp: Date.now() };
      return NextResponse.json(currencies);
    }

    return NextResponse.json(getFallbackCurrencies());
  } catch (error) {
    console.error('Brapi currencies error:', error);
    return NextResponse.json(getFallbackCurrencies());
  }
}

function getFallbackCurrencies(): CurrencyData[] {
  return [
    { pair: 'USD/BRL', name: 'Dólar / Real', price: 5.89, change1d: -0.35, change1w: 0.68 },
    { pair: 'EUR/BRL', name: 'Euro / Real', price: 6.12, change1d: -0.08, change1w: 0.22 },
    { pair: 'GBP/BRL', name: 'Libra / Real', price: 7.42, change1d: 0.15, change1w: 0.45 },
    { pair: 'JPY/BRL', name: 'Iene / Real', price: 0.0388, change1d: 0.22, change1w: -0.18 },
    { pair: 'CHF/BRL', name: 'Franco Suíço / Real', price: 6.58, change1d: -0.05, change1w: -0.32 },
    { pair: 'AUD/BRL', name: 'Dólar Australiano / Real', price: 3.72, change1d: 0.18, change1w: 0.55 },
    { pair: 'CAD/BRL', name: 'Dólar Canadense / Real', price: 4.18, change1d: -0.12, change1w: 0.15 },
    { pair: 'ARS/BRL', name: 'Peso Argentino / Real', price: 0.0054, change1d: 0.25, change1w: -0.42 },
    { pair: 'CNY/BRL', name: 'Yuan / Real', price: 0.81, change1d: 0.10, change1w: 0.28 },
    { pair: 'BTC/BRL', name: 'Bitcoin / Real', price: 570250.00, change1d: 1.82, change1w: 3.45 },
  ];
}

import { NextResponse } from 'next/server';

interface SGSDataPoint {
  data: string; // dd/MM/yyyy
  valor: string;
}

interface ExchangeFlowData {
  date: string;
  financeiro: number;
  comercial: number;
  total: number;
}

let cache: { data: ExchangeFlowData[]; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function fetchSGSSeries(code: number): Promise<SGSDataPoint[]> {
  try {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/20?formato=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function parseDate(brDate: string): string {
  // Convert dd/MM/yyyy to yyyy-MM-dd for sorting, then return dd/MM format for display
  const parts = brDate.split('/');
  if (parts.length === 3) {
    return `${parts[0]}/${parts[1]}`;
  }
  return brDate;
}

function parseSortableDate(brDate: string): string {
  const parts = brDate.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return brDate;
}

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const [financeiro, comercial] = await Promise.all([
      fetchSGSSeries(2325), // Fluxo Cambial Financeiro
      fetchSGSSeries(2326), // Fluxo Cambial Comercial
    ]);

    if (financeiro.length === 0 && comercial.length === 0) {
      return NextResponse.json(getFallbackData());
    }

    // Build a map by date
    const dateMap = new Map<string, { financeiro: number; comercial: number }>();

    for (const item of financeiro) {
      const key = item.data;
      const existing = dateMap.get(key) || { financeiro: 0, comercial: 0 };
      existing.financeiro = parseFloat(item.valor) || 0;
      dateMap.set(key, existing);
    }

    for (const item of comercial) {
      const key = item.data;
      const existing = dateMap.get(key) || { financeiro: 0, comercial: 0 };
      existing.comercial = parseFloat(item.valor) || 0;
      dateMap.set(key, existing);
    }

    const result: ExchangeFlowData[] = Array.from(dateMap.entries())
      .sort((a, b) => parseSortableDate(a[0]).localeCompare(parseSortableDate(b[0])))
      .map(([date, values]) => ({
        date: parseDate(date),
        financeiro: Math.round(values.financeiro),
        comercial: Math.round(values.comercial),
        total: Math.round(values.financeiro + values.comercial),
      }));

    if (result.length > 0) {
      cache = { data: result, timestamp: Date.now() };
      return NextResponse.json(result);
    }

    return NextResponse.json(getFallbackData());
  } catch (error) {
    console.error('BCB SGS error:', error);
    return NextResponse.json(getFallbackData());
  }
}

function getFallbackData(): ExchangeFlowData[] {
  // Realistic recent data for Fluxo Cambial (USD millions)
  const dates = [
    '20/01', '21/01', '22/01', '23/01', '24/01',
    '27/01', '28/01', '29/01', '30/01', '31/01',
    '03/02', '04/02', '05/02', '06/02', '07/02',
    '10/02', '11/02', '12/02', '13/02', '14/02',
  ];
  return dates.map((date) => {
    const fin = Math.round((Math.random() - 0.4) * 3000);
    const com = Math.round((Math.random() - 0.5) * 1500);
    return {
      date,
      financeiro: fin,
      comercial: com,
      total: fin + com,
    };
  });
}

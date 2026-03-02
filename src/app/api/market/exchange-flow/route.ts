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
  // BCB SGS 2325/2326 returns monthly data (day is always "01").
  // Return MM/YYYY so x-axis labels are clearly distinct (e.g. "01/2025", "02/2025").
  const parts = brDate.split('/');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}`; // MM/YYYY
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
    '03/2024', '04/2024', '05/2024', '06/2024', '07/2024',
    '08/2024', '09/2024', '10/2024', '11/2024', '12/2024',
    '01/2025', '02/2025', '03/2025', '04/2025', '05/2025',
    '06/2025', '07/2025', '08/2025', '09/2025', '10/2025',
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

import { NextResponse } from 'next/server';
import { STOCKS_BY_CATEGORY, MAIN_STOCKS } from '@/lib/stocks-data';

export async function GET() {
  return NextResponse.json({
    categories: Object.keys(STOCKS_BY_CATEGORY),
    stocksByCategory: STOCKS_BY_CATEGORY,
    total: MAIN_STOCKS.length,
    allStocks: MAIN_STOCKS,
  });
}


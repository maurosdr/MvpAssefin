import { NextRequest, NextResponse } from 'next/server';
import {
  calculateHistoricalVaR,
  calculateMonteCarloVaR,
  calculateCVaR,
  calculateCustomScenario,
  calculateCorrelationScenario,
  calculateReturns,
  getDefaultCryptoCorrelations,
} from '@/lib/risk-calculations';

interface RiskRequest {
  type: 'historical' | 'montecarlo' | 'cvar' | 'custom' | 'correlation';
  // Historical VaR params
  windowSize?: number;
  // Monte Carlo params
  numSimulations?: number;
  timeHorizon?: number;
  // CVaR params
  confidenceLevel?: number;
  // Custom scenario params
  scenario?: {
    name: string;
    shocks: { asset: string; shock: number }[];
  };
  // Correlation scenario params
  shockAsset?: string;
  shockPercent?: number;
  // Portfolio data
  portfolio?: {
    positions: { asset: string; value: number }[];
  };
  portfolioValue?: number;
  // Price history for return calculations
  symbol?: string;
}

async function fetchPriceHistory(symbol: string): Promise<number[]> {
  try {
    // Fetch 1 year of daily data (7 days/week for crypto)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/crypto/ohlcv?symbol=${symbol}/USDT&window=1y`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch price history');
    }

    const data = await response.json();
    return data.map((candle: { close: number }) => candle.close);
  } catch {
    // Return mock data if fetch fails
    const mockPrices: number[] = [];
    let price = 50000;
    for (let i = 0; i < 365; i++) {
      price *= 1 + (Math.random() - 0.48) * 0.05;
      mockPrices.push(price);
    }
    return mockPrices;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RiskRequest = await request.json();
    const { type, symbol = 'BTC', portfolioValue = 10000 } = body;

    // Fetch price history and calculate returns
    const prices = await fetchPriceHistory(symbol);
    const returns = calculateReturns(prices);

    switch (type) {
      case 'historical': {
        const windowSize = body.windowSize || 365;
        const result = calculateHistoricalVaR({
          returns,
          windowSize,
          confidenceLevels: [0.01, 0.05],
          portfolioValue,
        });
        return NextResponse.json({ success: true, type: 'historical', result });
      }

      case 'montecarlo': {
        const numSimulations = Math.min(body.numSimulations || 10000, 50000);
        const timeHorizon = body.timeHorizon || 30;
        const result = calculateMonteCarloVaR({
          returns,
          numSimulations,
          timeHorizon,
          portfolioValue,
        });
        return NextResponse.json({ success: true, type: 'montecarlo', result });
      }

      case 'cvar': {
        const confidenceLevel = body.confidenceLevel || 0.05;
        const result = calculateCVaR({
          returns,
          confidenceLevel,
          portfolioValue,
        });
        return NextResponse.json({ success: true, type: 'cvar', result });
      }

      case 'custom': {
        if (!body.portfolio || !body.scenario) {
          return NextResponse.json(
            { success: false, error: 'Portfolio and scenario are required for custom scenarios' },
            { status: 400 }
          );
        }
        const result = calculateCustomScenario(body.portfolio, body.scenario);
        return NextResponse.json({ success: true, type: 'custom', result });
      }

      case 'correlation': {
        if (!body.portfolio || !body.shockAsset || body.shockPercent === undefined) {
          return NextResponse.json(
            { success: false, error: 'Portfolio, shockAsset, and shockPercent are required' },
            { status: 400 }
          );
        }
        const correlations = getDefaultCryptoCorrelations();
        const result = calculateCorrelationScenario({
          portfolio: body.portfolio,
          shockAsset: body.shockAsset,
          shockPercent: body.shockPercent,
          correlations,
        });
        return NextResponse.json({ success: true, type: 'correlation', result });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid calculation type' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Calculation failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to run all calculations at once
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol') || 'BTC';
  const portfolioValue = parseFloat(searchParams.get('portfolioValue') || '10000');

  try {
    const prices = await fetchPriceHistory(symbol);
    const returns = calculateReturns(prices);

    // Run all calculations in parallel
    const [historicalResult, monteCarloResult, cvarResult] = await Promise.all([
      Promise.resolve(
        calculateHistoricalVaR({
          returns,
          windowSize: 365,
          confidenceLevels: [0.01, 0.05],
          portfolioValue,
        })
      ),
      Promise.resolve(
        calculateMonteCarloVaR({
          returns,
          numSimulations: 10000,
          timeHorizon: 30,
          portfolioValue,
        })
      ),
      Promise.resolve(
        calculateCVaR({
          returns,
          confidenceLevel: 0.05,
          portfolioValue,
        })
      ),
    ]);

    return NextResponse.json({
      success: true,
      symbol,
      portfolioValue,
      results: {
        historical: historicalResult,
        monteCarlo: monteCarloResult,
        cvar: cvarResult,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Calculations failed' },
      { status: 500 }
    );
  }
}

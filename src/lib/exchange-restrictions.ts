/** Binance pode retornar 451 / mensagem de região quando o IP não é elegível (termos Binance). */
export function isBinanceRestrictedOrBlockedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    msg.includes('451') ||
    lower.includes('restricted location') ||
    lower.includes('service unavailable from a restricted') ||
    lower.includes('b. eligibility')
  );
}

/** Par estilo Binance BTC/USDT → par Coinbase BTC/USD (CCXT spot). */
export function usdtSymbolToCoinbaseUsd(symbolParam: string): string {
  const s = symbolParam.trim().toUpperCase();
  if (s.endsWith('/USDT')) {
    const base = s.slice(0, -'/USDT'.length);
    return `${base}/USD`;
  }
  if (s.endsWith('-USDT')) {
    return `${s.slice(0, -'-USDT'.length)}/USD`;
  }
  if (s.includes('/')) return s.includes('/USD') ? s : s.replace(/\/USDT$/i, '/USD');
  return `${s}/USD`;
}

export const CRYPTO_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  BNB: 'BNB',
  XRP: 'XRP',
  SOL: 'Solana',
  ADA: 'Cardano',
  DOGE: 'Dogecoin',
  AVAX: 'Avalanche',
  DOT: 'Polkadot',
  MATIC: 'Polygon',
  LINK: 'Chainlink',
  UNI: 'Uniswap',
  SHIB: 'Shiba Inu',
  LTC: 'Litecoin',
  ATOM: 'Cosmos',
  XLM: 'Stellar',
  NEAR: 'NEAR Protocol',
  APT: 'Aptos',
  FIL: 'Filecoin',
  ARB: 'Arbitrum',
  OP: 'Optimism',
  PEPE: 'Pepe',
  SUI: 'Sui',
  TRX: 'TRON',
  USDT: 'Tether',
  USDC: 'USD Coin',
};

export function getCryptoName(symbol: string): string {
  const base = symbol.replace('/USDT', '').replace('/USD', '').toUpperCase();
  return CRYPTO_NAMES[base] || base;
}

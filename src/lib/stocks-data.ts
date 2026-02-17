// Ações principais da B3 (Brasil) - Expandida
export const MAIN_STOCKS = [
  // Blue Chips (Ibovespa)
  'PETR4', 'PETR3', 'VALE3', 'ITUB4', 'ITUB3', 'BBDC4', 'BBDC3',
  'ABEV3', 'WEGE3', 'RENT3', 'SUZB3', 'ELET3', 'ELET6', 'BBAS3',
  'RADL3', 'CMIG4', 'CMIG3', 'HAPV3', 'VIVT3', 'BRAP4', 'KLBN11',
  'UGPA3', 'TAEE11', 'CCRO3', 'CYRE3',
  // Varejo & Consumo
  'MGLU3', 'VBBR3', 'LREN3', 'ARZZ3', 'CAML3', 'GUAR3', 'GUAR4', 'NTCO3', 'SOMA3',
  // Bancos & Financeiras
  'SANB11', 'SANB3', 'SANB4', 'BPAN4', 'BRSR6', 'BRSR3', 'CRFB3', 'PINE4', 'PINE3',
  // Energia & Utilidades
  'EQTL3', 'CPLE6', 'CPLE3', 'ENBR3', 'EGIE3', 'ENGI11',
  // Siderurgia & Mineração
  'GGBR4', 'GGBR3', 'USIM5', 'USIM3', 'CSNA3', 'GOAU4', 'GOAU3', 'CSAN3', 'FESA3',
  // FIIs (Fundos Imobiliários)
  'HGLG11', 'XPML11', 'KNRI11', 'HGRU11', 'VISC11', 'XPLG11', 'BTLG11', 'RBRF11',
  // Tecnologia & Telecom
  'TOTS3', 'LWSA3', 'CASH3', 'STOC31',
  // Outros setores
  'PRIO3', 'RDOR3', 'DXCO3', 'FESA4', 'GMAT3', 'ENEV3',
  // BDRs (Brazilian Depositary Receipts)
  'ROXO34', 'M1TA34', 'AAPL34', 'AMZO34', 'GOGL34',
  'MSFT34', 'TSLA34', 'NVDC34', 'NFLX34', 'DISB34',
];

// Categorias de ações
export const STOCKS_BY_CATEGORY = {
  blueChips: [
    'PETR4', 'PETR3', 'VALE3', 'ITUB4', 'ITUB3', 'BBDC4', 'BBDC3',
    'ABEV3', 'WEGE3', 'RENT3', 'SUZB3', 'ELET3', 'ELET6', 'BBAS3',
    'RADL3', 'CMIG4', 'CMIG3', 'HAPV3', 'VIVT3', 'BRAP4', 'KLBN11',
    'UGPA3', 'TAEE11', 'CCRO3', 'CYRE3', 'RDOR3',
  ],
  banks: [
    'ITUB4', 'ITUB3', 'BBDC4', 'BBDC3', 'BBAS3', 'SANB11', 'SANB3', 'SANB4',
    'BPAN4', 'BRSR6', 'BRSR3', 'PINE4', 'PINE3',
  ],
  retail: [
    'MGLU3', 'VBBR3', 'LREN3', 'ARZZ3', 'CAML3', 'GUAR3', 'GUAR4',
    'NTCO3', 'SOMA3', 'CRFB3',
  ],
  fiis: ['HGLG11', 'XPML11', 'KNRI11', 'HGRU11', 'VISC11', 'XPLG11', 'BTLG11', 'RBRF11'],
  energy: [
    'PETR4', 'PETR3', 'PRIO3', 'EQTL3', 'CPLE6', 'CPLE3',
    'ELET3', 'ELET6', 'ENBR3', 'EGIE3', 'ENGI11', 'ENEV3', 'TAEE11',
  ],
  mining: [
    'VALE3', 'GGBR4', 'GGBR3', 'USIM5', 'USIM3', 'CSNA3',
    'GOAU4', 'GOAU3', 'CSAN3', 'FESA4', 'FESA3', 'BRAP4',
  ],
  tech: ['TOTS3', 'LWSA3', 'CASH3', 'STOC31'],
  bdrs: ['ROXO34', 'M1TA34', 'AAPL34', 'AMZO34', 'GOGL34', 'MSFT34', 'TSLA34', 'NVDC34', 'NFLX34', 'DISB34'],
};

// Mapeamento de nomes das ações
export const STOCK_NAMES: Record<string, string> = {
  PETR4: 'Petrobras PN',
  PETR3: 'Petrobras ON',
  VALE3: 'Vale',
  ITUB4: 'Itau Unibanco PN',
  ITUB3: 'Itau Unibanco ON',
  BBDC4: 'Bradesco PN',
  BBDC3: 'Bradesco ON',
  ABEV3: 'Ambev',
  WEGE3: 'WEG',
  RENT3: 'Localiza',
  SUZB3: 'Suzano',
  ELET3: 'Eletrobras',
  BBAS3: 'Banco do Brasil',
  RADL3: 'Raia Drogasil',
  CMIG4: 'Cemig PN',
  CMIG3: 'Cemig ON',
  HAPV3: 'Hapvida',
  VIVT3: 'Telefônica Brasil',
  BRAP4: 'Bradespar',
  KLBN11: 'Klabin',
  UGPA3: 'Ultrapar',
  TAEE11: 'Taesa',
  CCRO3: 'CCR',
  CYRE3: 'Cyrela',
  MGLU3: 'Magazine Luiza',
  VBBR3: 'Via',
  LREN3: 'Lojas Renner',
  ARZZ3: 'Arezzo',
  CAML3: 'Camil',
  GUAR3: 'Guararapes ON',
  GUAR4: 'Guararapes PN',
  NTCO3: 'Natura',
  SOMA3: 'Grupo Soma',
  SANB11: 'Santander Brasil UNT',
  SANB3: 'Santander Brasil ON',
  SANB4: 'Santander Brasil PN',
  BPAN4: 'Banco Pan',
  BRSR6: 'Banrisul PNB',
  BRSR3: 'Banrisul ON',
  CRFB3: 'Carrefour Brasil',
  PINE4: 'Pine PN',
  PINE3: 'Pine ON',
  EQTL3: 'Equatorial Energia',
  CPLE6: 'Copel PNB',
  CPLE3: 'Copel ON',
  ELET6: 'Eletrobras',
  ENBR3: 'EDP Brasil',
  EGIE3: 'Engie Brasil',
  ENGI11: 'Energisa',
  GGBR4: 'Gerdau PN',
  GGBR3: 'Gerdau ON',
  USIM5: 'Usiminas PNA',
  USIM3: 'Usiminas ON',
  CSNA3: 'CSN',
  GOAU4: 'Metalurgica Gerdau PN',
  GOAU3: 'Metalurgica Gerdau ON',
  CSAN3: 'Cosan',
  HGLG11: 'CSHG Logística',
  XPML11: 'XP Malls',
  KNRI11: 'Kinea Renda Imobiliária',
  HGRU11: 'Hedge Realty',
  VISC11: 'Vinci Shopping Centers',
  XPLG11: 'XP Log',
  BTLG11: 'BTG Pactual Logística',
  RBRF11: 'RBR Alpha',
  TOTS3: 'TOTVS',
  LWSA3: 'Locaweb',
  CASH3: 'Méliuz',
  STOC31: 'StoneCo',
  PRIO3: 'PetroRio',
  RDOR3: "Rede D'Or",
  DXCO3: 'Dexco',
  FESA4: 'Ferbasa PN',
  FESA3: 'Ferbasa ON',
  GMAT3: 'Grupo Mateus',
  ENEV3: 'Eneva',
  // BDRs
  ROXO34: 'Nubank',
  M1TA34: 'Meta Platforms',
  AAPL34: 'Apple',
  AMZO34: 'Amazon',
  GOGL34: 'Alphabet (Google)',
  MSFT34: 'Microsoft',
  TSLA34: 'Tesla',
  NVDC34: 'Nvidia',
  NFLX34: 'Netflix',
  DISB34: 'Walt Disney',
};

export function getStockName(symbol: string): string {
  return STOCK_NAMES[symbol] || symbol;
}

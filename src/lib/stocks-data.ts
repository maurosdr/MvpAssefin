// Ações principais da B3 (Brasil) - Expandida
export const MAIN_STOCKS = [
  // Blue Chips (Ibovespa)
  'PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'ABEV3', 'WEGE3', 'RENT3', 'SUZB3',
  'ELET3', 'BBAS3', 'RADL3', 'CMIG4', 'HAPV3', 'VIVT3', 'BRAP4', 'KLBN11',
  'UGPA3', 'TAEE11', 'CCRO3', 'CYRE3',
  // Varejo & Consumo
  'MGLU3', 'VBBR3', 'LREN3', 'ARZZ3', 'CAML3', 'GUAR3', 'NTCO3', 'SOMA3',
  // Bancos & Financeiras
  'SANB11', 'BPAN4', 'BRSR6', 'CRFB3', 'PINE4',
  // Energia & Utilidades
  'EQTL3', 'CPLE6', 'ELET6', 'ENBR3', 'EGIE3', 'ENGI11',
  // Siderurgia & Mineração
  'GGBR4', 'USIM5', 'CSNA3', 'GOAU4', 'CSAN3',
  // FIIs (Fundos Imobiliários)
  'HGLG11', 'XPML11', 'KNRI11', 'HGRU11', 'VISC11', 'XPLG11', 'BTLG11', 'RBRF11',
  // Tecnologia & Telecom
  'TOTS3', 'LWSA3', 'CASH3', 'STOC31',
  // Outros setores
  'PRIO3', 'RDOR3', 'DXCO3', 'FESA4', 'GMAT3', 'ENEV3',
];

// Categorias de ações
export const STOCKS_BY_CATEGORY = {
  blueChips: ['PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'ABEV3', 'WEGE3', 'RENT3', 'SUZB3', 'ELET3', 'BBAS3'],
  banks: ['ITUB4', 'BBDC4', 'BBAS3', 'SANB11', 'BPAN4', 'BRSR6', 'CRFB3', 'PINE4'],
  retail: ['MGLU3', 'VBBR3', 'LREN3', 'ARZZ3', 'CAML3', 'GUAR3', 'NTCO3', 'SOMA3'],
  fiis: ['HGLG11', 'XPML11', 'KNRI11', 'HGRU11', 'VISC11', 'XPLG11', 'BTLG11', 'RBRF11'],
  energy: ['PETR4', 'PRIO3', 'EQTL3', 'CPLE6', 'ELET6', 'ENBR3', 'EGIE3', 'ENGI11'],
  mining: ['VALE3', 'GGBR4', 'USIM5', 'CSNA3', 'GOAU4', 'CSAN3'],
  tech: ['TOTS3', 'LWSA3', 'CASH3', 'STOC31'],
};

// Mapeamento de nomes das ações
export const STOCK_NAMES: Record<string, string> = {
  PETR4: 'Petrobras',
  VALE3: 'Vale',
  ITUB4: 'Itaú Unibanco',
  BBDC4: 'Bradesco',
  ABEV3: 'Ambev',
  WEGE3: 'WEG',
  RENT3: 'Localiza',
  SUZB3: 'Suzano',
  ELET3: 'Eletrobras',
  BBAS3: 'Banco do Brasil',
  RADL3: 'Raia Drogasil',
  CMIG4: 'Cemig',
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
  GUAR3: 'Guararapes',
  NTCO3: 'Natura',
  SOMA3: 'Grupo Soma',
  SANB11: 'Santander Brasil',
  BPAN4: 'Banco Pan',
  BRSR6: 'Banrisul',
  CRFB3: 'Carrefour Brasil',
  PINE4: 'Pine',
  EQTL3: 'Equatorial Energia',
  CPLE6: 'Copel',
  ELET6: 'Eletrobras',
  ENBR3: 'EDP Brasil',
  EGIE3: 'Engie Brasil',
  ENGI11: 'Energisa',
  GGBR4: 'Gerdau',
  USIM5: 'Usinas Siderúrgicas',
  CSNA3: 'CSN',
  GOAU4: 'Metalúrgica Gerdau',
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
  FESA4: 'Ferbasa',
  GMAT3: 'Grupo Mateus',
  ENEV3: 'Eneva',
};

export function getStockName(symbol: string): string {
  return STOCK_NAMES[symbol] || symbol;
}

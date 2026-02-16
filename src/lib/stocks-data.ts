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



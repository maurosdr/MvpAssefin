// Mapeamento de símbolos de ações para URLs de logos
// Usando múltiplas fontes para garantir disponibilidade

export function getStockLogoUrl(symbol: string): string {
  // Mapeamento de símbolos para domínios/URLs
  const logoMap: Record<string, string> = {
    // Blue Chips
    PETR4: 'petrobras.com.br',
    VALE3: 'vale.com',
    ITUB4: 'itau.com.br',
    BBDC4: 'bradesco.com.br',
    ABEV3: 'ambev.com.br',
    WEGE3: 'weg.net',
    RENT3: 'localiza.com',
    SUZB3: 'suzano.com.br',
    ELET3: 'eletrobras.com',
    BBAS3: 'bb.com.br',
    RADL3: 'raiadrogasil.com.br',
    CMIG4: 'cemig.com.br',
    HAPV3: 'hapvida.com.br',
    VIVT3: 'telefonica.com.br',
    BRAP4: 'bradespar.com.br',
    KLBN11: 'klabin.com.br',
    UGPA3: 'ultra.com.br',
    TAEE11: 'taesa.com.br',
    CCRO3: 'ccr.com.br',
    CYRE3: 'cyrela.com.br',
    // Varejo
    MGLU3: 'magazineluiza.com.br',
    VBBR3: 'via.com.br',
    LREN3: 'lojasrenner.com.br',
    ARZZ3: 'arezzo.com.br',
    CAML3: 'camil.com.br',
    GUAR3: 'guararapes.com.br',
    NTCO3: 'natura.com.br',
    SOMA3: 'lojasoma.com.br',
    // Bancos
    SANB11: 'santander.com.br',
    BPAN4: 'bancopan.com.br',
    BRSR6: 'banrisul.com.br',
    CRFB3: 'carrefour.com.br',
    PINE4: 'pine.com.br',
    // Energia
    EQTL3: 'equatorialenergia.com.br',
    CPLE6: 'copel.com',
    ELET6: 'eletrobras.com',
    ENBR3: 'edp.com.br',
    EGIE3: 'engie.com.br',
    ENGI11: 'energisa.com.br',
    // Mineração
    GGBR4: 'gerdau.com.br',
    USIM5: 'usiminas.com.br',
    CSNA3: 'csn.com.br',
    GOAU4: 'gerdau.com.br',
    CSAN3: 'cosan.com.br',
    // FIIs
    HGLG11: 'csgh.com.br',
    XPML11: 'xpi.com.br',
    KNRI11: 'kinea.com.br',
    HGRU11: 'hedge.com.br',
    VISC11: 'vinci.com.br',
    XPLG11: 'xpi.com.br',
    BTLG11: 'btgpactual.com',
    RBRF11: 'rbr.com.br',
    // Tech
    TOTS3: 'totvs.com.br',
    LWSA3: 'locaweb.com.br',
    CASH3: 'meliu.com.br',
    STOC31: 'stone.co',
    // Outros
    PRIO3: 'petrorio.com.br',
    RDOR3: 'rededor.com.br',
    DXCO3: 'dexco.com.br',
    FESA4: 'ferbasa.com.br',
    GMAT3: 'grupomateus.com.br',
    ENEV3: 'eneva.com.br',
    // BDRs
    ROXO34: 'nubank.com.br',
    M1TA34: 'meta.com',
    AAPL34: 'apple.com',
    AMZO34: 'amazon.com',
    GOGL34: 'google.com',
    MSFT34: 'microsoft.com',
    TSLA34: 'tesla.com',
    NVDC34: 'nvidia.com',
    NFLX34: 'netflix.com',
    DISB34: 'disney.com',
  };

  const domain = logoMap[symbol];
  if (!domain) {
    return '';
  }

  // Usar Clearbit Logo API (gratuita)
  return `https://logo.clearbit.com/${domain}`;
}

// Função para obter iniciais como fallback
export function getStockInitials(symbol: string): string {
  // Para ações brasileiras, geralmente são 4 caracteres
  // Ex: PETR4 -> PE, VALE3 -> VA
  if (symbol.length >= 2) {
    return symbol.substring(0, 2).toUpperCase();
  }
  return symbol.charAt(0).toUpperCase();
}



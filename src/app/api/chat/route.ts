import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const AGENT_SYSTEM_PROMPT = `Você é o Assistente ASSEFIN, um agente especializado em análise de ativos financeiros brasileiros.

REGRAS OBRIGATÓRIAS:
1. ANÁLISE QUANTITATIVA: Utilize os dados fornecidos da BrAPI para responder perguntas quantitativas. Apresente métricas como preço, variação, volume, P/L, P/VP, DY, ROE, EBITDA e dívida líquida de forma estruturada.
2. RISCOS E NOTÍCIAS: Pesquise e descreva os riscos associados ao ativo — macroeconômicos (Selic, IPCA, câmbio), setoriais, regulatórios e específicos da empresa.
3. FONTES OBRIGATÓRIAS: SEMPRE associe uma fonte a cada notícia ou informação. Formato: [Nome da Fonte](URL) — Data. Fontes: BrAPI, InfoMoney, Valor Econômico, Bloomberg, Reuters, CoinTelegraph.
4. Responda em português brasileiro (pt-BR).
5. Use Markdown para formatação. Conclua sempre com um Sumário Executivo.
6. Não faça recomendações de compra/venda. Indique que análises são educacionais.`;

async function fetchBrAPIData(symbol: string): Promise<string> {
  try {
    const brapiToken = process.env.BRAPI_TOKEN || '';
    const tokenParam = brapiToken ? `?token=${brapiToken}` : '';
    const res = await fetch(
      `https://brapi.dev/api/quote/${symbol}${tokenParam}&modules=summaryProfile,financialData,defaultKeyStatistics`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return '';
    const data = await res.json();
    const q = data?.results?.[0];
    if (!q) return '';

    const lines: string[] = [
      `## Dados Quantitativos — ${q.longName || symbol} (BrAPI)`,
      `- **Preço atual**: R$ ${q.regularMarketPrice?.toFixed(2) ?? '-'}`,
      `- **Variação 24h**: ${q.regularMarketChangePercent?.toFixed(2) ?? '-'}%`,
      `- **Volume**: ${q.regularMarketVolume?.toLocaleString('pt-BR') ?? '-'}`,
      `- **Máx 52 semanas**: R$ ${q.fiftyTwoWeekHigh?.toFixed(2) ?? '-'}`,
      `- **Mín 52 semanas**: R$ ${q.fiftyTwoWeekLow?.toFixed(2) ?? '-'}`,
      `- **Market Cap**: R$ ${q.marketCap ? (q.marketCap / 1e9).toFixed(2) + 'B' : '-'}`,
    ];

    const fd = q.financialData;
    if (fd) {
      if (fd.revenueGrowth) lines.push(`- **Crescimento de Receita**: ${(fd.revenueGrowth * 100).toFixed(1)}%`);
      if (fd.grossMargins) lines.push(`- **Margem Bruta**: ${(fd.grossMargins * 100).toFixed(1)}%`);
      if (fd.ebitdaMargins) lines.push(`- **Margem EBITDA**: ${(fd.ebitdaMargins * 100).toFixed(1)}%`);
      if (fd.returnOnEquity) lines.push(`- **ROE**: ${(fd.returnOnEquity * 100).toFixed(1)}%`);
      if (fd.debtToEquity) lines.push(`- **Dívida/Patrimônio**: ${fd.debtToEquity.toFixed(2)}`);
    }

    const ks = q.defaultKeyStatistics;
    if (ks) {
      if (ks.trailingEps) lines.push(`- **LPA (EPS)**: R$ ${ks.trailingEps?.toFixed(2)}`);
      if (ks.priceToBook) lines.push(`- **P/VP**: ${ks.priceToBook?.toFixed(2)}x`);
    }

    lines.push(`\n*Fonte: [BrAPI](https://brapi.dev) — ${new Date().toLocaleDateString('pt-BR')}*`);
    return lines.join('\n');
  } catch {
    return '';
  }
}

async function streamClaude(prompt: string, apiKey: string, encoder: TextEncoder, controller: ReadableStreamDefaultController) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      stream: true,
      system: AGENT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

  const reader = response.body!.getReader();
  const dec = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = dec.decode(value);
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.delta?.text || '';
          if (text) controller.enqueue(encoder.encode(text));
        } catch { /* ignore parse errors */ }
      }
    }
  }
}

async function streamOpenAI(prompt: string, apiKey: string, encoder: TextEncoder, controller: ReadableStreamDefaultController) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      stream: true,
      messages: [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

  const reader = response.body!.getReader();
  const dec = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = dec.decode(value);
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.choices?.[0]?.delta?.content || '';
          if (text) controller.enqueue(encoder.encode(text));
        } catch { /* ignore parse errors */ }
      }
    }
  }
}

async function streamGemini(prompt: string, apiKey: string, encoder: TextEncoder, controller: ReadableStreamDefaultController) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${AGENT_SYSTEM_PROMPT}\n\n${prompt}` }] }],
    }),
  });

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

  const reader = response.body!.getReader();
  const dec = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    // Gemini streams JSON arrays, extract text parts
    const textMatches = buffer.match(/"text":\s*"((?:[^"\\]|\\.)*)"/g) || [];
    for (const match of textMatches) {
      const text = match.replace(/^"text":\s*"/, '').replace(/"$/, '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
      if (text) controller.enqueue(encoder.encode(text));
    }
    buffer = '';
  }
}

export async function POST(request: NextRequest) {
  const { symbol, question, provider = 'claude', apiKey } = await request.json();

  if (!symbol || !question) {
    return new Response('Missing symbol or question', { status: 400 });
  }

  const brapiData = await fetchBrAPIData(symbol);

  const fullPrompt = [
    `Ativo analisado: **${symbol}**`,
    brapiData ? `\n${brapiData}\n` : '',
    `## Pergunta do Usuário\n${question}`,
  ].filter(Boolean).join('\n');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!apiKey) {
          // No API key: return a helpful fallback message
          const fallback = `## Análise de ${symbol}\n\n` +
            (brapiData ? brapiData + '\n\n' : '') +
            `> ⚠️ **Configure uma chave de API** (Claude, GPT ou Gemini) no botão **APIs & Conexões** no topo da página para obter análises completas com notícias e riscos em tempo real.\n\n` +
            `Para usar o agente de análise completo:\n` +
            `1. Clique em **APIs & Conexões** na barra superior\n` +
            `2. Acesse a aba **AI**\n` +
            `3. Insira sua chave de API da Anthropic (Claude), OpenAI (GPT) ou Google (Gemini)\n\n` +
            `*Fonte: [BrAPI](https://brapi.dev) — ${new Date().toLocaleDateString('pt-BR')}*`;

          // Simulate streaming for the fallback message
          const words = fallback.split(' ');
          for (const word of words) {
            controller.enqueue(encoder.encode(word + ' '));
            await new Promise((r) => setTimeout(r, 15));
          }
        } else {
          if (provider === 'claude') {
            await streamClaude(fullPrompt, apiKey, encoder, controller);
          } else if (provider === 'openai') {
            await streamOpenAI(fullPrompt, apiKey, encoder, controller);
          } else if (provider === 'gemini') {
            await streamGemini(fullPrompt, apiKey, encoder, controller);
          }
        }
      } catch (err) {
        const errMsg = `\n\n❌ Erro ao conectar com ${provider}: ${err instanceof Error ? err.message : 'Erro desconhecido'}. Verifique sua chave de API.`;
        controller.enqueue(encoder.encode(errMsg));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
    },
  });
}

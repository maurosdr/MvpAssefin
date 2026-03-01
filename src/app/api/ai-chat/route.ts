import { NextRequest, NextResponse } from 'next/server';

const BRAPI_TOKEN = process.env.BRAPI_TOKEN || 'kAohDLSrNNS3JNZijP4voJ';

const SYSTEM_PROMPT = `Você é um agente especializado em análise de ativos financeiros. Siga estas diretrizes:

1. DADOS QUANTITATIVOS: Responda perguntas quantitativas usando os dados fornecidos da BrAPI (incluídos no contexto). Quando citar métricas financeiras (P/L, P/VP, ROE, EBITDA, receita, etc.), use sempre os valores dos dados de contexto disponíveis.

2. RISCOS E NOTÍCIAS: Pesquise e descreva os principais riscos do ativo com base em informações recentes. Mencione tendências setoriais, riscos macroeconômicos, riscos regulatórios, riscos operacionais e competitivos.

3. FONTES: Sempre associe uma fonte às informações que você apresentar:
   - Para dados fundamentalistas: cite "BrAPI / B3"
   - Para notícias e eventos: cite a fonte (ex: "Reuters", "Bloomberg", "Valor Econômico", "InfoMoney", etc.)
   - Para análises técnicas: cite "dados BrAPI"
   - Quando incerto sobre uma notícia específica, indique "verificar em fontes como Valor Econômico, Bloomberg Brasil, Reuters"

4. FORMATO: Use linguagem clara e objetiva. Organize a resposta com seções quando houver múltiplos pontos. Use bullet points para listas de riscos.

5. IDIOMA: Responda sempre em Português Brasileiro.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function fetchStockContext(symbol: string): Promise<string> {
  try {
    const url = `https://brapi.dev/api/quote/${symbol}?modules=summaryProfile,financialData,defaultKeyStatistics&token=${BRAPI_TOKEN}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return '';
    const data = await res.json();
    const quote = data.results?.[0];
    if (!quote) return '';

    const fd = quote.financialData || {};
    const ks = quote.defaultKeyStatistics || {};
    const sp = quote.summaryProfile || {};

    const lines: string[] = [
      `Ativo: ${quote.longName || quote.symbol} (${quote.symbol})`,
      `Preço atual: R$ ${quote.regularMarketPrice?.toFixed(2) || '-'}`,
      `Variação 24h: ${quote.regularMarketChangePercent?.toFixed(2) || '-'}%`,
      `Volume: ${quote.regularMarketVolume?.toLocaleString('pt-BR') || '-'}`,
      `Market Cap: ${quote.marketCap ? `R$ ${(quote.marketCap / 1e9).toFixed(2)}B` : '-'}`,
      `P/L: ${ks.trailingPE?.toFixed(2) || '-'}`,
      `P/VP: ${ks.priceToBook?.toFixed(2) || '-'}`,
      `EV/EBITDA: ${ks.enterpriseToEbitda?.toFixed(2) || '-'}`,
      `ROE: ${fd.returnOnEquity ? `${(fd.returnOnEquity * 100).toFixed(2)}%` : '-'}`,
      `Margem líquida: ${fd.profitMargins ? `${(fd.profitMargins * 100).toFixed(2)}%` : '-'}`,
      `Receita total: ${fd.totalRevenue ? `R$ ${(fd.totalRevenue / 1e9).toFixed(2)}B` : '-'}`,
      `Dívida líquida/EBITDA: ${ks.netIncome ? '-' : '-'}`,
      `Setor: ${sp.sector || '-'}`,
      `Indústria: ${sp.industry || '-'}`,
      `Máx 52 semanas: R$ ${quote.fiftyTwoWeekHigh?.toFixed(2) || '-'}`,
      `Mín 52 semanas: R$ ${quote.fiftyTwoWeekLow?.toFixed(2) || '-'}`,
    ];

    return `\n\n--- DADOS ATUAIS DO ATIVO (Fonte: BrAPI / B3) ---\n${lines.join('\n')}\n---`;
  } catch {
    return '';
  }
}

async function fetchCryptoContext(symbol: string): Promise<string> {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/crypto`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return '';
    const tickers = await res.json();
    const ticker = Array.isArray(tickers)
      ? tickers.find((t: { base: string }) => t.base === symbol.toUpperCase())
      : null;
    if (!ticker) return '';

    const lines: string[] = [
      `Ativo: ${symbol}/USDT`,
      `Preço atual: $${ticker.price?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '-'}`,
      `Variação 24h: ${ticker.changePercent24h?.toFixed(2) || '-'}%`,
      `Volume 24h: $${ticker.volume24h ? (ticker.volume24h / 1e6).toFixed(2) + 'M' : '-'}`,
      `Máx 24h: $${ticker.high24h?.toFixed(2) || '-'}`,
      `Mín 24h: $${ticker.low24h?.toFixed(2) || '-'}`,
    ];

    return `\n\n--- DADOS ATUAIS DO ATIVO (Fonte: Binance/Coinbase via CCXT) ---\n${lines.join('\n')}\n---`;
  } catch {
    return '';
  }
}

// ── OPENAI STREAMING ──────────────────────────────────────────────────────────
async function streamOpenAI(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string
): Promise<ReadableStream> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
      max_tokens: 1500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI error ${response.status}`);
  }

  const upstream = response.body!;
  const reader = upstream.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const encode = (text: string) => new TextEncoder().encode(text);
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              controller.enqueue(encode('data: [DONE]\n\n'));
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const text = parsed.choices?.[0]?.delta?.content;
              if (text) {
                controller.enqueue(encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            } catch { /* ignore */ }
          }
        }
      } finally {
        controller.enqueue(encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });
}

// ── ANTHROPIC STREAMING ───────────────────────────────────────────────────────
async function streamAnthropic(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string
): Promise<ReadableStream> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      system: systemPrompt,
      messages,
      stream: true,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic error ${response.status}`);
  }

  const upstream = response.body!;
  const reader = upstream.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const encode = (text: string) => new TextEncoder().encode(text);
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            try {
              const parsed = JSON.parse(data);
              const text = parsed.delta?.text;
              if (text) {
                controller.enqueue(encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            } catch { /* ignore */ }
          }
        }
      } finally {
        controller.enqueue(encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });
}

// ── GEMINI STREAMING ──────────────────────────────────────────────────────────
async function streamGemini(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string
): Promise<ReadableStream> {
  const geminiMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: geminiMessages,
        generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini error ${response.status}`);
  }

  const upstream = response.body!;
  const reader = upstream.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const encode = (text: string) => new TextEncoder().encode(text);
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                controller.enqueue(encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            } catch { /* ignore */ }
          }
        }
      } finally {
        controller.enqueue(encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, provider, apiKey, symbol, assetType, assetName } = body;

    if (!messages || !provider || !apiKey || !symbol) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    // Fetch contextual data from BrAPI / crypto APIs
    const context =
      assetType === 'stock'
        ? await fetchStockContext(symbol)
        : await fetchCryptoContext(symbol);

    const systemPrompt =
      SYSTEM_PROMPT +
      (context
        ? context
        : `\n\nAtivo em análise: ${assetName || symbol} (${assetType === 'stock' ? 'Ação B3' : 'Criptomoeda'})`);

    let stream: ReadableStream;

    switch (provider) {
      case 'chatgpt':
        stream = await streamOpenAI(apiKey, messages, systemPrompt);
        break;
      case 'claude':
        stream = await streamAnthropic(apiKey, messages, systemPrompt);
        break;
      case 'gemini':
        stream = await streamGemini(apiKey, messages, systemPrompt);
        break;
      default:
        return NextResponse.json({ error: 'Provedor de IA não suportado' }, { status: 400 });
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey } = await request.json();

    if (!provider || !apiKey) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    switch (provider) {
      case 'chatgpt': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) return NextResponse.json({ error: 'API Key do ChatGPT inválida' }, { status: 401 });
        break;
      }
      case 'claude': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });
        if (res.status === 401) return NextResponse.json({ error: 'API Key do Claude inválida' }, { status: 401 });
        break;
      }
      case 'gemini': {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        if (!res.ok) return NextResponse.json({ error: 'API Key do Gemini inválida' }, { status: 401 });
        break;
      }
      default:
        return NextResponse.json({ error: 'Provedor não suportado' }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao validar chave' }, { status: 500 });
  }
}

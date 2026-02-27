import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { cookies } from 'next/headers';

function loadConstitution(): string {
  try {
    const filePath = join(process.cwd(), 'TRADING_CONSTITUTION.md');
    return readFileSync(filePath, 'utf-8');
  } catch {
    return 'Você é um assistente especializado em trading de criptomoedas e prediction markets. Ajude o usuário a desenvolver e testar estratégias de trading, sempre priorizando backtests antes de qualquer implementação ao vivo.';
  }
}

function resolveApiKey(cookieName: string, envVar: string): string | undefined {
  const cookieStore = cookies();
  const fromCookie = cookieStore.get(cookieName)?.value;
  return fromCookie || process.env[envVar];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callClaude(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const apiKey = resolveApiKey('ai_anthropic_key', 'ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error(
      'Chave da API Anthropic não configurada. Clique em ⚙️ Configurar Chaves de API na página de A-Trading para adicionar sua chave.'
    );
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

async function callGemini(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const apiKey = resolveApiKey('ai_gemini_key', 'GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error(
      'Chave da API Gemini não configurada. Clique em ⚙️ Configurar Chaves de API na página de A-Trading para adicionar sua chave.'
    );
  }

  const geminiMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: geminiMessages,
        generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages é obrigatório' }, { status: 400 });
    }

    const systemPrompt = loadConstitution();
    let content: string;

    if (model === 'gemini') {
      content = await callGemini(systemPrompt, messages);
    } else {
      content = await callClaude(systemPrompt, messages);
    }

    return NextResponse.json({ content });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { loadSkill, SkillId } from '@/lib/agent-skills';
import { searchPinecone, PINECONE_NAMESPACES, PineconeNamespace, pineconeConfigured } from '@/lib/pinecone';
import { auth } from '@/auth';
import { rateLimit } from '@/lib/rate-limit';
import { requireEnv } from '@/lib/env';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBody {
  skill: SkillId;
  messages: ChatMessage[];
  context?: unknown;
}

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1500;
const MAX_TOOL_ROUNDS = 4;

const FORMAT_RULES = `# Output rules (apply to every response)

- Respond in GitHub-flavored Markdown. Use headings (##, ###), bullet lists, bold for key numbers, and tables when comparing values. The UI renders Markdown.
- Do NOT use emojis or emoticons anywhere in the response. No charts, rockets, checks, warnings etc. Replace with plain text labels (e.g. "Risco:", "Atenção:").
- Do not wrap the entire reply in a code block. Use code blocks only for code, tickers in tables, or short tabular data.
- Be concise. Prefer bullets over paragraphs.`;

const PINECONE_TOOL: Anthropic.Tool = {
  name: 'pinecone_search',
  description:
    'Search the institutional equity-research VectorDB (Pinecone, index "equity-research") for qualitative context on a company or theme. Use for management narrative, sell-side opinions, or filings — not for quantitative metrics. Returns hits with score and metadata. Empty results mean the namespace has no relevant document — do not fabricate. Available namespaces: earnings_calls (management commentary, guidance, Q&A), sell_side_reports (broker theses, target prices, ratings), filings (10-K/10-Q, 20-F, ITR/DFP, prospectuses).',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Natural-language semantic query. Be specific (ticker, theme, time horizon).' },
      namespace: {
        type: 'string',
        enum: [...PINECONE_NAMESPACES],
        description: 'Which corpus to search.',
      },
      top_k: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
    },
    required: ['query', 'namespace'],
  },
};

function buildSystem(skill: SkillId, context: unknown): Anthropic.TextBlockParam[] {
  const skillBody = loadSkill(skill);

  const blocks: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: `${skillBody}\n\n${FORMAT_RULES}`,
      cache_control: { type: 'ephemeral' },
    },
  ];

  if (context !== undefined && context !== null) {
    const json = JSON.stringify(context, null, 2);
    const truncated = json.length > 80_000 ? json.slice(0, 80_000) + '\n…[truncated]' : json;
    blocks.push({
      type: 'text',
      text: `# Live page context\n\nThis JSON is the live data the page is currently showing the user. Use it as ground truth.\n\n\`\`\`json\n${truncated}\n\`\`\``,
      cache_control: { type: 'ephemeral' },
    });
  }

  return blocks;
}

async function runPineconeTool(input: unknown): Promise<string> {
  const i = (input ?? {}) as { query?: string; namespace?: string; top_k?: number };
  if (!i.query || !i.namespace || !PINECONE_NAMESPACES.includes(i.namespace as PineconeNamespace)) {
    return JSON.stringify({ error: 'invalid input: require query and namespace in ' + PINECONE_NAMESPACES.join('|') });
  }
  const result = await searchPinecone(i.namespace as PineconeNamespace, i.query, i.top_k ?? 5);
  // Trim fields to keep token usage bounded.
  const compact = {
    namespace: result.namespace,
    empty: result.empty,
    error: result.error,
    hits: result.hits.map((h) => ({
      id: h.id,
      score: Number(h.score.toFixed(4)),
      fields: h.fields,
    })),
  };
  const json = JSON.stringify(compact);
  return json.length > 60_000 ? json.slice(0, 60_000) + '…[truncated]' : json;
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: 'agent_chat_post', limit: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'Muitas requisições' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const activeSub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: 'active' },
    select: { id: true },
  });
  if (!activeSub) {
    return new Response(JSON.stringify({ error: 'Assinatura ativa necessária' }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let apiKey = '';
  try {
    apiKey = requireEnv('ANTHROPIC_API_KEY');
  } catch {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { skill, messages, context } = body;
  if (!skill || !['crypto', 'equity', 'portfolio'].includes(skill)) {
    return new Response(JSON.stringify({ error: 'Skill inválida' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Mensagens são obrigatórias' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = new Anthropic({ apiKey });
  const system = buildSystem(skill, context);

  // Equity skill is the one with VectorDB grounding. Other skills don't get the tool.
  const tools: Anthropic.Tool[] | undefined = skill === 'equity' && pineconeConfigured() ? [PINECONE_TOOL] : undefined;

  const apiMessages: Anthropic.MessageParam[] = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const response = client.messages.stream({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system,
            messages: apiMessages,
            ...(tools ? { tools } : {}),
          });

          for await (const event of response) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              send('delta', { text: event.delta.text });
            }
          }

          const final = await response.finalMessage();

          if (final.stop_reason === 'tool_use') {
            const toolUses = final.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
            );

            apiMessages.push({ role: 'assistant', content: final.content });

            const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
              toolUses.map(async (tu) => {
                send('tool', { name: tu.name, input: tu.input });
                let resultText = '';
                if (tu.name === 'pinecone_search') {
                  resultText = await runPineconeTool(tu.input);
                } else {
                  resultText = JSON.stringify({ error: `unknown tool: ${tu.name}` });
                }
                return { type: 'tool_result', tool_use_id: tu.id, content: resultText };
              }),
            );

            apiMessages.push({ role: 'user', content: toolResults });
            continue;
          }

          break;
        }

        send('done', {});
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        send('error', { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

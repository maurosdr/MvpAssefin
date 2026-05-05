const API_VERSION = '2025-01';

export const PINECONE_NAMESPACES = ['earnings_calls', 'sell_side_reports', 'filings'] as const;
export type PineconeNamespace = (typeof PINECONE_NAMESPACES)[number];

export interface PineconeHit {
  id: string;
  score: number;
  fields: Record<string, unknown>;
}

export interface PineconeSearchResult {
  namespace: PineconeNamespace;
  hits: PineconeHit[];
  empty: boolean;
  error?: string;
}

function getConfig() {
  const apiKey = process.env.PINECONE_API_KEY;
  const host = process.env.PINECONE_HOST;
  if (!apiKey || !host) return null;
  return { apiKey, host: host.replace(/\/$/, '') };
}

export function pineconeConfigured(): boolean {
  return getConfig() !== null;
}

/**
 * Query Pinecone integrated-embedding index via search-records endpoint.
 * Returns hits with score + metadata fields. Empty array when namespace has no matches.
 */
export async function searchPinecone(
  namespace: PineconeNamespace,
  query: string,
  topK = 5,
): Promise<PineconeSearchResult> {
  const cfg = getConfig();
  if (!cfg) return { namespace, hits: [], empty: true, error: 'PINECONE_API_KEY/PINECONE_HOST not configured' };

  const url = `${cfg.host}/records/namespaces/${encodeURIComponent(namespace)}/search`;
  const body = {
    query: { inputs: { text: query }, top_k: Math.max(1, Math.min(topK, 10)) },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Api-Key': cfg.apiKey,
        'Content-Type': 'application/json',
        'X-Pinecone-API-Version': API_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { namespace, hits: [], empty: true, error: `pinecone ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = (await res.json()) as {
      result?: { hits?: Array<{ _id?: string; _score?: number; fields?: Record<string, unknown> }> };
    };

    const raw = json.result?.hits ?? [];
    const hits: PineconeHit[] = raw.map((h) => ({
      id: h._id ?? '',
      score: h._score ?? 0,
      fields: h.fields ?? {},
    }));

    return { namespace, hits, empty: hits.length === 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return { namespace, hits: [], empty: true, error: message };
  }
}

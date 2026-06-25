export interface SearchResult {
  title: string;
  content: string;
  url: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  answer?: string;
}

export async function searchWeb(
  query: string,
  apiKey: string,
  maxResults = 5
): Promise<SearchResponse> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      api_key: apiKey,
      max_results: maxResults,
      include_answer: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.status}`);
  }

  return (await response.json()) as SearchResponse;
}

export function formatSearchResults(results: SearchResponse): string {
  if (results.answer) {
    return `Respuesta rápida: ${results.answer}\n\nFuentes:\n${results.results
      .map((r) => `- ${r.title}: ${r.content}`)
      .join('\n')}`;
  }
  return results.results
    .map((r) => `${r.title}\n${r.content}\nURL: ${r.url}`)
    .join('\n\n');
}

export const SEARCH_TOOL = {
  type: 'function' as const,
  function: {
    name: 'web_search',
    description:
      'Buscar información actual en internet. Usá esta herramienta cuando el usuario pregunte sobre hechos, eventos, datos, precios, noticias o cualquier cosa que requiera información actual o externa.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'La consulta de búsqueda en español o inglés',
        },
      },
      required: ['query'],
    },
  },
};
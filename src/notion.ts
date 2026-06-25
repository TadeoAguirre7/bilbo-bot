const token = process.env.NOTION_TOKEN;
const databaseId = process.env.NOTION_DATABASE_ID;

if (!token) {
  throw new Error('NOTION_TOKEN is required');
}

if (!databaseId) {
  throw new Error('NOTION_DATABASE_ID is required');
}

export { token, databaseId };

export async function notionRequest<T = any>(
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
): Promise<T> {
  const url = `https://api.notion.com/v1/${path}`;
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(
      `Notion API error: ${response.status} ${JSON.stringify(data)}`,
    );
  }

  return data;
}

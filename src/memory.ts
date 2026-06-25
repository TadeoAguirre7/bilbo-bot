import { notion, databaseId } from './notion';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface NotionPage {
  id: string;
  properties: Record<string, any>;
}

interface NotionQueryResponse {
  results: NotionPage[];
}

export async function getHistory(
  chatId: string | number,
  limit: number
): Promise<ChatMessage[]> {
  const response = await notion.request<NotionQueryResponse>({
    path: `databases/${databaseId}/query`,
    method: 'post',
    body: {
      filter: {
        property: 'Chat ID',
        rich_text: {
          equals: String(chatId),
        },
      },
      sorts: [
        {
          property: 'Created At',
          direction: 'ascending',
        },
      ],
    },
  });

  return response.results.slice(0, limit).map((page) => ({
    role: page.properties.Role.select?.name as ChatMessage['role'],
    content: page.properties.Content.rich_text?.[0]?.plain_text ?? '',
  }));
}

export async function addMessage(
  chatId: string | number,
  role: ChatMessage['role'],
  content: string,
  model?: string
): Promise<void> {
  await notion.request({
    path: 'pages',
    method: 'post',
    body: {
      parent: { database_id: databaseId },
      properties: {
        'Chat ID': {
          title: [{ text: { content: String(chatId) } }],
        },
        Role: {
          select: { name: role },
        },
        Content: {
          rich_text: [{ text: { content } }],
        },
        Model: {
          rich_text: [{ text: { content: model ?? '' } }],
        },
        'Created At': {
          date: { start: new Date().toISOString() },
        },
      },
    },
  });
}

export async function clearHistory(chatId: string | number): Promise<void> {
  const response = await notion.request<NotionQueryResponse>({
    path: `databases/${databaseId}/query`,
    method: 'post',
    body: {
      filter: {
        property: 'Chat ID',
        rich_text: {
          equals: String(chatId),
        },
      },
    },
  });

  for (const page of response.results) {
    await notion.request({
      path: `pages/${page.id}`,
      method: 'patch',
      body: {
        archived: true,
      },
    });
  }
}

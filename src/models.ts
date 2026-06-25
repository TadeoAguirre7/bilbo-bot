export interface ZenModel {
  id: string;
  name?: string;
}

const ZEN_BASE_URL = 'https://opencode.ai/zen/v1';

export async function fetchZenModels(apiKey: string): Promise<ZenModel[]> {
  const response = await fetch(`${ZEN_BASE_URL}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { data?: ZenModel[] };

  return data.data ?? [];
}

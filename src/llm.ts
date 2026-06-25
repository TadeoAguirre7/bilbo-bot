import OpenAI from 'openai';
import { fetchZenModels } from './models';

const ZEN_BASE_URL = process.env.ZEN_BASE_URL ?? 'https://opencode.ai/zen/go/v1';

let zenClient: OpenAI | null = null;
let availableModels: string[] = [];

export function initLlm(apiKey: string): void {
  zenClient = new OpenAI({
    apiKey,
    baseURL: ZEN_BASE_URL,
  });
}

export async function loadAvailableModels(apiKey: string): Promise<string[]> {
  try {
    const models = await fetchZenModels(apiKey);
    availableModels = models.map((m) => m.id);
    console.log(`Loaded ${availableModels.length} models from Zen`);
    return availableModels;
  } catch (error) {
    console.error('Failed to load Zen models:', error);
    availableModels = [];
    return availableModels;
  }
}

export function getAvailableModels(): string[] {
  return availableModels;
}

export function isModelAvailable(modelId: string): boolean {
  return availableModels.includes(modelId);
}

export async function generateResponse(
  modelId: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
): Promise<string> {
  if (!zenClient) {
    throw new Error('LLM not initialized. Call initLlm first.');
  }

  const response = await zenClient.chat.completions.create({
    model: modelId,
    messages,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from model');
  }

  return content;
}

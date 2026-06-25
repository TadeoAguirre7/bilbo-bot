import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { fetchZenModels } from './models';
import { searchWeb, formatSearchResults, SEARCH_TOOL } from './tools';

const ZEN_BASE_URL =
  process.env.ZEN_BASE_URL ?? 'https://opencode.ai/zen/go/v1';

const tavilyApiKey = process.env.TAVILY_API_KEY;

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
    console.log(`Loaded ${availableModels.length} models from Go`);
    return availableModels;
  } catch (error) {
    console.error('Failed to load models:', error);
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

const tools: ChatCompletionTool[] = tavilyApiKey ? [SEARCH_TOOL] : [];

export async function generateResponse(
  modelId: string,
  messages: ChatCompletionMessageParam[]
): Promise<string> {
  if (!zenClient) {
    throw new Error('LLM not initialized. Call initLlm first.');
  }

  let currentMessages = [...messages];

  for (let iteration = 0; iteration < 3; iteration++) {
    const response = await zenClient.chat.completions.create({
      model: modelId,
      messages: currentMessages,
      ...(tools.length > 0 ? { tools } : {}),
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No response from model');
    }

    const assistantMessage = choice.message;

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && tavilyApiKey) {
      currentMessages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const fn = (toolCall as any).function;
        if (!fn || fn.name !== 'web_search') continue;
        const args = JSON.parse(fn.arguments);
        const query: string = args.query;
        console.log(`[search] ${query}`);

        try {
          const results = await searchWeb(query, tavilyApiKey);
          const formatted = formatSearchResults(results);
          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: formatted,
          });
        } catch (error) {
          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `Search failed: ${(error as Error).message}`,
          });
        }
      }

      continue;
    }

    const content = assistantMessage.content;
    if (!content) {
      throw new Error('Empty response from model');
    }

    return content;
  }

  throw new Error('Too many tool call iterations');
}
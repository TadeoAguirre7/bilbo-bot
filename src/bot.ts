import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getHistory, addMessage, clearHistory } from './memory';
import { generateResponse, getAvailableModels, isModelAvailable } from './llm';

const DEFAULT_MODEL = process.env.DEFAULT_MODEL ?? 'kimi-k2.5';
const MAX_HISTORY = parseInt(process.env.MAX_HISTORY ?? '20', 10);

const chatModels = new Map<string, string>();

function getChatModel(chatId: string): string {
  return chatModels.get(chatId) ?? DEFAULT_MODEL;
}

function setChatModel(chatId: string, modelId: string): void {
  chatModels.set(chatId, modelId);
}

export function createBot(token: string): Telegraf {
  const bot = new Telegraf(token);

  bot.start((ctx) => {
    ctx.reply(
      '¡Hola! Soy Bilbo. Estoy conectado a OpenCode Go y puedo buscar en internet.\n\n' +
        'Comandos:\n' +
        '/model <nombre> — Cambiar modelo\n' +
        '/models — Listar modelos disponibles\n' +
        '/clear — Borrar mi memoria\n' +
        '/help — Ver ayuda'
    );
  });

  bot.help((ctx) => {
    ctx.reply(
      'Comandos disponibles:\n' +
        '/model <nombre> — Cambiar modelo (ej: /model glm-5.2)\n' +
        '/models — Listar modelos disponibles\n' +
        '/clear — Borrar el historial de conversación\n' +
        '/help — Ver esta ayuda\n\n' +
        'Si me preguntás algo que necesita info actual, busco en internet automáticamente.\n\n' +
        `Modelo por defecto: ${DEFAULT_MODEL}`
    );
  });

  bot.command('models', async (ctx) => {
    const models = getAvailableModels();
    if (models.length === 0) {
      await ctx.reply('No pude cargar la lista de modelos. Intentá más tarde.');
      return;
    }

    const currentModel = getChatModel(String(ctx.chat.id));
    const list = models.map((m) => (m === currentModel ? `• ${m} ✅` : `• ${m}`)).join('\n');

    await ctx.reply(`Modelos disponibles:\n${list}\n\nUsá /model <nombre> para cambiar.`);
  });

  bot.command('model', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const modelId = args[0];
    const chatId = String(ctx.chat.id);

    if (!modelId) {
      const current = getChatModel(chatId);
      await ctx.reply(`Modelo actual: ${current}\n\nUsá /model <nombre> para cambiar.`);
      return;
    }

    if (!isModelAvailable(modelId)) {
      await ctx.reply(`El modelo "${modelId}" no está disponible. Usá /models para ver la lista.`);
      return;
    }

    setChatModel(chatId, modelId);
    await ctx.reply(`Modelo cambiado a: ${modelId}`);
  });

  bot.command('clear', async (ctx) => {
    await clearHistory(ctx.chat.id);
    await ctx.reply('Memoria borrada. Empezamos de nuevo.');
  });

  bot.on(message('text'), async (ctx) => {
    const chatId = String(ctx.chat.id);
    const userMessage = ctx.message.text;
    const modelId = getChatModel(chatId);

    try {
      await ctx.sendChatAction('typing');

      const history = await getHistory(chatId, MAX_HISTORY);
      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content:
            'Sos Bilbo, un asistente útil y conciso. ' +
            'Tenés memoria de conversación: recordás los mensajes anteriores de este chat. ' +
            'Cuando te pregunten sobre hechos, eventos, datos, precios o noticias, ' +
            'usá la herramienta web_search para buscar información actual en internet.',
        },
        ...history.map((m) => ({ role: m.role, content: m.content }) as ChatCompletionMessageParam),
        { role: 'user', content: userMessage },
      ];

      const response = await generateResponse(modelId, messages);

      await addMessage(chatId, 'user', userMessage, modelId);
      await addMessage(chatId, 'assistant', response, modelId);

      await ctx.reply(response);
    } catch (error) {
      console.error('Error generating response:', error);
      await ctx.reply('Ups, algo salió mal. Probá de nuevo más tarde.');
    }
  });

  return bot;
}

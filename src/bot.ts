import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getHistory, addMessage, clearHistory } from './memory';
import { generateResponse, getAvailableModels, isModelAvailable } from './llm';
import { processFile } from './files';

const DEFAULT_MODEL = process.env.DEFAULT_MODEL ?? 'kimi-k2.5';
const MAX_HISTORY = parseInt(process.env.MAX_HISTORY ?? '20', 10);

const chatModels = new Map<string, string>();

function getChatModel(chatId: string): string {
  return chatModels.get(chatId) ?? DEFAULT_MODEL;
}

function setChatModel(chatId: string, modelId: string): void {
  chatModels.set(chatId, modelId);
}

const SYSTEM_PROMPT =
  'Sos Bilbo, un asistente útil y conciso.\n\n' +
  'MEMORIA: Tenés memoria persistente. Cada mensaje de este chat se guarda en una base de datos de Notion. ' +
  'Cuando el usuario te hace una pregunta, los mensajes anteriores de la conversación se incluyen automáticamente en tu contexto. ' +
  'Si el usuario te pregunta "qué te dije antes" o "tenés memoria", la respuesta es SÍ: ' +
  'podés ver los mensajes anteriores en tu contexto. NUNCA digas que no tenés memoria o que no tenés acceso a Notion, ' +
  'porque sí tenés. La memoria funciona incluyendo los mensajes previos automáticamente.\n\n' +
  'ARCHIVOS E IMÁGENES: El usuario puede enviarte imágenes (fotos) y archivos (PDFs, documentos de texto, código). ' +
  'Cuando lo hace, el contenido del archivo o la imagen se incluye directamente en el mensaje para que lo veas.\n\n' +
  'BÚSQUEDA WEB: Cuando te pregunten sobre hechos, eventos, datos, precios o noticias actuales, ' +
  'usá la herramienta web_search para buscar información en internet.\n\n' +
  'Importante: nunca digas "no tengo acceso a memoria externa" o "no estoy conectado a Notion". ' +
  'Sí lo estás. Los mensajes anteriores están en tu contexto ahora mismo.';

function buildHistoryMessages(history: { role: string; content: string }[]): ChatCompletionMessageParam[] {
  return history.map(
    (m) => ({ role: m.role, content: m.content }) as ChatCompletionMessageParam
  );
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
        '/help — Ver ayuda\n\n' +
        'También puedo leer imágenes, PDFs y archivos de texto que me mandes.'
    );
  });

  bot.help((ctx) => {
    ctx.reply(
      'Comandos disponibles:\n' +
        '/model <nombre> — Cambiar modelo (ej: /model glm-5.2)\n' +
        '/models — Listar modelos disponibles\n' +
        '/clear — Borrar el historial de conversación\n' +
        '/help — Ver esta ayuda\n\n' +
        'También puedo leer imágenes, PDFs y archivos de texto que me mandes.\n\n' +
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
        { role: 'system', content: SYSTEM_PROMPT },
        ...buildHistoryMessages(history),
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

  bot.on(message('photo'), async (ctx) => {
    const chatId = String(ctx.chat.id);
    const modelId = getChatModel(chatId);
    const photos = ctx.message.photo;
    const largest = photos[photos.length - 1];
    const caption = ctx.message.caption ?? '';

    try {
      await ctx.sendChatAction('typing');

      const fileInfo = await processFile(ctx.telegram, {
        fileId: largest.file_id,
        mimeType: 'image/jpeg',
      });

      const history = await getHistory(chatId, MAX_HISTORY);
      const userText = caption || 'Mira esta imagen';

      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...buildHistoryMessages(history),
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            {
              type: 'image_url',
              image_url: { url: `data:${fileInfo.mimeType};base64,${fileInfo.content}` },
            },
          ],
        } as ChatCompletionMessageParam,
      ];

      const response = await generateResponse(modelId, messages);

      await addMessage(chatId, 'user', `[Imagen] ${userText}`, modelId);
      await addMessage(chatId, 'assistant', response, modelId);

      await ctx.reply(response);
    } catch (error) {
      console.error('Error processing photo:', error);
      await ctx.reply('Ups, no pude procesar la imagen.');
    }
  });

  bot.on(message('document'), async (ctx) => {
    const chatId = String(ctx.chat.id);
    const modelId = getChatModel(chatId);
    const doc = ctx.message.document;
    const caption = ctx.message.caption ?? '';

    try {
      await ctx.sendChatAction('typing');

      const fileInfo = await processFile(ctx.telegram, {
        fileId: doc.file_id,
        fileName: doc.file_name ?? undefined,
        mimeType: doc.mime_type ?? undefined,
      });

      if (fileInfo.type === 'unsupported') {
        await ctx.reply(fileInfo.content);
        return;
      }

      const history = await getHistory(chatId, MAX_HISTORY);

      if (fileInfo.type === 'image') {
        const userText = caption || `Mira esta imagen (${fileInfo.fileName ?? 'archivo'})`;
        const messages: ChatCompletionMessageParam[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...buildHistoryMessages(history),
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              {
                type: 'image_url',
                image_url: { url: `data:${fileInfo.mimeType};base64,${fileInfo.content}` },
              },
            ],
          } as ChatCompletionMessageParam,
        ];

        const response = await generateResponse(modelId, messages);

        await addMessage(chatId, 'user', `[Imagen] ${userText}`, modelId);
        await addMessage(chatId, 'assistant', response, modelId);

        await ctx.reply(response);
        return;
      }

      const userContent = caption
        ? `${caption}\n\n---\n\n${fileInfo.content}`
        : fileInfo.content;

      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...buildHistoryMessages(history),
        { role: 'user', content: userContent },
      ];

      const response = await generateResponse(modelId, messages);

      const storedContent = fileInfo.fileName
        ? `[Archivo: ${fileInfo.fileName}] ${userContent.slice(0, 300)}${userContent.length > 300 ? '...' : ''}`
        : userContent.slice(0, 300);
      await addMessage(chatId, 'user', storedContent, modelId);
      await addMessage(chatId, 'assistant', response, modelId);

      await ctx.reply(response);
    } catch (error) {
      console.error('Error processing document:', error);
      await ctx.reply('Ups, no pude procesar el archivo.');
    }
  });

  return bot;
}

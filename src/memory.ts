import { prisma } from './db';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function getHistory(
  chatId: string | number,
  limit: number
): Promise<ChatMessage[]> {
  const messages = await prisma.message.findMany({
    where: { chatId: String(chatId) },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  return messages.map((m) => ({
    role: m.role as ChatMessage['role'],
    content: m.content,
  }));
}

export async function addMessage(
  chatId: string | number,
  role: ChatMessage['role'],
  content: string,
  model?: string
): Promise<void> {
  await prisma.message.create({
    data: {
      chatId: String(chatId),
      role,
      content,
      model,
    },
  });
}

export async function clearHistory(chatId: string | number): Promise<void> {
  await prisma.message.deleteMany({
    where: { chatId: String(chatId) },
  });
}

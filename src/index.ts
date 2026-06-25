import 'dotenv/config';
import { createBot } from './bot';
import { initLlm, loadAvailableModels } from './llm';

async function main(): Promise<void> {
  const token = process.env.BOT_TOKEN;
  const zenApiKey = process.env.ZEN_API_KEY;

  if (!token) {
    throw new Error('BOT_TOKEN is required');
  }

  if (!zenApiKey) {
    throw new Error('ZEN_API_KEY is required');
  }

  initLlm(zenApiKey);
  await loadAvailableModels(zenApiKey);

  const bot = createBot(token);

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  bot.launch();
  console.log('Bilbo is running...');
}

main().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});

import { Client } from '@notionhq/client';

const token = process.env.NOTION_TOKEN;
const rawDatabaseId = process.env.NOTION_DATABASE_ID;

if (!token) {
  throw new Error('NOTION_TOKEN is required');
}

if (!rawDatabaseId) {
  throw new Error('NOTION_DATABASE_ID is required');
}

export const notion = new Client({ auth: token });
export const databaseId: string = rawDatabaseId;

import { Telegraf } from 'telegraf';
import { PDFParse } from 'pdf-parse';

export interface ProcessedFile {
  type: 'image' | 'text' | 'pdf' | 'unsupported';
  content: string;
  mimeType?: string;
  fileName?: string;
}

const TEXT_EXTENSIONS = [
  '.txt', '.md', '.markdown', '.json', '.csv', '.tsv', '.xml', '.yaml', '.yml',
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.go',
  '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.sh', '.bash', '.zsh',
  '.sql', '.html', '.htm', '.css', '.scss', '.less', '.vue', '.svelte',
  '.env', '.gitignore', '.dockerfile', '.toml', '.ini', '.cfg', '.conf',
];

function getExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  const dotIndex = lower.lastIndexOf('.');
  if (dotIndex === -1) return '';
  return lower.slice(dotIndex);
}

export async function downloadTelegramFile(
  telegram: Telegraf['telegram'],
  fileId: string
): Promise<Buffer> {
  const link = await telegram.getFileLink(fileId);
  const response = await fetch(link);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function processFile(
  telegram: Telegraf['telegram'],
  fileInfo: {
    fileId: string;
    fileName?: string;
    mimeType?: string;
  }
): Promise<ProcessedFile> {
  const { fileId, fileName, mimeType } = fileInfo;
  const buffer = await downloadTelegramFile(telegram, fileId);

  if (fileName) {
    const ext = getExtension(fileName);

    if (ext === '.pdf') {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      const text = result.text.trim();
      return {
        type: 'pdf',
        content: text || '(PDF vacío o sin texto extraíble)',
        mimeType: 'application/pdf',
        fileName,
      };
    }

    if (TEXT_EXTENSIONS.includes(ext)) {
      const text = buffer.toString('utf-8');
      return {
        type: 'text',
        content: text,
        mimeType: mimeType ?? 'text/plain',
        fileName,
      };
    }

    if (mimeType?.startsWith('image/')) {
      return {
        type: 'image',
        content: buffer.toString('base64'),
        mimeType,
        fileName,
      };
    }
  }

  if (mimeType?.startsWith('image/')) {
    return {
      type: 'image',
      content: buffer.toString('base64'),
      mimeType,
      fileName,
    };
  }

  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return {
      type: 'pdf',
      content: result.text.trim() || '(PDF vacío o sin texto extraíble)',
      mimeType,
      fileName,
    };
  }

  if (mimeType?.startsWith('text/') || mimeType === 'application/json') {
    const text = buffer.toString('utf-8');
    return {
      type: 'text',
      content: text,
      mimeType,
      fileName,
    };
  }

  return {
    type: 'unsupported',
    content: 'Formato no soportado. Podés enviar imágenes, PDFs y archivos de texto.',
    fileName,
  };
}
# Bilbo Bot

Bot de Telegram conectado a los modelos de OpenCode Zen, con memoria de conversación mediante Notion.

## Variables de entorno

```bash
BOT_TOKEN=              # Token del bot de Telegram (@BotFather)
ZEN_API_KEY=            # API key de OpenCode Zen
NOTION_TOKEN=           # Token de integración de Notion
NOTION_DATABASE_ID=     # ID de la base de datos de Notion
DEFAULT_MODEL=big-pickle # Modelo por defecto
MAX_HISTORY=20          # Cantidad de mensajes a recordar por chat
```

## Comandos del bot

- `/start` — Iniciar conversación
- `/help` — Ver ayuda
- `/models` — Listar modelos disponibles en Zen
- `/model <nombre>` — Cambiar de modelo (ej: `/model big-pickle`)
- `/clear` — Borrar el historial del chat

## Base de datos de Notion

La base de datos debe tener estas propiedades:

| Propiedad | Tipo |
|-----------|------|
| `Chat ID` | Title |
| `Role` | Select |
| `Content` | Text |
| `Model` | Text |
| `Created At` | Date |

## Desarrollo local

```bash
npm install
npm run build
npm run dev
```

## Deploy en Railway

1. Crear un nuevo proyecto en Railway.
2. Configurar las variables de entorno.
3. Deployar el proyecto (Railway detecta el `Dockerfile`).

## Nota sobre créditos

Algunos modelos de Zen son gratuitos (por ejemplo `big-pickle`, `deepseek-v4-flash-free`). Los modelos pagos requieren créditos cargados en tu cuenta de OpenCode Zen.

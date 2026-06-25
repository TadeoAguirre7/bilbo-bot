# Bilbo Bot

Bot de Telegram conectado a los modelos de OpenCode Zen, con memoria de conversación mediante PostgreSQL.

## Variables de entorno

```bash
BOT_TOKEN=              # Token del bot de Telegram (@BotFather)
ZEN_API_KEY=            # API key de OpenCode Zen
DATABASE_URL=           # URL de PostgreSQL
DEFAULT_MODEL=kimi-k2.5 # Modelo por defecto
MAX_HISTORY=20          # Cantidad de mensajes a recordar por chat
```

## Comandos del bot

- `/start` — Iniciar conversación
- `/help` — Ver ayuda
- `/models` — Listar modelos disponibles en Zen
- `/model <nombre>` — Cambiar de modelo (ej: `/model big-pickle`)
- `/clear` — Borrar el historial del chat

## Desarrollo local

```bash
npm install
npm run db:generate
npm run build
npm run dev
```

## Deploy en Railway

1. Crear un nuevo proyecto en Railway.
2. Agregar un servicio **PostgreSQL**.
3. Configurar las variables de entorno.
4. Deployar el proyecto (Railway detecta el `Dockerfile`).
5. Las migraciones se aplican automáticamente al iniciar el contenedor.

## Nota sobre créditos

Algunos modelos de Zen son gratuitos (por ejemplo `big-pickle`, `deepseek-v4-flash-free`). Los modelos pagos requieren créditos cargados en tu cuenta de OpenCode Zen.

# publish-mcp

Контент-завод на базе AI в виде MCP-сервера. Генерация, перевод и публикация контента в **Telegram**, **VK**, **MAX** и **Threads** из Claude Code, Cursor или любого MCP-клиента.

Одна строка конфига. Полный пайплайн: настройка бренда, анализ конкурентов, поиск источников, AI-генерация текста, генерация картинок, мультиканальная публикация.

## Быстрый старт

Добавьте в конфиг Claude Desktop / Cursor:

```json
{
  "mcpServers": {
    "publish": {
      "command": "npx",
      "args": ["-y", "content-factory-mcp"],
      "env": {
        "TELEGRAM_BOT_TOKEN": "123456:ABC-DEF...",
        "TELEGRAM_CHAT_ID": "@my_channel",
        "GEMINI_API_KEY": "AIza..."
      }
    }
  }
}
```

Затем попросите AI-агента:

> "Настрой бренд для ниши AI в образовании, найди источники контента, сгенерируй пост, создай картинку и опубликуй в Telegram"

## Инструменты (11 штук)

### Контент-завод

| Инструмент | Описание |
|------------|----------|
| `setup_brand` | Настройка ниши, тона, аудитории, структуры постов, примеров |
| `get_brand` | Показать текущий профиль бренда |
| `analyze_competitors` | Парсинг и AI-анализ контент-стратегии конкурентов |
| `find_sources` | Поиск RSS-лент, парсинг сайтов, AI-поиск источников по нише |
| `generate_post` | Генерация поста из темы или источника с учётом голоса бренда |
| `translate_post` | Перевод постов на любой язык с сохранением стиля |
| `generate_media` | Генерация картинок через Gemini Imagen или DALL-E |

### Публикация

| Инструмент | Описание |
|------------|----------|
| `publish` | Публикация текста и картинки в один канал |
| `publish_all` | Публикация во все настроенные каналы разом |
| `list_channels` | Список настроенных каналов |
| `preview` | Превью без отправки (dry-run) |

## Пример полного пайплайна

```
Вы (в Claude Code):
  "Я веду фитнес-блог. Настрой бренд, проанализируй конкурента
   @fitnessguru, найди источники контента, напиши пост про
   утренние привычки, сгенерируй картинку и опубликуй в Telegram."

Claude Code вызывает:
  1. setup_brand(niche="fitness", tone="motivational", ...)
  2. analyze_competitors(urls=["https://fitnessguru.com"])
  3. find_sources(action="discover", niche="fitness")
  4. generate_post(topic="5 утренних привычек для энергии")
  5. generate_media(post_text="<сгенерированный пост>")
  6. publish(text="<пост>", image_url="<картинка>", channel="telegram")
```

## Переменные окружения

### Публикация (нужна хотя бы одна платформа)

```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=@my_channel

VK_ACCESS_TOKEN=vk1.a.xxx
VK_GROUP_ID=12345678
VK_USER_TOKEN=vk1.a.yyy          # опционально, для загрузки фото

MAX_BOT_TOKEN=xxx
MAX_CHAT_ID=-12345678

THREADS_ACCESS_TOKEN=xxx
THREADS_USER_ID=12345678
```

### AI-бэкенд (нужен для инструментов контент-завода)

Установите ОДИН из вариантов. Приоритет: явный `AI_PROVIDER` > первый найденный ключ.

```
# Gemini (есть бесплатный тариф)
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash         # опционально

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini              # опционально

# Claude (Anthropic)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514  # опционально

# Ollama (локально, бесплатно, без API-ключа)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1                  # опционально

# Любой OpenAI-совместимый API (Together, Groq, Fireworks, LM Studio и др.)
OPENAI_COMPATIBLE_BASE_URL=https://api.together.xyz/v1
OPENAI_COMPATIBLE_API_KEY=xxx
OPENAI_COMPATIBLE_MODEL=meta-llama/Llama-3.1-70B-Instruct

# Явный выбор провайдера (перекрывает авто-определение)
AI_PROVIDER=gemini|openai|anthropic|ollama|openai-compatible
```

### Мультиканальная конфигурация

```
PUBLISH_CHANNELS=[{"name":"my-tg","platform":"telegram","token":"...","chatId":"@chan"},{"name":"my-vk","platform":"vk","token":"...","chatId":"123","groupId":"123"}]
```

### Хранилище

```
PUBLISH_MCP_DATA_DIR=/path/to/data  # опционально, по умолчанию: ./.publish-mcp
```

## Платформы

| Платформа | Авторизация | Публикация |
|-----------|-------------|------------|
| Telegram | Токен бота + админ в канале | sendMessage / sendPhoto |
| VK | Токен сообщества (+ токен пользователя для фото) | wall.post |
| MAX | Токен бота | sendMessage + фото |
| Threads | Long-lived access token | Container + publish API |

## AI-провайдеры

| Провайдер | Текст | Картинки | Стоимость |
|-----------|-------|----------|-----------|
| Gemini | gemini-2.5-flash | Gemini Imagen | Бесплатный tier |
| OpenAI | gpt-4o-mini | DALL-E 3 | Платный |
| Claude | claude-sonnet-4 | Нет | Платный |
| Ollama | llama3.1, mistral и др. | Нет | Бесплатно (локально) |
| OpenAI-compatible | Любая модель | Зависит от API | Разные |

## Разработка

```bash
npm install
npm run build
node dist/index.js  # запуск MCP-сервера на stdio
```

## Лицензия

MIT

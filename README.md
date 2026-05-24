# publish-mcp

AI-powered content factory as an MCP server. Generate, translate, and publish content to **Telegram**, **VK**, **MAX**, and **Threads** from Claude Code, Cursor, or any MCP client.

One config snippet. Full content pipeline: brand setup, competitor analysis, source discovery, AI writing, image generation, multi-channel publishing.

## Quick Start

```json
{
  "mcpServers": {
    "publish": {
      "command": "npx",
      "args": ["-y", "publish-mcp"],
      "env": {
        "TELEGRAM_BOT_TOKEN": "123456:ABC-DEF...",
        "TELEGRAM_CHAT_ID": "@my_channel",
        "GEMINI_API_KEY": "AIza..."
      }
    }
  }
}
```

Then ask your AI agent:

> "Set up my brand for the AI education niche, find content sources, generate a post, create an image, and publish to Telegram"

## Tools (11 total)

### Content Factory

| Tool | Description |
|------|-------------|
| `setup_brand` | Configure niche, tone of voice, audience, post structure, sample posts |
| `get_brand` | Show current brand profile |
| `analyze_competitors` | Scrape competitor pages, analyze their content strategy with AI |
| `find_sources` | Discover RSS feeds, scrape websites, or AI-discover sources for your niche |
| `generate_post` | Generate a post from topic or source material, using brand voice |
| `translate_post` | Translate posts to any language, maintaining brand voice |
| `generate_media` | Generate images via Gemini Imagen or DALL-E |

### Publishing

| Tool | Description |
|------|-------------|
| `publish` | Publish text + optional image to a single channel |
| `publish_all` | Publish to all configured channels at once |
| `list_channels` | Show configured channels |
| `preview` | Dry-run: see what would be published |

## Full Pipeline Example

```
You (to Claude Code):
  "I run a fitness blog. Set up my brand, analyze my competitor
   @fitnessguru, find content sources, write a post about
   morning routines, generate an image, and publish to Telegram."

Claude Code calls:
  1. setup_brand(niche="fitness", tone="motivational", ...)
  2. analyze_competitors(urls=["https://fitnessguru.com"])
  3. find_sources(action="discover", niche="fitness")
  4. generate_post(topic="5 morning routines for energy")
  5. generate_media(post_text="<generated post>")
  6. publish(text="<post>", image_url="<image>", channel="telegram")
```

## Environment Variables

### Publishing (at least one platform required)

```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=@my_channel

VK_ACCESS_TOKEN=vk1.a.xxx
VK_GROUP_ID=12345678
VK_USER_TOKEN=vk1.a.yyy          # optional, for photo uploads

MAX_BOT_TOKEN=xxx
MAX_CHAT_ID=-12345678

THREADS_ACCESS_TOKEN=xxx
THREADS_USER_ID=12345678
```

### AI Backend (required for content factory tools)

Set ONE of these. Priority: explicit `AI_PROVIDER` > first key found.

```
# Gemini (free tier available)
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash         # optional

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini              # optional

# Claude (Anthropic)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514  # optional

# Ollama (local, free, no API key)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1                  # optional

# Any OpenAI-compatible API (Together, Groq, Fireworks, LM Studio, etc.)
OPENAI_COMPATIBLE_BASE_URL=https://api.together.xyz/v1
OPENAI_COMPATIBLE_API_KEY=xxx
OPENAI_COMPATIBLE_MODEL=meta-llama/Llama-3.1-70B-Instruct

# Force specific provider (overrides auto-detection)
AI_PROVIDER=gemini|openai|anthropic|ollama|openai-compatible
```

### Multi-Channel Config

```
PUBLISH_CHANNELS=[{"name":"my-tg","platform":"telegram","token":"...","chatId":"@chan"},{"name":"my-vk","platform":"vk","token":"...","chatId":"123","groupId":"123"}]
```

### Storage

```
PUBLISH_MCP_DATA_DIR=/path/to/data  # optional, default: ./.publish-mcp
```

## Platforms

| Platform | Auth | Publishing |
|----------|------|-----------|
| Telegram | Bot token + admin in channel | sendMessage / sendPhoto |
| VK | Community token (+ user token for photos) | wall.post |
| MAX | Bot token | sendMessage + photo |
| Threads | Long-lived access token | Container + publish API |

## Development

```bash
npm install
npm run build
node dist/index.js  # starts MCP server on stdio
```

## License

MIT

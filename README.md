# publish-mcp

MCP server for publishing content to **Telegram**, **VK**, **MAX**, and **Threads** from AI coding agents.

One tool call from Claude Code, Cursor, or any MCP client, your post is live.

## Quick Start

Add to your Claude Desktop / Cursor MCP config:

```json
{
  "mcpServers": {
    "publish": {
      "command": "npx",
      "args": ["-y", "publish-mcp"],
      "env": {
        "TELEGRAM_BOT_TOKEN": "123456:ABC-DEF...",
        "TELEGRAM_CHAT_ID": "@my_channel"
      }
    }
  }
}
```

That's it. Your AI agent now has a `publish` tool.

## Tools

| Tool | Description |
|------|-------------|
| `publish` | Publish text + optional image to a single channel |
| `publish_all` | Publish to all configured channels at once |
| `list_channels` | Show configured channels |
| `preview` | Dry-run: see what would be published |

## Platforms

### Telegram

```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=@my_channel
```

Bot must be added as admin to the channel with "Post Messages" permission.

### VK

```
VK_ACCESS_TOKEN=vk1.a.xxx
VK_GROUP_ID=12345678
VK_USER_TOKEN=vk1.a.yyy  # optional, for photo uploads
```

### MAX (ok.ru/max)

```
MAX_BOT_TOKEN=xxx
MAX_CHAT_ID=-12345678
```

### Threads (Meta)

```
THREADS_ACCESS_TOKEN=xxx
THREADS_USER_ID=12345678
```

## Multi-Channel Config

For multiple channels, use the `PUBLISH_CHANNELS` env var with a JSON array:

```json
{
  "PUBLISH_CHANNELS": "[{\"name\":\"my-tg\",\"platform\":\"telegram\",\"token\":\"123:ABC\",\"chatId\":\"@chan\"},{\"name\":\"my-vk\",\"platform\":\"vk\",\"token\":\"vk1.a.xxx\",\"chatId\":\"12345\",\"groupId\":\"12345\"}]"
}
```

## Examples

**Claude Code:**
> "Write a short post about our new feature and publish it to my Telegram channel"

The agent will call the `publish` tool with the generated text.

**Multi-channel:**
> "Publish this announcement to all my channels"

The agent will call `publish_all`.

## Development

```bash
npm install
npm run build
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/index.js
```

## License

MIT

# MCP Server for npm Distribution: Patterns & Reference

**Project:** publish-mcp
**Researched:** 2026-05-24
**SDK version:** @modelcontextprotocol/sdk ^1.29.0

---

## 1. Minimal MCP Server (stdio, TypeScript)

```typescript
#!/usr/bin/env node
// src/index.ts

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "publish-mcp",
  version: "0.1.0",
});

// Register a tool
server.registerTool(
  "publish_post",
  {
    description: "Publish a post to a social platform",
    inputSchema: {
      platform: z.enum(["telegram", "vk", "max", "threads"]),
      text: z.string().describe("Post content, supports markdown"),
      media_urls: z.array(z.string().url()).optional().describe("Attached image/video URLs"),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,   // publishing twice = two posts
      openWorldHint: true,     // hits external APIs
    },
  },
  async ({ platform, text, media_urls }) => {
    // implementation here
    return {
      content: [{ type: "text", text: `Published to ${platform}` }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
```

**Key imports (SDK 1.29+):**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// For low-level protocol errors:
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
```

**Class is `McpServer`, not `Server`.** Method is `registerTool()`, not `tool()`.

---

## 2. Project Structure (from official servers repo)

```
publish-mcp/
  src/
    index.ts          # #!/usr/bin/env node at top
    platforms/
      telegram.ts
      vk.ts
      max.ts
      threads.ts
  dist/               # compiled output
  package.json
  tsconfig.json
  smithery.yaml       # for Smithery listing
```

### package.json (reference pattern from @modelcontextprotocol/server-filesystem)

```json
{
  "name": "@anthropic/publish-mcp",
  "version": "0.1.0",
  "description": "MCP server for publishing content to Telegram, VK, MAX, Threads",
  "type": "module",
  "bin": {
    "publish-mcp": "dist/index.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc && shx chmod +x dist/*.js",
    "prepare": "npm run build",
    "watch": "tsc --watch",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22",
    "shx": "^0.3.4",
    "typescript": "^5.8.2"
  },
  "license": "MIT",
  "engines": {
    "node": ">=18"
  }
}
```

**Critical fields for npx support:**
- `"type": "module"` -- ES modules
- `"bin"` -- maps CLI name to dist/index.js
- `"files": ["dist"]` -- only publish compiled code
- `"prepare": "npm run build"` -- auto-build on install

**The `shx chmod +x dist/*.js` in build script** is needed because tsc doesn't preserve the shebang's executable permission. `shx` is a cross-platform shell utility.

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.test.ts"]
}
```

---

## 3. Tool Definition Patterns

### Basic tool with Zod schema

```typescript
server.registerTool(
  "tool_name",
  {
    title: "Human-Readable Title",        // optional, shown in UI
    description: "What this tool does",    // required, LLM reads this
    inputSchema: {
      param1: z.string(),
      param2: z.number().optional(),
    },
  },
  async ({ param1, param2 }) => ({
    content: [{ type: "text", text: "result" }],
  })
);
```

The SDK auto-converts Zod schemas to JSON Schema for the wire protocol. The handler receives typed, validated args.

### Tool annotations (hint system)

```typescript
annotations: {
  readOnlyHint: true,      // doesn't modify anything
  destructiveHint: false,  // doesn't delete data
  idempotentHint: true,    // safe to retry
  openWorldHint: true,     // makes external API calls
}
```

### Error handling -- two patterns

**Domain error** (LLM can see and react):
```typescript
return {
  content: [{ type: "text", text: "Channel not found. Check the channel ID." }],
  isError: true,
};
```

**Protocol error** (client-level, not shown to LLM as tool result):
```typescript
throw new McpError(ErrorCode.InvalidParams, "API key not configured");
```

### Multi-tool server pattern

```typescript
// List available platforms
server.registerTool("list_platforms", {
  description: "List configured publishing platforms and their status",
  inputSchema: {},
}, async () => ({
  content: [{ type: "text", text: JSON.stringify(getConfiguredPlatforms()) }],
}));

// Publish
server.registerTool("publish_post", {
  description: "Publish content to a platform",
  inputSchema: {
    platform: z.enum(["telegram", "vk", "max", "threads"]),
    text: z.string(),
    channel_id: z.string().optional(),
  },
}, async (args) => { /* ... */ });

// Get post status
server.registerTool("get_post_status", {
  description: "Check if a published post is live",
  inputSchema: {
    platform: z.enum(["telegram", "vk", "max", "threads"]),
    post_id: z.string(),
  },
  annotations: { readOnlyHint: true },
}, async (args) => { /* ... */ });
```

---

## 4. How Users Configure the Server

### Claude Desktop / Cursor / VS Code

```json
{
  "mcpServers": {
    "publish-mcp": {
      "command": "npx",
      "args": ["-y", "@anthropic/publish-mcp"],
      "env": {
        "TELEGRAM_BOT_TOKEN": "123:ABC",
        "VK_ACCESS_TOKEN": "vk1.xxx",
        "THREADS_ACCESS_TOKEN": "IGQ..."
      }
    }
  }
}
```

**Env vars are the standard way to pass API keys.** The server reads `process.env`. No stdin prompts, no config files.

### Environment variable reading pattern

```typescript
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}
```

Use `console.error()` for logging -- stdout is reserved for MCP protocol messages.

---

## 5. Registry Listing Requirements

### mcp.so

- **Submit via:** Web form or GitHub issue
- **Required:** server name, one-sentence description, tool count, transport type (stdio), GitHub repo URL, homepage
- **Optional:** icon, config snippet for Claude Desktop
- **Tip:** Include the `mcpServers` JSON snippet in README -- mcp.so renders it inline

### smithery.ai

**Requires `smithery.yaml` in repo root:**

```yaml
startCommand:
  type: stdio
  configSchema:
    type: object
    properties:
      TELEGRAM_BOT_TOKEN:
        type: string
        description: "Telegram Bot API token"
      VK_ACCESS_TOKEN:
        type: string
        description: "VK API access token"
    required:
      - TELEGRAM_BOT_TOKEN
  commandFunction: |-
    (config) => ({
      command: 'npx',
      args: ['-y', '@anthropic/publish-mcp'],
      env: {
        TELEGRAM_BOT_TOKEN: config.TELEGRAM_BOT_TOKEN,
        VK_ACCESS_TOKEN: config.VK_ACCESS_TOKEN || ''
      }
    })
  exampleConfig:
    TELEGRAM_BOT_TOKEN: "123456:ABC-DEF"
```

- **Submit via:** `smithery mcp publish <url> -n <org/server>` CLI
- **Auth:** Specify bearer/API key in manifest if needed

### glama.ai/mcp

- **Submit via:** Web form
- **Required:** name, description, repo URL, install snippet, transport, tool count
- **Tip:** "A submission with a real README + install guide lands better than a raw git URL"

### awesome-mcp-servers (GitHub)

- **Submit via:** PR to `punkpeye/awesome-mcp-servers`
- **Required:** name, one-line description, link

---

## 6. README Template for Registry Success

```markdown
# publish-mcp

MCP server for publishing content to Telegram, VK, MAX, and Threads.

## Tools

| Tool | Description |
|------|-------------|
| `publish_post` | Publish text/media to a platform |
| `list_platforms` | List configured platforms |
| `get_post_status` | Check if post is live |

## Installation

### Claude Desktop / Cursor

Add to your MCP settings:

\```json
{
  "mcpServers": {
    "publish-mcp": {
      "command": "npx",
      "args": ["-y", "@scope/publish-mcp"],
      "env": {
        "TELEGRAM_BOT_TOKEN": "your-token"
      }
    }
  }
}
\```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | For Telegram | Bot token from @BotFather |
| `VK_ACCESS_TOKEN` | For VK | Community token with wall.post |
| `THREADS_ACCESS_TOKEN` | For Threads | Instagram/Threads API token |

## License

MIT
```

---

## 7. Publishing Checklist

```bash
# 1. Build
npm run build

# 2. Verify shebang exists in dist/index.js
head -1 dist/index.js
# Should show: #!/usr/bin/env node

# 3. Test locally
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node dist/index.js

# 4. Login and publish
npm login
npm publish --access public

# 5. Verify npx works
npx -y @scope/publish-mcp
```

---

## 8. Key Gotchas

1. **stdout is sacred** -- all `console.log()` goes to the MCP protocol stream. Use `console.error()` for debug logging.

2. **Shebang must survive compilation** -- TypeScript strips shebangs. The `#!/usr/bin/env node` in your .ts source file survives `tsc` only if it's the very first line. Verify after build.

3. **chmod on Windows** -- `shx chmod +x` is a no-op on Windows but needed for Linux/Mac npx users. Always include it.

4. **`"type": "module"`** is mandatory with NodeNext module resolution. All imports need `.js` extensions even for .ts files: `import { foo } from "./bar.js"`.

5. **Zod version** -- SDK 1.29+ uses Standard Schema, compatible with Zod v3.25+ (which includes `zod/v4`). Use `import { z } from "zod"` or `import * as z from "zod/v4"`.

6. **No interactive input** -- the server runs as a subprocess. No readline, no prompts. Config comes from env vars only.

7. **Graceful shutdown** -- handle SIGTERM/SIGINT to clean up connections.

---

## Sources

- [TypeScript SDK docs - server.md](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md)
- [@modelcontextprotocol/sdk on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [Official servers repo - filesystem](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)
- [Publishing MCP to npm guide](https://www.aihero.dev/publish-your-mcp-server-to-npm)
- [MCP Registries in 2026](https://roxyapi.com/blogs/mcp-registries-where-to-list-your-server-2026)
- [smithery.yaml format](https://dev.to/ramunarasinga-11/smitheryyaml-in-mcp-mermaid-codebase-1hpg)
- [MCP TypeScript SDK complete guide](https://blog.agentailor.com/posts/mcp-typescript-sdk-complete-guide)
- [MCP tool schema](https://www.merge.dev/blog/mcp-tool-schema)

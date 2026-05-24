# publish-mcp Roadmap

## Phase 1: Scaffold + Telegram MVP
**Goal:** Working MCP server that publishes text+image to Telegram via Bot API. Runnable via npx.
**Requirements:** R1, R2, R4, R6, R10 (partial)
**Success:** Claude Code calls publish tool -> message appears in test Telegram channel.

### Tasks
1.1 Init npm project: package.json (type:module, bin, files), tsconfig.json, src/index.ts with shebang
1.2 Install deps: @modelcontextprotocol/sdk, zod, typescript
1.3 Implement src/platforms/telegram.ts: sendMessage, sendPhoto via Bot API fetch
1.4 Implement src/server.ts: McpServer with publish + list_channels tools
1.5 Implement src/config.ts: env var loading (TELEGRAM_BOT_TOKEN, PUBLISH_CHANNELS)
1.6 Wire src/index.ts: create server, connect stdio transport
1.7 Build and test locally: npx . publish --platform telegram --text "test"

## Phase 2: VK + MAX Publishers
**Goal:** Add VK and MAX publishing. Multi-channel publish_all tool.
**Requirements:** R3, R5, R7, R8
**Success:** publish_all sends to Telegram + VK + MAX in one call.

### Tasks
2.1 Implement src/platforms/vk.ts: wall.post with photo upload flow
2.2 Implement src/platforms/max.ts: sendMessage with photo upload
2.3 Add publish_all tool to server
2.4 Add preview tool (dry-run)
2.5 Test multi-channel publish

## Phase 3: Threads + Polish
**Goal:** Add Threads. README with demo. npm publish.
**Requirements:** R9, R11
**Success:** Package published on npm, installable via npx.

### Tasks
3.1 Implement src/platforms/threads.ts: Meta Threads API
3.2 Write README.md with usage, config snippet, gif demo
3.3 npm publish (pick available scope)
3.4 Add smithery.yaml

## Phase 4: Registry Listings + Growth
**Goal:** Listed on mcp.so, Smithery, awesome-mcp-servers. First external users.
**Requirements:** R12
**Success:** Visible on registries, getting npm downloads.

### Tasks
4.1 Submit to mcp.so
4.2 Submit to Smithery
4.3 PR to awesome-mcp-servers
4.4 Post on dev.to / Habr
4.5 LinkedIn + @popovvii posts

---

**Current phase:** 1
**Status:** Not started

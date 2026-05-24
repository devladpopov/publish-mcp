# publish-mcp

## What This Is

An MCP (Model Context Protocol) server that enables AI coding agents to publish content directly to social media platforms: Telegram channels, VK communities, MAX chats, and Threads. Distributed as an npm package with zero-install via npx. Built by extracting and generalizing the publishing layer from the working PulsePost content automation system.

## Core Value

AI agent calls one tool, content appears in the configured channel. Zero friction between "generate post" and "published."

## Requirements

### Validated

(None yet -- ship to validate)

### Active

- [ ] Telegram Bot API publisher (sendPhoto + sendMessage to channels)
- [ ] VK API publisher (wall.post with photo to communities)
- [ ] MAX Bot API publisher (sendMessage with photo to chats)
- [ ] Threads Meta API publisher (text + image posts)
- [ ] Multi-channel publish in one tool call
- [ ] Channel listing tool (show configured destinations)
- [ ] Preview/dry-run tool (show what would be published without sending)
- [ ] Configuration via environment variables and MCP config
- [ ] npm package with npx zero-install support
- [ ] MCP stdio transport (standard for Claude Code / Cursor)
- [ ] README with usage examples and gif demo
- [ ] Listed on mcp.so registry
- [ ] Listed on Smithery registry
- [ ] PR to awesome-mcp-servers

### Out of Scope

- MTProto / userbot sessions -- too complex for generic users, Bot API only
- Content generation / AI -- the agent generates content, MCP only publishes
- Scheduling / queues -- publish immediately, no deferred posts
- Dashboard / web UI -- CLI + MCP only
- Analytics / tracking -- out of scope for v1
- Dzen integration -- works via @zen_sync_bot auto-crosspost, not direct API
- Yandex Calendar -- too niche for generic tool
- Email newsletter -- different product category

## Context

- Working publisher code exists in C:\Users\Vlad\Projects\pulsepost\src\publish\ with production-tested modules for all 4 platforms
- PulsePost uses gramjs (MTProto) for Telegram -- MCP version will use simpler Bot API
- PulsePost VK module handles photo upload via 3-step flow (getWallUploadServer -> upload -> saveWallPhoto -> wall.post)
- PulsePost MAX module uses platform-api.max.ru with photo upload flow
- PulsePost Threads module uses Meta Threads API with long-lived tokens
- MCP server market: 17K+ servers on registries, 97M monthly SDK downloads
- Zero existing MCP servers for social media publishing (only read-only Telegram MCP exists)
- Distribution model: npm install -> one line in MCP config -> AI agent discovers tools automatically
- Goal is personal brand building + authority in AI infrastructure space, not direct revenue

## Constraints

- **Transport**: stdio only (MCP standard for CLI agents)
- **Auth**: Bot API tokens only, no OAuth flows, no MTProto sessions
- **Images**: URL-based or local file path, no generation
- **Platforms**: Telegram, VK, MAX, Threads only for v1
- **Package**: Must work via npx without global install
- **Dependencies**: Minimal, no heavy frameworks

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Bot API instead of MTProto for Telegram | MTProto requires session strings, 2FA, complex setup. Bot API: one token, works from npx | -- Pending |
| Separate npm package, not PulsePost fork | Clean package, no StudyQA-specific baggage, proper npm namespace | -- Pending |
| stdio transport only | Standard for Claude Code and Cursor. SSE/HTTP adds complexity without demand | -- Pending |
| No content generation in MCP | Agent generates content. MCP is a dumb pipe. Keeps scope tight | -- Pending |

---
*Last updated: 2026-05-24 after initialization*

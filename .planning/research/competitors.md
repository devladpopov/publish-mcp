# Competitive Landscape: MCP Servers for Social Media / Messaging

**Researched:** 2026-05-24
**Scope:** Telegram, VK, MAX, Threads, multi-platform, Slack (reference architecture)

---

## 1. Telegram MCP Servers

The most crowded segment. At least 8-10 implementations exist, split into two approaches:

### A. MTProto / User Client (full account access)

| Project | Language | Stars | Tools | Auth | Publishing |
|---------|----------|-------|-------|------|------------|
| [chigwell/telegram-mcp](https://github.com/chigwell/telegram-mcp) | Python (Telethon) | ~high | **80+ tools**: accounts, chats, messages, contacts, media, profile, folders, drafts | API ID + Hash + Session string from my.telegram.org | YES -- send, edit, delete, forward, pin, media, voice, stickers |
| [chaindead/telegram-mcp](https://github.com/chaindead/telegram-mcp) | Go | moderate | **5 tools**: tg_me, tg_dialogs, tg_read, tg_dialog, tg_send | API ID + Hash + phone verification via CLI | YES -- tg_send (draft messages) |
| [sparfenyuk/mcp-telegram](https://github.com/sparfenyuk/mcp-telegram) | Python (MTProto) | moderate | Read-only: dialogs, unread messages | API ID + Hash + phone verification | NO -- explicitly read-only |
| [telegram-mcp-server (npm)](https://www.npmjs.com/package/telegram-mcp-server) | TypeScript | low | Unknown details | @mtproto/core + FastMCP | Unknown |

### B. Bot API (simpler, limited to bot capabilities)

| Project | Language | Stars | Tools | Auth | Publishing |
|---------|----------|-------|-------|------|------------|
| [IQAIcom/mcp-telegram](https://github.com/IQAIcom/mcp-telegram) | TypeScript (Telegraf) | moderate | **5 tools**: SEND_MESSAGE, GET_CHANNEL_INFO, FORWARD_MESSAGE, PIN_MESSAGE, GET_CHANNEL_MEMBERS | Single TELEGRAM_BOT_TOKEN env var | YES -- text, photos, documents, voice, video, stickers, locations, contacts, polls |
| [qpd-v/mcp-communicator-telegram](https://github.com/qpd-v/mcp-communicator-telegram) | TypeScript | moderate | Ask questions, send notifications, share files, create archives | Bot token | YES -- notifications, files |
| [guangxiangdebizi/telegram-mcp](https://github.com/guangxiangdebizi/telegram-mcp) | TypeScript | low | Comprehensive Bot API coverage | Bot token | YES |
| [@xingyuchen/telegram-mcp](https://www.npmjs.com/package/@xingyuchen/telegram-mcp) | TypeScript | low | Bot API integration | Bot token | YES |

### Key Observations -- Telegram

1. **chigwell/telegram-mcp is the 800-lb gorilla** -- 80+ tools, multi-account, full Telethon. Hard to compete on breadth.
2. **But it's Python-only**, heavyweight, and requires full user account access (security concern).
3. **Bot API servers are simpler** but limited -- bots can't read arbitrary chats, can't post to channels they're not admin of.
4. **None focus specifically on content publishing workflows.** They're all general-purpose Telegram wrappers.
5. **No server combines Telegram with other platforms.**

---

## 2. VK MCP Servers

| Project | Language | Tools | Auth | Publishing |
|---------|----------|-------|------|------------|
| [ssm82/full-vk-mcp](https://glama.ai/mcp/servers/ssm82/full-vk-mcp) | JavaScript (Node 18+) | **180+ tools** auto-generated from VK API schema | VK_ACCESS_TOKEN env var | YES -- wall posts, messages, photos, videos, polls, stories (when VK_MCP_MODE != "read") |
| [bulatko/vk-mcp-server](https://glama.ai/mcp/servers/bulatko/vk-mcp-server) | Unknown | VK API v5.199 wrapper | VK_ACCESS_TOKEN | YES -- posts, comments |
| [nikolay1221/vk_mcp_server](https://lobehub.com/mcp/nikolay1221-vk_mcp_server) | Python (FastMCP) | VK API via FastMCP | Access token | YES |

### Key Observations -- VK

1. **full-vk-mcp with 180+ auto-generated tools is comprehensive** but overwhelming -- most tools are irrelevant for publishing.
2. **Auth is simple** -- just a VK access token in env var.
3. **No server focuses on publishing UX** -- they dump the entire VK API surface.
4. **Opportunity: a focused VK publishing tool** (wall.post, wall.edit, photo upload) would be more usable than 180 generic wrappers.

---

## 3. MAX Messenger MCP Server

| Project | Language | Tools | Auth | Publishing |
|---------|----------|-------|------|------------|
| [woyaxnini/mcp-max-messenger](https://mcpservers.org/servers/woyaxnini/mcp-max-messenger) | TypeScript (Node 18+) | **21 tools**: Messages (get/send/edit/delete/pin/unpin), Media (send_media, send_action), Chats (get_bot_info, get/edit_chat), Members (get/set/remove admins, add/remove members), Events (get_updates, answer_callback) | Token as `Authorization: <token>` (no Bearer prefix) | YES -- send_message, send_media, edit_message |

### Key Observations -- MAX

1. **Only one MCP server exists** -- early mover advantage is available.
2. **Bot API approach** -- similar to Telegram Bot API pattern.
3. **MAX has official SDKs** in TypeScript, Python, Go, Java, PHP.
4. **75M+ users, mandatory pre-install in Russia** -- growing platform.
5. **Simple auth** -- just a bot token, no OAuth complexity.

---

## 4. Threads MCP Server

| Project | Language | Tools | Auth | Publishing |
|---------|----------|-------|------|------------|
| [quinnjr/threads-mcp](https://github.com/quinnjr/threads-mcp) | TypeScript 5.7 | **8 tools**: threads_get_profile, threads_get_threads, threads_get_thread, threads_create_thread, threads_reply_to_thread, threads_get_insights, threads_get_replies, threads_get_conversation | OAuth 2.0 (auto or manual token) via THREADS_APP_ID + THREADS_APP_SECRET | YES -- threads_create_thread (text + media) |

### Key Observations -- Threads

1. **Production-quality implementation** -- 90%+ test coverage, Zod validation, TypeScript.
2. **Good reference for how to do OAuth properly** in an MCP server.
3. **Threads API is relatively simple** -- limited to text posts, replies, media.
4. **Only one serious implementation** -- shows the niche is not saturated.

---

## 5. Multi-Platform Social Media MCP Servers

| Project | Language | Platforms | Tools | Production-Ready |
|---------|----------|-----------|-------|-----------------|
| [tayler-id/social-media-mcp](https://github.com/tayler-id/social-media-mcp) | TypeScript | Twitter/X, Mastodon, LinkedIn | 3 tools: create_post, get_trending_topics, research_topic | NO -- 1 commit, 20 stars, experimental |
| [Socialync](https://www.socialync.io) | Commercial | TikTok, Instagram, YouTube, X, LinkedIn, Facebook, Threads, Bluesky | Unknown | YES -- commercial product |
| [PostPlanify](https://postplanify.com) | Commercial | 10 platforms | create_post | YES -- commercial SaaS |

### Key Observations -- Multi-Platform

1. **Open-source multi-platform is essentially non-existent** -- tayler-id is a toy.
2. **Commercial SaaS solutions exist** (Socialync, PostPlanify, Buffer, Ayrshare) but they're paid, closed, and Western-market focused.
3. **None cover Russian platforms** (VK, MAX, Telegram channels).
4. **This is the biggest gap in the ecosystem.**

---

## 6. Slack MCP Server (Reference Architecture)

The [official Slack MCP server](https://docs.slack.dev/ai/slack-mcp-server/) by Slack is the gold standard for how a messaging MCP server should be built:

### Architecture
- **Transport:** JSON-RPC 2.0 over Streamable HTTP
- **Endpoint:** `https://mcp.slack.com/mcp` (hosted by Slack)
- **Auth:** Confidential OAuth 2.0 (RFC 8414), per-tool scopes

### Tools (by category)
| Category | Required Scopes |
|----------|----------------|
| Search messages/channels | search:read.public, search:read.private, etc. |
| Search files | search:read.files |
| Search users | search:read.users |
| Send a message | chat:write |
| Read channel/thread history | channels:history, groups:history, etc. |
| Create/update canvas | canvases:read, canvases:write |
| Read user profile | users:read, users:read.email |

### Key Takeaways for publish-mcp
1. **Per-tool OAuth scopes** -- excellent security model, but overkill for our use case.
2. **Hosted server** -- Slack runs it, not the user. Different model from local stdio MCP.
3. **Clean tool naming** -- `slack_send_message`, `slack_search_messages`, etc.
4. **Tools are capabilities, not API wrappers** -- "send a message" not "call chat.postMessage".

---

## 7. Gap Analysis: What's Missing

### Nobody does this:

| Gap | Details |
|-----|---------|
| **Cross-platform Russian + Western publishing** | No server combines Telegram + VK + MAX + Threads |
| **Publishing-first UX** | Every server is a generic API wrapper. None optimize for "write a post, publish to 3 channels" |
| **Content adaptation** | No server helps adapt content per platform (Telegram markdown vs VK HTML vs Threads plain text) |
| **Media handling across platforms** | Upload once, publish to multiple platforms with per-platform image/video constraints |
| **Channel/group management for publishers** | Focused tools for content creators: schedule, cross-post, format |
| **Unified auth for multiple platforms** | Every server is single-platform auth |

### What existing servers do well (steal these ideas):

| Good Pattern | From | Apply To |
|-------------|------|----------|
| Simple bot token auth | IQAIcom/mcp-telegram, mcp-max-messenger | Default auth for Telegram + MAX + VK |
| Auto OAuth flow | quinnjr/threads-mcp | Threads auth (required by Meta) |
| Per-tool scopes | Slack MCP | Consider read vs write separation |
| Focused tool set (5-8 tools) | chaindead/telegram-mcp, IQAIcom/mcp-telegram | Keep tools focused on publishing, not 180 API wrappers |
| Mode switch (read/write) | full-vk-mcp | Safety: allow read-only mode |
| TypeScript + Zod validation | threads-mcp | Type safety for tool inputs |

---

## 8. Competitive Positioning for publish-mcp

### What publish-mcp should NOT be:
- Another generic Telegram wrapper (chigwell already won that)
- Another generic VK wrapper (full-vk-mcp has 180 tools)
- A SaaS product (commercial MCP servers exist)

### What publish-mcp SHOULD be:
- **The first open-source cross-platform publishing MCP server for Russian + Western platforms**
- Focused on 4 platforms: Telegram, VK, MAX, Threads
- 10-15 tools maximum, all publishing-oriented
- Content adaptation built-in (format text per platform)
- Single config file for all platform tokens
- TypeScript, lightweight, stdio transport

### Suggested Core Tools:

```
publish_post       -- publish text (+ optional media) to one or more platforms
publish_media      -- upload and publish media with per-platform sizing
get_channels       -- list available channels/groups across all platforms  
get_post           -- retrieve a published post by ID
edit_post          -- edit an existing post
delete_post        -- delete a post
get_post_stats     -- get views/reactions/comments count
preview_post       -- show how the post will look on each platform (formatting)
```

---

## Sources

- [chigwell/telegram-mcp](https://github.com/chigwell/telegram-mcp)
- [chaindead/telegram-mcp](https://github.com/chaindead/telegram-mcp)
- [sparfenyuk/mcp-telegram](https://github.com/sparfenyuk/mcp-telegram)
- [IQAIcom/mcp-telegram](https://github.com/IQAIcom/mcp-telegram)
- [qpd-v/mcp-communicator-telegram](https://github.com/qpd-v/mcp-communicator-telegram)
- [tayler-id/social-media-mcp](https://github.com/tayler-id/social-media-mcp)
- [ssm82/full-vk-mcp](https://glama.ai/mcp/servers/ssm82/full-vk-mcp)
- [bulatko/vk-mcp-server](https://glama.ai/mcp/servers/bulatko/vk-mcp-server)
- [woyaxnini/mcp-max-messenger](https://mcpservers.org/servers/woyaxnini/mcp-max-messenger)
- [quinnjr/threads-mcp](https://github.com/quinnjr/threads-mcp)
- [Slack MCP Server docs](https://docs.slack.dev/ai/slack-mcp-server/)
- [Socialync](https://www.socialync.io/blog/best-social-media-mcp-servers-2026)
- [OpenTweet MCP servers list](https://opentweet.io/blog/best-mcp-servers-social-media-2026)

# publish-mcp Requirements

## R1: MCP Server Core
- MCP server using @modelcontextprotocol/sdk with stdio transport
- TypeScript, ESM modules
- Works via `npx @nicepkg/publish-mcp` without global install
- package.json `bin` field pointing to compiled index.js with shebang
- All logging via console.error (stdout reserved for MCP protocol)

## R2: Tool — publish
- Input: platform (telegram|vk|max|threads), text (string), image_url (optional string), channel (optional string, override default)
- Sends text+image to specified platform/channel
- Returns: success status, post URL or ID, error message if failed
- Annotations: readOnlyHint=false, destructiveHint=false, idempotentHint=false, openWorldHint=true

## R3: Tool — publish_all
- Input: text (string), image_url (optional), channels (optional array of channel names)
- Publishes to all configured channels (or specified subset) in parallel
- Returns: per-channel results (success/fail with details)

## R4: Tool — list_channels
- No input required
- Returns list of configured channels with platform, name, status
- Annotations: readOnlyHint=true

## R5: Tool — preview
- Input: same as publish
- Dry-run: shows what would be published without sending
- Returns: formatted preview text, target channel info

## R6: Telegram Publisher
- Bot API only (no MTProto)
- sendMessage for text-only, sendPhoto for text+image
- HTML parse_mode
- chat_id via @username or -100xxx numeric
- Image: URL pass-through or local file upload via FormData
- Error handling: parse ok/error_code/description, handle 403 (not admin) and 429 (rate limit with retry_after)

## R7: VK Publisher
- VK API v5.199
- wall.post to community wall with from_group=1
- Photo upload: getWallUploadServer -> upload -> saveWallPhoto -> attach to post
- Auth: VK_ACCESS_TOKEN env var (community token for wall.post, user token for photo upload)

## R8: MAX Publisher
- MAX Bot API (platform-api.max.ru)
- sendMessage with photo attachment
- Photo upload: GET /uploads?type=image -> POST file -> attach token
- Auth: MAX_BOT_TOKEN env var

## R9: Threads Publisher
- Meta Threads API
- Create text+image posts
- Auth: THREADS_ACCESS_TOKEN env var (long-lived token)

## R10: Configuration
- Primary: environment variables (TELEGRAM_BOT_TOKEN, VK_ACCESS_TOKEN, etc.)
- Channel definitions via PUBLISH_CHANNELS env var (JSON string) or individual env vars
- MCP config passes env vars via mcpServers.env block
- No config files, no interactive prompts

## R11: npm Distribution
- Package name: @nicepkg/publish-mcp (or similar available scope)
- bin: publish-mcp
- files: ["dist"] only
- smithery.yaml for Smithery registry
- README with copy-paste mcpServers config snippet

## R12: Registry Listings
- mcp.so submission (web form)
- Smithery submission (smithery.yaml in repo)
- awesome-mcp-servers PR
- README includes gif/screenshot demo

## Non-Requirements
- No MTProto/userbot sessions
- No content generation/AI
- No scheduling/queues
- No web UI/dashboard
- No analytics
- No Dzen (auto-crosspost via bot)
- No Yandex Calendar
- No email newsletter

# Telegram Bot API: Channel Publishing Reference

**Researched:** 2026-05-24
**Purpose:** publish-mcp -- MCP server for publishing to Telegram channels via Bot API
**Confidence:** HIGH (official docs + multiple verified sources)

## Base URL

```
https://api.telegram.org/bot<BOT_TOKEN>/<METHOD>
```

All methods accept JSON body (`Content-Type: application/json`) or `multipart/form-data` (required for file uploads).

Response format (always):
```json
{
  "ok": true,
  "result": { ... }
}
```

Error format:
```json
{
  "ok": false,
  "error_code": 400,
  "description": "Bad Request: chat not found"
}
```

---

## 1. Channel chat_id Format

Two ways to address a channel:

| Format | Example | When to use |
|--------|---------|-------------|
| `@username` | `"@my_channel"` | Public channels with a username |
| Numeric ID | `"-1001234567890"` | Private channels, or when username might change |

Numeric channel IDs always start with `-100` followed by digits. They are negative integers.

### How to get a channel's numeric chat_id

**Option A:** Forward a message from the channel to `@userinfobot` or `@RawDataBot`.

**Option B:** Use the Bot API after the bot is added to the channel:
```bash
curl "https://api.telegram.org/bot$TOKEN/getChat?chat_id=@my_channel"
```
Response includes `"id": -1001234567890`.

**Option C:** Call `getUpdates` after posting to the channel -- the update will contain the channel's numeric ID.

---

## 2. Bot Permissions

The bot **must be added as an administrator** to the channel with at least:
- **Post Messages** (`can_post_messages`) -- required
- **Edit Messages** (`can_edit_messages`) -- optional, for editing after posting

Steps:
1. Open channel > Edit > Administrators > Add Administrator
2. Search for your bot by `@username`
3. Enable "Post Messages" permission
4. Save

Note: Admin rights may take up to an hour to propagate (usually instant).

### Verifying bot access

```bash
curl "https://api.telegram.org/bot$TOKEN/getChatMember?chat_id=@my_channel&user_id=$BOT_USER_ID"
```

Returns the bot's status (`"administrator"`, `"member"`, etc.) and permissions.

---

## 3. sendMessage

Send a text message to a channel.

```
POST /bot<TOKEN>/sendMessage
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chat_id` | Integer or String | Yes | `@channelname` or numeric ID |
| `text` | String | Yes | Message text, 1-4096 characters |
| `parse_mode` | String | No | `"HTML"`, `"MarkdownV2"`, or `"Markdown"` (legacy) |
| `link_preview_options` | Object | No | Control link preview behavior |
| `disable_notification` | Boolean | No | Send silently |
| `protect_content` | Boolean | No | Prevent forwarding/saving |
| `reply_markup` | Object | No | Inline keyboard, etc. |

### Example: JSON request

```bash
curl -X POST "https://api.telegram.org/bot$TOKEN/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "@my_channel",
    "text": "<b>Breaking News</b>\n\nSomething happened. <a href=\"https://example.com\">Read more</a>",
    "parse_mode": "HTML"
  }'
```

### Example: Successful response

```json
{
  "ok": true,
  "result": {
    "message_id": 42,
    "sender_chat": { "id": -1001234567890, "title": "My Channel", "type": "channel" },
    "chat": { "id": -1001234567890, "title": "My Channel", "type": "channel" },
    "date": 1716556800,
    "text": "Breaking News\n\nSomething happened. Read more",
    "entities": [
      { "offset": 0, "length": 13, "type": "bold" },
      { "offset": 39, "length": 9, "type": "text_link", "url": "https://example.com" }
    ]
  }
}
```

---

## 4. sendPhoto

Send a photo with an optional caption.

```
POST /bot<TOKEN>/sendPhoto
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chat_id` | Integer or String | Yes | Channel identifier |
| `photo` | InputFile or String | Yes | See "Photo upload methods" below |
| `caption` | String | No | Photo caption, 0-1024 characters |
| `parse_mode` | String | No | `"HTML"`, `"MarkdownV2"`, `"Markdown"` |
| `show_caption_above_media` | Boolean | No | Show caption above the photo |
| `disable_notification` | Boolean | No | Send silently |
| `protect_content` | Boolean | No | Prevent forwarding/saving |

### Photo upload methods

**Method 1: URL (simplest)**

Telegram downloads the image from the URL. Max 5 MB via URL.

```bash
curl -X POST "https://api.telegram.org/bot$TOKEN/sendPhoto" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "@my_channel",
    "photo": "https://example.com/image.jpg",
    "caption": "<b>Photo title</b>\n\nDescription here",
    "parse_mode": "HTML"
  }'
```

**Method 2: File upload (multipart/form-data)**

For local files. Max 10 MB for photos.

```bash
curl -X POST "https://api.telegram.org/bot$TOKEN/sendPhoto" \
  -F "chat_id=@my_channel" \
  -F "photo=@/path/to/image.jpg" \
  -F "caption=<b>Photo title</b>" \
  -F "parse_mode=HTML"
```

**Method 3: file_id (reuse existing)**

If the photo was previously uploaded to Telegram, reuse its `file_id`:

```json
{
  "chat_id": "@my_channel",
  "photo": "AgACAgIAAxkBAAI...",
  "caption": "Reused photo"
}
```

### Photo size limits

| Upload method | Max size |
|---------------|----------|
| Via URL | 5 MB |
| Via multipart upload | 10 MB |
| Via file_id | No limit (already on Telegram) |

Telegram auto-generates thumbnails. The response includes an array of `PhotoSize` objects at different resolutions.

---

## 5. sendDocument

Send a file/document to a channel.

```
POST /bot<TOKEN>/sendDocument
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chat_id` | Integer or String | Yes | Channel identifier |
| `document` | InputFile or String | Yes | File to send |
| `caption` | String | No | Document caption, 0-1024 characters |
| `parse_mode` | String | No | `"HTML"`, `"MarkdownV2"`, `"Markdown"` |
| `thumbnail` | InputFile | No | Thumbnail for the file (JPEG, max 200kB) |
| `disable_notification` | Boolean | No | Send silently |
| `protect_content` | Boolean | No | Prevent forwarding/saving |

### Example: File upload

```bash
curl -X POST "https://api.telegram.org/bot$TOKEN/sendDocument" \
  -F "chat_id=@my_channel" \
  -F "document=@/path/to/report.pdf" \
  -F "caption=Monthly report" \
  -F "parse_mode=HTML"
```

### Example: Send by URL

**Important:** When sending by URL, sendDocument currently only works for `.pdf` and `.zip` files.

```json
{
  "chat_id": "@my_channel",
  "document": "https://example.com/report.pdf",
  "caption": "Download the report"
}
```

### Document size limits

| Upload method | Max size |
|---------------|----------|
| Via URL | 20 MB |
| Via multipart upload | 50 MB |
| Via file_id | No limit |
| Local Bot API Server | 2000 MB (2 GB) |

---

## 6. HTML parse_mode Reference

Set `"parse_mode": "HTML"` to use these tags.

### Supported tags

| Tag | Purpose | Example |
|-----|---------|---------|
| `<b>`, `<strong>` | Bold | `<b>bold</b>` |
| `<i>`, `<em>` | Italic | `<i>italic</i>` |
| `<u>`, `<ins>` | Underline | `<u>underline</u>` |
| `<s>`, `<strike>`, `<del>` | Strikethrough | `<s>strikethrough</s>` |
| `<span class="tg-spoiler">`, `<tg-spoiler>` | Spoiler | `<tg-spoiler>hidden</tg-spoiler>` |
| `<a href="URL">` | Link | `<a href="https://example.com">click</a>` |
| `<a href="tg://user?id=123">` | User mention | `<a href="tg://user?id=123">Name</a>` |
| `<tg-emoji emoji-id="ID">` | Custom emoji | `<tg-emoji emoji-id="5368324170671202286">X</tg-emoji>` |
| `<code>` | Inline code | `<code>monospace</code>` |
| `<pre>` | Code block | `<pre>code block</pre>` |
| `<pre><code class="language-python">` | Syntax-highlighted block | `<pre><code class="language-python">print("hi")</code></pre>` |
| `<blockquote>` | Block quote | `<blockquote>quoted text</blockquote>` |
| `<blockquote expandable>` | Expandable quote | `<blockquote expandable>long text</blockquote>` |

### Important notes

- **No `<br>` support.** Use `\n` in your string for line breaks.
- **No `<p>`, `<div>`, `<h1>`, etc.** Only the tags above are supported.
- **Named entities supported:** `&lt;`, `&gt;`, `&amp;`, `&quot;` only.
- **Nesting:** Bold, italic, underline, strikethrough, spoiler can nest inside each other. They CANNOT nest inside `<pre>` or `<code>`.
- **Unsupported tags are stripped** and content rendered as plain text.

### HTML example for a channel post

```html
<b>New Article Published</b>

We just released our analysis of Q4 results.

Key findings:
- Revenue up <b>23%</b> YoY
- Customer retention at <u>94%</u>
- <s>Old projections</s> updated

<a href="https://example.com/article">Read the full article</a>

<blockquote>This is a preview of the premium content.</blockquote>
```

---

## 7. Rate Limits

| Context | Limit |
|---------|-------|
| Single chat (1-to-1) | ~1 msg/sec |
| Group chat | ~20 msgs/min |
| Bulk broadcast | ~30 msgs/sec (default) |
| Paid broadcast | ~1000 msgs/sec (requires 100K Stars balance) |

For a single-channel publishing bot, you will never hit rate limits under normal use (posting a few times per day). Rate limits matter for broadcasting to many chats.

---

## 8. Error Handling

### Common error codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request (malformed params, invalid chat_id, bad HTML) | Fix request, do not retry |
| 401 | Unauthorized (invalid bot token) | Check/regenerate token |
| 403 | Forbidden (bot kicked, blocked, or not admin) | Check bot permissions in channel |
| 404 | Not Found (method typo) | Fix endpoint URL |
| 409 | Conflict (webhook vs getUpdates clash) | Use one or the other |
| 429 | Too Many Requests | Wait `retry_after` seconds, then retry |

### 429 response with retry_after

```json
{
  "ok": false,
  "error_code": 429,
  "description": "Too Many Requests: retry after 35",
  "parameters": {
    "retry_after": 35
  }
}
```

**Handling strategy:**
1. Parse `parameters.retry_after` (can be float, e.g. `0.5`)
2. Wait that many seconds
3. Retry
4. If `retry_after` missing (rare), use exponential backoff: 1s, 2s, 4s, ... up to 64s

### Common 400 errors

| Description | Cause |
|-------------|-------|
| `"Bad Request: chat not found"` | Wrong chat_id or bot never interacted with chat |
| `"Bad Request: can't parse entities"` | Malformed HTML (unclosed tags, unsupported tags) |
| `"Bad Request: message is too long"` | Text > 4096 chars or caption > 1024 chars |
| `"Bad Request: wrong file identifier"` | Invalid file_id or expired URL |

---

## 9. Useful Auxiliary Methods

| Method | Purpose |
|--------|---------|
| `getMe` | Verify bot token, get bot info |
| `getChat` | Get channel info (title, description, ID) |
| `getChatMemberCount` | Get subscriber count |
| `getChatMember` | Check bot's own admin status in channel |
| `editMessageText` | Edit a previously sent message |
| `editMessageCaption` | Edit caption of photo/document |
| `deleteMessage` | Delete a message from channel |

### Verify bot token on startup

```bash
curl "https://api.telegram.org/bot$TOKEN/getMe"
```

```json
{
  "ok": true,
  "result": {
    "id": 123456789,
    "is_bot": true,
    "first_name": "MyPublishBot",
    "username": "my_publish_bot"
  }
}
```

---

## 10. Implementation Notes for publish-mcp

### TypeScript/Node.js: Making requests

No SDK needed. Plain `fetch` works:

```typescript
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Text message
async function sendMessage(chatId: string, text: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API error: ${data.description}`);
  return data.result;
}

// Photo via URL
async function sendPhotoByUrl(chatId: string, photoUrl: string, caption?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML',
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API error: ${data.description}`);
  return data.result;
}

// Photo via file upload
async function sendPhotoFile(chatId: string, fileBuffer: Buffer, filename: string, caption?: string): Promise<any> {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('photo', new Blob([fileBuffer]), filename);
  if (caption) {
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
  }
  const res = await fetch(`${BASE_URL}/sendPhoto`, { method: 'POST', body: formData });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API error: ${data.description}`);
  return data.result;
}
```

### Configuration the MCP server will need

```
TELEGRAM_BOT_TOKEN  -- from @BotFather
TELEGRAM_CHAT_ID    -- @channelname or -100xxx (default channel)
```

### Pre-flight checks on startup

1. Call `getMe` to validate token
2. Call `getChatMember(chat_id, bot_user_id)` to verify admin status
3. If not admin, log clear error: "Bot must be added as admin to channel"

---

## Sources

- https://core.telegram.org/bots/api (official API reference)
- https://core.telegram.org/bots/faq (rate limits, file limits)
- https://am10code.github.io/get-telegram-id/telegram-chat-id-format/ (chat_id format)
- https://help.chatplace.io/en/articles/12670849 (admin setup)
- https://telegramhpc.com/news/574/ (429 error handling)
- https://www.misterchatter.com/docs/telegram-html-formatting-guide-supported-tags/ (HTML tags)

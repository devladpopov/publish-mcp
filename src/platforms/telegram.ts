import type { ChannelConfig } from '../config.js';

const TG_API = 'https://api.telegram.org/bot';

export interface PublishResult {
  ok: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Publish text (with optional image URL) to a Telegram channel via Bot API.
 */
export async function publishTelegram(
  channel: ChannelConfig,
  text: string,
  imageUrl?: string,
): Promise<PublishResult> {
  const base = `${TG_API}${channel.token}`;

  if (imageUrl) {
    return sendPhoto(base, channel.chatId, text, imageUrl);
  }
  return sendMessage(base, channel.chatId, text);
}

async function sendMessage(
  base: string,
  chatId: string,
  text: string,
): Promise<PublishResult> {
  const resp = await fetch(`${base}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });

  return parseResponse(resp);
}

async function sendPhoto(
  base: string,
  chatId: string,
  caption: string,
  photoUrl: string,
): Promise<PublishResult> {
  const resp = await fetch(`${base}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML',
    }),
  });

  return parseResponse(resp);
}

async function parseResponse(resp: Response): Promise<PublishResult> {
  const data = await resp.json() as {
    ok: boolean;
    result?: { message_id: number };
    error_code?: number;
    description?: string;
  };

  if (data.ok && data.result) {
    return { ok: true, messageId: data.result.message_id };
  }

  let error = data.description || 'Unknown Telegram API error';
  if (data.error_code === 403) {
    error = `Bot is not an admin in this channel. ${error}`;
  }

  return { ok: false, error };
}

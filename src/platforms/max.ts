import type { ChannelConfig } from '../config.js';

const MAX_API = 'https://platform-api.max.ru';

export interface PublishResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Publish text (with optional image URL) to a MAX chat via Bot API.
 */
export async function publishMax(
  channel: ChannelConfig,
  text: string,
  imageUrl?: string,
): Promise<PublishResult> {
  let photoToken: string | null = null;

  if (imageUrl) {
    photoToken = await uploadPhotoFromUrl(channel.token, imageUrl);
  }

  const body: Record<string, unknown> = {
    chat_id: Number(channel.chatId),
    text,
  };

  if (photoToken) {
    body.attachments = [{ type: 'image', payload: { token: photoToken } }];
  }

  const resp = await fetch(`${MAX_API}/messages?access_token=${channel.token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await resp.json() as { message?: { body?: { mid: string } }; code?: string; message_text?: string };

  if (data.message?.body?.mid) {
    return { ok: true, messageId: data.message.body.mid };
  }
  return { ok: false, error: data.message_text || data.code || 'MAX sendMessage failed' };
}

async function uploadPhotoFromUrl(token: string, imageUrl: string): Promise<string | null> {
  // Step 1: Get upload URL
  const urlResp = await fetch(`${MAX_API}/uploads?access_token=${token}&type=image`, {
    method: 'POST',
  });
  const urlData = await urlResp.json() as { url?: string };
  if (!urlData.url) {
    console.error('[MAX] Failed to get upload URL');
    return null;
  }

  // Step 2: Download and upload image
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) {
    console.error('[MAX] Failed to download image from URL');
    return null;
  }
  const imgBlob = await imgResp.blob();
  const form = new FormData();
  form.append('data', imgBlob, 'image.jpg');

  const uploadResp = await fetch(urlData.url, { method: 'POST', body: form });
  const uploadData = await uploadResp.json() as {
    photos?: Record<string, { token: string }>;
    photoTokens?: string[];
  };

  if (uploadData.photos) {
    const firstKey = Object.keys(uploadData.photos)[0];
    return uploadData.photos[firstKey]?.token || null;
  }
  if (uploadData.photoTokens?.[0]) {
    return uploadData.photoTokens[0];
  }

  console.error('[MAX] Unexpected upload response');
  return null;
}

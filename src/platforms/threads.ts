import type { ChannelConfig } from '../config.js';

const THREADS_API = 'https://graph.threads.net/v1.0';

export interface PublishResult {
  ok: boolean;
  postId?: string;
  error?: string;
}

/**
 * Publish text (with optional image URL) to Threads via Meta API.
 */
export async function publishThreads(
  channel: ChannelConfig,
  text: string,
  imageUrl?: string,
): Promise<PublishResult> {
  const userId = channel.chatId;
  const token = channel.token;

  // Step 1: Create media container
  const containerParams: Record<string, string> = {
    text,
    access_token: token,
  };

  if (imageUrl) {
    containerParams.media_type = 'IMAGE';
    containerParams.image_url = imageUrl;
  } else {
    containerParams.media_type = 'TEXT';
  }

  const containerResp = await fetch(`${THREADS_API}/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(containerParams),
  });
  const containerData = await containerResp.json() as { id?: string; error?: { message: string } };

  if (!containerData.id) {
    return { ok: false, error: containerData.error?.message || 'Failed to create Threads container' };
  }

  // Step 2: Publish the container
  const publishResp = await fetch(`${THREADS_API}/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerData.id,
      access_token: token,
    }),
  });
  const publishData = await publishResp.json() as { id?: string; error?: { message: string } };

  if (publishData.id) {
    return { ok: true, postId: publishData.id };
  }
  return { ok: false, error: publishData.error?.message || 'Failed to publish Threads post' };
}

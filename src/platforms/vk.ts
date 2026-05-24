import type { ChannelConfig } from '../config.js';

const VK_API = 'https://api.vk.com/method';
const VK_VERSION = '5.199';

export interface PublishResult {
  ok: boolean;
  postId?: string;
  error?: string;
}

/**
 * Publish text (with optional image URL) to a VK community wall.
 */
export async function publishVk(
  channel: ChannelConfig,
  text: string,
  imageUrl?: string,
): Promise<PublishResult> {
  const groupId = channel.groupId || channel.chatId;
  let attachments = '';

  if (imageUrl) {
    const photoAttachment = await uploadPhotoFromUrl(channel, groupId, imageUrl);
    if (photoAttachment) {
      attachments = photoAttachment;
    }
  }

  const params: Record<string, string> = {
    owner_id: `-${groupId}`,
    from_group: '1',
    message: text,
    access_token: channel.token,
    v: VK_VERSION,
  };
  if (attachments) {
    params.attachments = attachments;
  }

  const resp = await fetch(`${VK_API}/wall.post?${new URLSearchParams(params)}`);
  const data = await resp.json() as { response?: { post_id: number }; error?: { error_msg: string } };

  if (data.response?.post_id) {
    return { ok: true, postId: String(data.response.post_id) };
  }
  return { ok: false, error: data.error?.error_msg || 'VK wall.post failed' };
}

async function uploadPhotoFromUrl(
  channel: ChannelConfig,
  groupId: string,
  imageUrl: string,
): Promise<string | null> {
  const uploadToken = channel.userToken || channel.token;

  // Step 1: Get upload server
  const serverResp = await fetch(
    `${VK_API}/photos.getWallUploadServer?${new URLSearchParams({
      group_id: groupId,
      access_token: uploadToken,
      v: VK_VERSION,
    })}`,
  );
  const serverData = await serverResp.json() as { response?: { upload_url: string }; error?: { error_msg: string } };
  if (!serverData.response?.upload_url) {
    console.error('[VK] getWallUploadServer failed:', serverData.error?.error_msg);
    return null;
  }

  // Step 2: Download image and upload to VK
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) {
    console.error('[VK] Failed to download image from URL');
    return null;
  }
  const imgBlob = await imgResp.blob();
  const form = new FormData();
  form.append('photo', imgBlob, 'image.jpg');

  const uploadResp = await fetch(serverData.response.upload_url, { method: 'POST', body: form });
  const uploadData = await uploadResp.json() as { server: number; photo: string; hash: string };

  if (!uploadData.photo || uploadData.photo === '[]') {
    console.error('[VK] Photo upload returned empty');
    return null;
  }

  // Step 3: Save photo
  const saveResp = await fetch(
    `${VK_API}/photos.saveWallPhoto?${new URLSearchParams({
      group_id: groupId,
      server: String(uploadData.server),
      photo: uploadData.photo,
      hash: uploadData.hash,
      access_token: uploadToken,
      v: VK_VERSION,
    })}`,
  );
  const saveData = await saveResp.json() as { response?: Array<{ owner_id: number; id: number }> };
  const saved = saveData.response?.[0];
  if (!saved) {
    console.error('[VK] photos.saveWallPhoto failed');
    return null;
  }

  return `photo${saved.owner_id}_${saved.id}`;
}

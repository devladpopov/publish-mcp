export interface ChannelConfig {
  name: string;
  platform: 'telegram' | 'vk' | 'max' | 'threads';
  token: string;
  chatId: string;
  /** VK-specific: user token for photo uploads */
  userToken?: string;
  /** VK-specific: group ID */
  groupId?: string;
}

export interface Config {
  channels: ChannelConfig[];
}

/**
 * Load configuration from environment variables.
 *
 * Supports two modes:
 * 1. PUBLISH_CHANNELS env var with JSON array of channel configs
 * 2. Individual env vars: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID, etc.
 */
export function loadConfig(): Config {
  const channels: ChannelConfig[] = [];

  // Mode 1: JSON config
  const jsonConfig = process.env.PUBLISH_CHANNELS;
  if (jsonConfig) {
    try {
      const parsed = JSON.parse(jsonConfig);
      if (Array.isArray(parsed)) {
        for (const ch of parsed) {
          if (ch.name && ch.platform && ch.token && ch.chatId) {
            channels.push(ch);
          }
        }
      }
    } catch {
      console.error('[publish-mcp] Failed to parse PUBLISH_CHANNELS JSON');
    }
  }

  // Mode 2: Individual env vars (additive)
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChat = process.env.TELEGRAM_CHAT_ID;
  if (tgToken && tgChat) {
    channels.push({
      name: 'telegram',
      platform: 'telegram',
      token: tgToken,
      chatId: tgChat,
    });
  }

  const vkToken = process.env.VK_ACCESS_TOKEN;
  const vkGroupId = process.env.VK_GROUP_ID;
  if (vkToken && vkGroupId) {
    channels.push({
      name: 'vk',
      platform: 'vk',
      token: vkToken,
      chatId: vkGroupId,
      groupId: vkGroupId,
      userToken: process.env.VK_USER_TOKEN,
    });
  }

  const maxToken = process.env.MAX_BOT_TOKEN;
  const maxChat = process.env.MAX_CHAT_ID;
  if (maxToken && maxChat) {
    channels.push({
      name: 'max',
      platform: 'max',
      token: maxToken,
      chatId: maxChat,
    });
  }

  const threadsToken = process.env.THREADS_ACCESS_TOKEN;
  const threadsUserId = process.env.THREADS_USER_ID;
  if (threadsToken && threadsUserId) {
    channels.push({
      name: 'threads',
      platform: 'threads',
      token: threadsToken,
      chatId: threadsUserId,
    });
  }

  return { channels };
}

export function getChannel(config: Config, nameOrPlatform: string): ChannelConfig | undefined {
  return (
    config.channels.find((c) => c.name === nameOrPlatform) ||
    config.channels.find((c) => c.platform === nameOrPlatform)
  );
}

export function getChannelsByPlatform(config: Config, platform: string): ChannelConfig[] {
  return config.channels.filter((c) => c.platform === platform);
}

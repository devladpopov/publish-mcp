import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { loadConfig, getChannel, type Config, type ChannelConfig } from './config.js';
import { publishTelegram } from './platforms/telegram.js';
import { publishVk } from './platforms/vk.js';
import { publishMax } from './platforms/max.js';
import { publishThreads } from './platforms/threads.js';

const PLATFORMS = ['telegram', 'vk', 'max', 'threads'] as const;
type Platform = (typeof PLATFORMS)[number];

interface PublishResult {
  ok: boolean;
  messageId?: number | string;
  postId?: string;
  error?: string;
}

async function publishToChannel(
  channel: ChannelConfig,
  text: string,
  imageUrl?: string,
): Promise<PublishResult> {
  switch (channel.platform) {
    case 'telegram':
      return publishTelegram(channel, text, imageUrl);
    case 'vk':
      return publishVk(channel, text, imageUrl);
    case 'max':
      return publishMax(channel, text, imageUrl);
    case 'threads':
      return publishThreads(channel, text, imageUrl);
    default:
      return { ok: false, error: `Unknown platform: ${channel.platform}` };
  }
}

export function createServer(): McpServer {
  const config = loadConfig();

  const server = new McpServer({
    name: 'publish-mcp',
    version: '0.1.0',
  });

  // Tool: publish
  server.registerTool(
    'publish',
    {
      description:
        'Publish a post to a social media channel (Telegram, VK, MAX, or Threads). ' +
        'The bot must be configured and have admin access to the target channel.',
      inputSchema: {
        text: z.string().describe('Post text content. Telegram supports HTML tags (<b>, <i>, <a href="...">).'),
        image_url: z.string().url().optional().describe('URL of an image to attach to the post.'),
        channel: z
          .string()
          .optional()
          .describe(
            'Channel name or platform to publish to. ' +
            'If omitted, publishes to the first configured channel. ' +
            'Use list_channels to see available channels.',
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ text, image_url, channel: channelName }) => {
      const ch = channelName
        ? getChannel(config, channelName)
        : config.channels[0];

      if (!ch) {
        const available = config.channels.map((c) => c.name).join(', ') || 'none';
        return {
          content: [
            {
              type: 'text',
              text: `No channel found for "${channelName || 'default'}". Available: ${available}`,
            },
          ],
          isError: true,
        };
      }

      const result = await publishToChannel(ch, text, image_url);

      if (result.ok) {
        const id = result.messageId || result.postId || 'unknown';
        return {
          content: [
            {
              type: 'text',
              text: `Published to ${ch.platform} channel "${ch.name}" (ID: ${id})`,
            },
          ],
        };
      }

      return {
        content: [{ type: 'text', text: `Failed to publish to ${ch.platform}: ${result.error}` }],
        isError: true,
      };
    },
  );

  // Tool: publish_all
  server.registerTool(
    'publish_all',
    {
      description:
        'Publish a post to all configured channels simultaneously. ' +
        'Optionally specify a subset of channel names.',
      inputSchema: {
        text: z.string().describe('Post text content.'),
        image_url: z.string().url().optional().describe('URL of an image to attach.'),
        channels: z
          .array(z.string())
          .optional()
          .describe('Subset of channel names to publish to. If omitted, publishes to all.'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ text, image_url, channels: channelNames }) => {
      const targets = channelNames
        ? channelNames
            .map((name) => getChannel(config, name))
            .filter((ch): ch is ChannelConfig => ch !== undefined)
        : config.channels;

      if (targets.length === 0) {
        return {
          content: [{ type: 'text', text: 'No channels configured or matched.' }],
          isError: true,
        };
      }

      const results = await Promise.allSettled(
        targets.map(async (ch) => {
          const result = await publishToChannel(ch, text, image_url);
          return { channel: ch.name, platform: ch.platform, ...result };
        }),
      );

      const lines = results.map((r) => {
        if (r.status === 'fulfilled') {
          const v = r.value;
          return v.ok
            ? `${v.platform}/${v.channel}: OK (${v.messageId || v.postId || '-'})`
            : `${v.platform}/${v.channel}: FAILED (${v.error})`;
        }
        return `unknown: ERROR (${r.reason})`;
      });

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  // Tool: list_channels
  server.registerTool(
    'list_channels',
    {
      description: 'List all configured publishing channels with their platform and status.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      if (config.channels.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No channels configured. Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID, or use PUBLISH_CHANNELS JSON env var.',
            },
          ],
        };
      }

      const lines = config.channels.map(
        (ch) => `- ${ch.name} (${ch.platform}) -> ${ch.chatId}`,
      );
      return {
        content: [{ type: 'text', text: `Configured channels:\n${lines.join('\n')}` }],
      };
    },
  );

  // Tool: preview
  server.registerTool(
    'preview',
    {
      description: 'Preview what would be published without actually sending. Dry-run mode.',
      inputSchema: {
        text: z.string().describe('Post text content.'),
        image_url: z.string().url().optional().describe('Image URL to preview.'),
        channel: z.string().optional().describe('Target channel name or platform.'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ text, image_url, channel: channelName }) => {
      const ch = channelName
        ? getChannel(config, channelName)
        : config.channels[0];

      if (!ch) {
        return {
          content: [{ type: 'text', text: 'No channel found for preview.' }],
          isError: true,
        };
      }

      const lines = [
        `--- PREVIEW ---`,
        `Platform: ${ch.platform}`,
        `Channel: ${ch.name} (${ch.chatId})`,
        `Text: ${text}`,
        image_url ? `Image: ${image_url}` : 'Image: none',
        `--- END PREVIEW ---`,
      ];
      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  return server;
}

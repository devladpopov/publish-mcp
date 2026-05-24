import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { loadConfig, getChannel, type Config, type ChannelConfig } from './config.js';
import { publishTelegram } from './platforms/telegram.js';
import { publishVk } from './platforms/vk.js';
import { publishMax } from './platforms/max.js';
import { publishThreads } from './platforms/threads.js';
import { loadBrand, saveBrand, type BrandProfile } from './content/brand.js';
import { analyzeCompetitor, analyzeCompetitors } from './content/competitors.js';
import { fetchRss, scrapeWebpage, discoverSources } from './content/sources.js';
import { generatePost, generatePostFromSource, translatePost, generateImagePrompt } from './content/generator.js';
import { generateText, generateImage } from './content/ai.js';

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
    version: '0.2.0',
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

  // ══════════════════════════════════════════════
  // CONTENT FACTORY TOOLS
  // ══════════════════════════════════════════════

  // Tool: setup_brand
  server.registerTool(
    'setup_brand',
    {
      description:
        'Configure brand profile for content generation: niche, tone of voice, target audience, post structure, and sample posts. ' +
        'Saved locally and used by generate_post and other content tools.',
      inputSchema: {
        niche: z.string().describe('Content niche (e.g., "AI and business", "fitness for beginners", "crypto trading")'),
        tone: z.string().describe('Tone of voice (e.g., "professional but friendly", "casual and humorous", "expert and authoritative")'),
        language: z.string().default('en').describe('Primary content language (e.g., "en", "ru", "es")'),
        target_audience: z.string().describe('Target audience description (e.g., "startup founders aged 25-40")'),
        use_headline: z.boolean().default(true).describe('Start posts with a catchy headline'),
        use_cta: z.boolean().default(true).describe('End posts with a call to action'),
        use_hashtags: z.boolean().default(true).describe('Include hashtags in posts'),
        use_links: z.boolean().default(false).describe('Include links in posts'),
        sample_posts: z.array(z.string()).optional().describe('Array of example posts to match the writing style'),
        competitors: z.array(z.string()).optional().describe('Array of competitor URLs/channels to analyze'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ niche, tone, language, target_audience, use_headline, use_cta, use_hashtags, use_links, sample_posts, competitors }) => {
      const brand: BrandProfile = {
        niche,
        tone,
        language,
        targetAudience: target_audience,
        postStructure: {
          useHeadline: use_headline,
          useCta: use_cta,
          useHashtags: use_hashtags,
          useLinks: use_links,
        },
        samplePosts: sample_posts || [],
        competitors: competitors || [],
        sources: [],
      };

      saveBrand(brand);

      return {
        content: [{
          type: 'text',
          text: `Brand profile saved:\n- Niche: ${niche}\n- Tone: ${tone}\n- Language: ${language}\n- Audience: ${target_audience}\n- Structure: headline=${use_headline}, CTA=${use_cta}, hashtags=${use_hashtags}, links=${use_links}\n- Sample posts: ${(sample_posts || []).length}\n- Competitors: ${(competitors || []).length}`,
        }],
      };
    },
  );

  // Tool: analyze_competitors
  server.registerTool(
    'analyze_competitors',
    {
      description:
        'Analyze competitor content strategy. Scrapes their pages and uses AI to identify posting patterns, topics, tone, strengths, and content gaps. ' +
        'Requires GEMINI_API_KEY or OPENAI_API_KEY.',
      inputSchema: {
        urls: z.array(z.string().url()).describe('Array of competitor URLs to analyze (websites, channels, social media profiles)'),
        niche: z.string().optional().describe('Niche context for analysis. If omitted, uses saved brand profile niche.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ urls, niche }) => {
      const brand = loadBrand();
      const actualNiche = niche || brand?.niche || 'general';

      try {
        const { analyses, summary } = await analyzeCompetitors(urls, actualNiche);

        const lines = analyses.map((a) =>
          `## ${a.competitor} (${a.url})\n` +
          `Frequency: ${a.postingFrequency}\n` +
          `Topics: ${a.contentTopics.join(', ')}\n` +
          `Tone: ${a.toneOfVoice}\n` +
          `Formats: ${a.contentFormats.join(', ')}\n` +
          `Strengths: ${a.strengths.join('; ')}\n` +
          `Gaps: ${a.gaps.join('; ')}`
        );

        return {
          content: [{ type: 'text', text: `${lines.join('\n\n')}\n\n---\n\n## Strategic Summary\n${summary}` }],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Competitor analysis failed: ${err.message}` }], isError: true };
      }
    },
  );

  // Tool: find_sources
  server.registerTool(
    'find_sources',
    {
      description:
        'Discover content sources for your niche: RSS feeds, blogs, news sites, Telegram channels. ' +
        'Can auto-discover using AI or fetch from a specific RSS/URL. Requires GEMINI_API_KEY or OPENAI_API_KEY for discovery.',
      inputSchema: {
        action: z.enum(['discover', 'fetch_rss', 'scrape']).describe(
          '"discover" = AI finds sources for your niche. "fetch_rss" = parse an RSS feed. "scrape" = extract text from a URL.'
        ),
        url: z.string().optional().describe('RSS feed URL (for fetch_rss) or webpage URL (for scrape). Not needed for discover.'),
        niche: z.string().optional().describe('Niche to discover sources for. If omitted, uses saved brand profile.'),
        language: z.string().optional().describe('Content language for discovery. Default: "en".'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ action, url, niche, language }) => {
      try {
        if (action === 'discover') {
          const brand = loadBrand();
          const actualNiche = niche || brand?.niche || 'general';
          const actualLang = language || brand?.language || 'en';
          const sources = await discoverSources(actualNiche, actualLang);
          const lines = sources.map((s) => `- [${s.type}] ${s.name}: ${s.url}`);
          return { content: [{ type: 'text', text: `Found ${sources.length} sources:\n${lines.join('\n')}` }] };
        }

        if (action === 'fetch_rss') {
          if (!url) return { content: [{ type: 'text', text: 'url is required for fetch_rss' }], isError: true };
          const items = await fetchRss(url);
          const lines = items.slice(0, 20).map((it) => `- ${it.title}\n  ${it.url}\n  ${it.summary.slice(0, 100)}...`);
          return { content: [{ type: 'text', text: `${items.length} items from RSS:\n${lines.join('\n')}` }] };
        }

        if (action === 'scrape') {
          if (!url) return { content: [{ type: 'text', text: 'url is required for scrape' }], isError: true };
          const text = await scrapeWebpage(url);
          return { content: [{ type: 'text', text: `Scraped content (${text.length} chars):\n${text.slice(0, 2000)}` }] };
        }

        return { content: [{ type: 'text', text: `Unknown action: ${action}` }], isError: true };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Source operation failed: ${err.message}` }], isError: true };
      }
    },
  );

  // Tool: generate_post
  server.registerTool(
    'generate_post',
    {
      description:
        'Generate a social media post using AI, based on brand profile and topic. ' +
        'Can generate from a topic/idea or from source content (article, RSS item). ' +
        'Uses saved brand voice, post structure, and style. Requires GEMINI_API_KEY or OPENAI_API_KEY.',
      inputSchema: {
        topic: z.string().describe('Topic or idea for the post (e.g., "benefits of AI in education", "our new product launch")'),
        source_content: z.string().optional().describe('Optional source material to reference (article text, RSS item summary). Will be rephrased, not copied.'),
        source_url: z.string().optional().describe('URL of the source to credit in the post.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ topic, source_content, source_url }) => {
      try {
        if (source_content && source_url) {
          const text = await generatePostFromSource(topic, source_content, source_url);
          return { content: [{ type: 'text', text: `Generated post:\n\n${text}` }] };
        }

        const result = await generatePost(topic, source_content);
        return { content: [{ type: 'text', text: `Generated post:\n\n${result.text}` }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Post generation failed: ${err.message}` }], isError: true };
      }
    },
  );

  // Tool: translate_post
  server.registerTool(
    'translate_post',
    {
      description:
        'Translate a post to another language while maintaining brand voice and formatting. ' +
        'Requires GEMINI_API_KEY or OPENAI_API_KEY.',
      inputSchema: {
        text: z.string().describe('Post text to translate.'),
        target_language: z.string().describe('Target language (e.g., "Russian", "Spanish", "English")'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ text, target_language }) => {
      try {
        const translated = await translatePost(text, target_language);
        return { content: [{ type: 'text', text: `Translated to ${target_language}:\n\n${translated}` }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Translation failed: ${err.message}` }], isError: true };
      }
    },
  );

  // Tool: generate_media
  server.registerTool(
    'generate_media',
    {
      description:
        'Generate an image for a social media post using AI (Gemini Imagen or DALL-E). ' +
        'Can auto-create an image prompt from post text, or use a custom prompt. ' +
        'Returns image URL or data URI. Requires GEMINI_API_KEY or OPENAI_API_KEY.',
      inputSchema: {
        prompt: z.string().optional().describe('Custom image generation prompt. If omitted, auto-generates from post_text.'),
        post_text: z.string().optional().describe('Post text to auto-generate an image prompt from. Used if prompt is not provided.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ prompt, post_text }) => {
      try {
        let imagePrompt = prompt;
        if (!imagePrompt) {
          if (!post_text) {
            return { content: [{ type: 'text', text: 'Provide either prompt or post_text.' }], isError: true };
          }
          imagePrompt = await generateImagePrompt(post_text);
        }

        const imageUrl = await generateImage(imagePrompt);

        const isDataUri = imageUrl.startsWith('data:');
        return {
          content: [{
            type: 'text',
            text: isDataUri
              ? `Image generated (${Math.round(imageUrl.length / 1024)}KB data URI). Use this as image_url in publish tool.\nPrompt used: ${imagePrompt}`
              : `Image generated: ${imageUrl}\nPrompt used: ${imagePrompt}`,
          }],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Image generation failed: ${err.message}` }], isError: true };
      }
    },
  );

  // Tool: get_brand
  server.registerTool(
    'get_brand',
    {
      description: 'Show the currently saved brand profile (niche, tone, audience, post structure).',
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      const brand = loadBrand();
      if (!brand) {
        return { content: [{ type: 'text', text: 'No brand profile configured. Use setup_brand to create one.' }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(brand, null, 2) }] };
    },
  );

  return server;
}

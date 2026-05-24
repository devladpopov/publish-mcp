/**
 * Content source discovery and fetching.
 * Finds RSS feeds, parses websites, fetches content for post generation.
 */

import { generateText } from './ai.js';

export interface ContentItem {
  title: string;
  url: string;
  summary: string;
  source: string;
  publishedAt?: string;
}

/**
 * Fetch and parse an RSS feed, return items.
 */
export async function fetchRss(feedUrl: string): Promise<ContentItem[]> {
  const resp = await fetch(feedUrl);
  const xml = await resp.text();

  // Simple XML parser for RSS/Atom (no dependency needed)
  const items: ContentItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1] || match[2];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link') || extractAttr(block, 'link', 'href');
    const description = extractTag(block, 'description') || extractTag(block, 'summary');
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'published');

    if (title) {
      items.push({
        title: stripHtml(title),
        url: link || '',
        summary: stripHtml(description || '').slice(0, 500),
        source: feedUrl,
        publishedAt: pubDate || undefined,
      });
    }
  }

  return items;
}

/**
 * Scrape a webpage and extract main text content.
 */
export async function scrapeWebpage(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'publish-mcp/0.1 content-aggregator' },
  });
  const html = await resp.text();

  // Strip scripts, styles, and tags, keep text
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Limit to first 3000 chars for AI processing
  return text.slice(0, 3000);
}

/**
 * Use AI to discover potential content sources for a given niche.
 */
export async function discoverSources(
  niche: string,
  language: string,
): Promise<Array<{ name: string; url: string; type: string }>> {
  const prompt = `List 10 best content sources (RSS feeds, blogs, news sites, Telegram channels) for the "${niche}" niche in ${language}. For each, provide:
- name
- url (direct RSS feed URL if available, otherwise website URL)
- type (rss, website, telegram_channel)

Return ONLY a JSON array, no explanation. Example:
[{"name": "TechCrunch", "url": "https://techcrunch.com/feed/", "type": "rss"}]`;

  const result = await generateText('You are a content research assistant. Return only valid JSON.', prompt);

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.error('[sources] Failed to parse AI response as JSON');
    return [];
  }
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(regex);
  return m ? (m[1] || m[2] || '') : '';
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const m = xml.match(regex);
  return m ? m[1] : '';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

/**
 * Post generation and translation.
 */

import { generateText } from './ai.js';
import { loadBrand, brandToSystemPrompt, type BrandProfile } from './brand.js';

/**
 * Generate a post based on brand profile and a topic/source.
 */
export async function generatePost(
  topic: string,
  sourceContent?: string,
): Promise<{ text: string; headline?: string; hashtags?: string[] }> {
  const brand = loadBrand();
  const systemPrompt = brand
    ? brandToSystemPrompt(brand)
    : 'You are a social media content creator. Write engaging posts.';

  let userPrompt = `Write a social media post about: ${topic}`;

  if (sourceContent) {
    userPrompt += `\n\nSource material to reference (rephrase, don't copy):\n${sourceContent.slice(0, 2000)}`;
  }

  if (brand) {
    userPrompt += '\n\nPost structure requirements:';
    if (brand.postStructure.useHeadline) userPrompt += '\n- Start with a catchy headline';
    if (brand.postStructure.useCta) userPrompt += '\n- End with a call to action';
    if (brand.postStructure.useHashtags) userPrompt += '\n- Include 3-5 hashtags';
    if (brand.postStructure.useLinks) userPrompt += '\n- Mention where to learn more';
  }

  userPrompt += '\n\nReturn the post text only, ready to publish. No meta-commentary.';

  const text = await generateText(systemPrompt, userPrompt);

  // Extract hashtags if present
  const hashtagMatch = text.match(/#\w+/g);
  const hashtags = hashtagMatch || undefined;

  // Extract headline (first line if it looks like one)
  const lines = text.split('\n').filter((l) => l.trim());
  const headline = lines[0]?.length < 100 ? lines[0] : undefined;

  return { text, headline, hashtags };
}

/**
 * Generate a post from an RSS/scraped content item.
 */
export async function generatePostFromSource(
  title: string,
  summary: string,
  sourceUrl: string,
): Promise<string> {
  const brand = loadBrand();
  const systemPrompt = brand
    ? brandToSystemPrompt(brand)
    : 'You are a social media content creator. Write engaging posts.';

  const userPrompt = `Rewrite this news/article as a social media post for my audience:

Title: ${title}
Summary: ${summary}
Source: ${sourceUrl}

Requirements:
- Don't copy verbatim, rephrase in my voice
- Make it engaging and valuable
- Credit the source with a link
${brand?.postStructure.useHashtags ? '- Add 3-5 relevant hashtags' : ''}
${brand?.postStructure.useCta ? '- End with a call to action' : ''}

Return only the post text, ready to publish.`;

  return generateText(systemPrompt, userPrompt);
}

/**
 * Translate a post to another language.
 */
export async function translatePost(
  text: string,
  targetLanguage: string,
): Promise<string> {
  const brand = loadBrand();

  const systemPrompt = brand
    ? `You are a translator who maintains the brand voice. ${brandToSystemPrompt(brand)}`
    : 'You are a professional translator for social media content.';

  const userPrompt = `Translate this social media post to ${targetLanguage}. Maintain the tone, formatting, and hashtags. Adapt culturally where needed.

Post:
${text}

Return only the translated post, ready to publish.`;

  return generateText(systemPrompt, userPrompt);
}

/**
 * Generate an image prompt based on post content and brand.
 */
export async function generateImagePrompt(postText: string): Promise<string> {
  const brand = loadBrand();

  const userPrompt = `Generate a concise image generation prompt for a social media post visual. The image should complement this post:

"${postText.slice(0, 500)}"

${brand ? `Niche: ${brand.niche}` : ''}

Requirements:
- Describe a clean, professional image
- No text in the image (text will be overlaid separately)
- Suitable for social media (square or landscape format)
- Modern, eye-catching style

Return only the image prompt, one paragraph, no explanation.`;

  return generateText('You write image generation prompts.', userPrompt);
}

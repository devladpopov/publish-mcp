/**
 * Competitor analysis module.
 * Scrapes competitor content and analyzes their strategy.
 */

import { generateText } from './ai.js';
import { scrapeWebpage } from './sources.js';

export interface CompetitorAnalysis {
  competitor: string;
  url: string;
  postingFrequency: string;
  contentTopics: string[];
  toneOfVoice: string;
  contentFormats: string[];
  strengths: string[];
  gaps: string[];
}

/**
 * Analyze a competitor's content strategy by scraping their page.
 */
export async function analyzeCompetitor(
  url: string,
  niche: string,
): Promise<CompetitorAnalysis> {
  const content = await scrapeWebpage(url);

  const prompt = `Analyze this content from a competitor in the "${niche}" niche. Their URL is ${url}.

Content sample:
${content}

Provide analysis as JSON with these fields:
- competitor: their name/brand
- url: "${url}"
- postingFrequency: estimated posting frequency (e.g., "daily", "3x per week")
- contentTopics: array of main topics they cover
- toneOfVoice: their writing style description
- contentFormats: array of formats used (text, image, video, carousel, etc.)
- strengths: what they do well (array)
- gaps: what they miss or could do better (array)

Return ONLY valid JSON, no explanation.`;

  const result = await generateText(
    'You are a content marketing analyst. Return only valid JSON.',
    prompt,
  );

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      competitor: url,
      url,
      postingFrequency: 'unknown',
      contentTopics: [],
      toneOfVoice: 'unknown',
      contentFormats: [],
      strengths: [],
      gaps: ['Could not analyze content'],
    };
  }
}

/**
 * Analyze multiple competitors and generate a summary.
 */
export async function analyzeCompetitors(
  urls: string[],
  niche: string,
): Promise<{ analyses: CompetitorAnalysis[]; summary: string }> {
  const analyses = await Promise.all(
    urls.map((url) => analyzeCompetitor(url, niche)),
  );

  const summaryPrompt = `Based on these competitor analyses in the "${niche}" niche:

${JSON.stringify(analyses, null, 2)}

Write a brief strategic summary (3-5 paragraphs):
1. Common patterns across competitors
2. Content gaps and opportunities
3. Recommended differentiation strategy
4. Suggested content topics that competitors miss`;

  const summary = await generateText(
    'You are a content strategist.',
    summaryPrompt,
  );

  return { analyses, summary };
}

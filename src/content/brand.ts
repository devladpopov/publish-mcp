import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface BrandProfile {
  niche: string;
  tone: string;
  language: string;
  targetAudience: string;
  postStructure: {
    useHeadline: boolean;
    useCta: boolean;
    useHashtags: boolean;
    useLinks: boolean;
  };
  samplePosts: string[];
  competitors: string[];
  sources: SourceConfig[];
}

export interface SourceConfig {
  type: 'rss' | 'website' | 'telegram_channel' | 'manual';
  url: string;
  name: string;
}

const DATA_DIR = process.env.PUBLISH_MCP_DATA_DIR || join(process.cwd(), '.publish-mcp');

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function brandPath(): string {
  return join(DATA_DIR, 'brand.json');
}

export function loadBrand(): BrandProfile | null {
  const path = brandPath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveBrand(brand: BrandProfile): void {
  ensureDataDir();
  writeFileSync(brandPath(), JSON.stringify(brand, null, 2));
}

export function brandToSystemPrompt(brand: BrandProfile): string {
  const parts: string[] = [
    `You are a content creator for the "${brand.niche}" niche.`,
    `Tone of voice: ${brand.tone}.`,
    `Language: ${brand.language}.`,
    `Target audience: ${brand.targetAudience}.`,
  ];

  if (brand.postStructure.useHeadline) parts.push('Always start with a catchy headline.');
  if (brand.postStructure.useCta) parts.push('End with a clear call to action.');
  if (brand.postStructure.useHashtags) parts.push('Include 3-5 relevant hashtags at the end.');
  if (brand.postStructure.useLinks) parts.push('Include relevant links when available.');

  if (brand.samplePosts.length > 0) {
    parts.push('\nHere are example posts to match the style:');
    brand.samplePosts.forEach((s, i) => parts.push(`\nExample ${i + 1}:\n${s}`));
  }

  return parts.join('\n');
}

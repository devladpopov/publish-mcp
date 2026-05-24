/**
 * AI generation module.
 * Supports: Gemini, OpenAI, Claude (Anthropic), Ollama (local LLMs), any OpenAI-compatible API.
 */

export type AiProvider = 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'openai-compatible';

interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/**
 * Provider priority: explicit AI_PROVIDER env > first available key.
 * For Ollama / local LLMs: no API key needed, just OLLAMA_BASE_URL.
 * For OpenAI-compatible (Together, Groq, Fireworks, etc.): OPENAI_COMPATIBLE_BASE_URL + key.
 */
function getAiConfig(): AiConfig {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();

  if (explicit === 'anthropic' || (!explicit && process.env.ANTHROPIC_API_KEY)) {
    return {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    };
  }

  if (explicit === 'gemini' || (!explicit && process.env.GEMINI_API_KEY)) {
    return {
      provider: 'gemini',
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    };
  }

  if (explicit === 'openai' || (!explicit && process.env.OPENAI_API_KEY)) {
    return {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };
  }

  if (explicit === 'ollama' || (!explicit && process.env.OLLAMA_BASE_URL)) {
    return {
      provider: 'ollama',
      apiKey: 'ollama',
      model: process.env.OLLAMA_MODEL || 'llama3.1',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    };
  }

  if (explicit === 'openai-compatible' || (!explicit && process.env.OPENAI_COMPATIBLE_BASE_URL)) {
    return {
      provider: 'openai-compatible',
      apiKey: process.env.OPENAI_COMPATIBLE_API_KEY || '',
      model: process.env.OPENAI_COMPATIBLE_MODEL || 'default',
      baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL || '',
    };
  }

  throw new Error(
    'No AI provider configured. Set one of: GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, OLLAMA_BASE_URL, or OPENAI_COMPATIBLE_BASE_URL.'
  );
}

export function getProviderInfo(): { provider: string; model: string } {
  try {
    const config = getAiConfig();
    return { provider: config.provider, model: config.model };
  } catch {
    return { provider: 'none', model: 'none' };
  }
}

export async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
  const config = getAiConfig();

  switch (config.provider) {
    case 'gemini':
      return callGemini(config, systemPrompt, userPrompt);
    case 'openai':
      return callOpenAICompatible(config, 'https://api.openai.com/v1', systemPrompt, userPrompt);
    case 'anthropic':
      return callAnthropic(config, systemPrompt, userPrompt);
    case 'ollama':
      return callOpenAICompatible(config, `${config.baseUrl}/v1`, systemPrompt, userPrompt);
    case 'openai-compatible':
      return callOpenAICompatible(config, config.baseUrl!, systemPrompt, userPrompt);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

// ── Gemini ──

async function callGemini(config: AiConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
    }),
  });

  const data = await resp.json() as {
    candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(`Gemini error: ${data.error.message}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Anthropic (Claude) ──

async function callAnthropic(config: AiConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const data = await resp.json() as {
    content?: Array<{ type: string; text: string }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(`Claude error: ${data.error.message}`);
  return data.content?.[0]?.text || '';
}

// ── OpenAI-compatible (OpenAI, Ollama, Together, Groq, Fireworks, LM Studio, etc.) ──

async function callOpenAICompatible(
  config: AiConfig,
  baseUrl: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey && config.apiKey !== 'ollama') {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  const data = await resp.json() as {
    choices?: Array<{ message: { content: string } }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(`${config.provider} error: ${data.error.message}`);
  return data.choices?.[0]?.message?.content || '';
}

// ── Image generation ──

export async function generateImage(prompt: string): Promise<string> {
  const config = getAiConfig();

  if (config.provider === 'gemini') {
    return generateImageGemini(config.apiKey, prompt);
  }
  if (config.provider === 'openai') {
    return generateImageDalle(config.apiKey, prompt);
  }
  if (config.provider === 'anthropic') {
    throw new Error('Claude does not support image generation. Set GEMINI_API_KEY or OPENAI_API_KEY for generate_media.');
  }
  if (config.provider === 'ollama') {
    throw new Error('Ollama does not support image generation. Set GEMINI_API_KEY or OPENAI_API_KEY for generate_media.');
  }
  // openai-compatible: try DALL-E compatible endpoint
  return generateImageOpenAICompatible(config, prompt);
}

async function generateImageGemini(apiKey: string, prompt: string): Promise<string> {
  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-preview-image-generation';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });

  const data = await resp.json() as {
    candidates?: Array<{
      content: {
        parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
      };
    }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(`Gemini image error: ${data.error.message}`);

  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData);

  if (!imagePart?.inlineData) {
    throw new Error('Gemini did not return an image. Try a different prompt.');
  }

  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
}

async function generateImageDalle(apiKey: string, prompt: string): Promise<string> {
  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.DALLE_MODEL || 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    }),
  });

  const data = await resp.json() as {
    data?: Array<{ url: string }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(`DALL-E error: ${data.error.message}`);
  return data.data?.[0]?.url || '';
}

async function generateImageOpenAICompatible(config: AiConfig, prompt: string): Promise<string> {
  const resp = await fetch(`${config.baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.IMAGE_MODEL || 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    }),
  });

  const data = await resp.json() as {
    data?: Array<{ url: string }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(`Image generation error: ${data.error.message}`);
  return data.data?.[0]?.url || '';
}

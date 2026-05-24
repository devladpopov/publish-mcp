/**
 * AI generation module. Supports Gemini (free tier) and OpenAI.
 * Used for: post generation, translation, competitor analysis, image generation.
 */

export type AiProvider = 'gemini' | 'openai';

interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

function getAiConfig(): AiConfig {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    return {
      provider: 'gemini',
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    };
  }
  if (openaiKey) {
    return {
      provider: 'openai',
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };
  }
  throw new Error('No AI API key configured. Set GEMINI_API_KEY or OPENAI_API_KEY.');
}

export async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
  const config = getAiConfig();

  if (config.provider === 'gemini') {
    return callGemini(config, systemPrompt, userPrompt);
  }
  return callOpenAI(config, systemPrompt, userPrompt);
}

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

async function callOpenAI(config: AiConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
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

  if (data.error) throw new Error(`OpenAI error: ${data.error.message}`);
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Generate an image via Gemini Imagen or DALL-E.
 * Returns a URL to the generated image.
 */
export async function generateImage(prompt: string): Promise<string> {
  const config = getAiConfig();

  if (config.provider === 'gemini') {
    return generateImageGemini(config.apiKey, prompt);
  }
  return generateImageDalle(config.apiKey, prompt);
}

async function generateImageGemini(apiKey: string, prompt: string): Promise<string> {
  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-preview-image-generation';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
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

  // Return as data URI (can be used directly or uploaded)
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

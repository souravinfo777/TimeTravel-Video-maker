import { GoogleGenAI } from '@google/genai';

// ─── API Configuration ────────────────────────────────────────────
const DEFAULT_GEMINI_API_KEYS = [
  'AIzaSyANRv21oiICaZDnN0clB4O1pGTEgcyQDT8', // Original key
  'AIzaSyAIgUO78h8dtuDIZv7slnL5PYBjxyJjhc0',
  'AIzaSyAmUqWYZeluJjW4d7n_JangCNoKAVXggJA',
  'AIzaSyDhFwbrcHu-NG-_H2cVpaAb8s_Up8WNyIQ'
];
let currentGeminiKeyIndex = 0;

function getActiveApiKeys(): string[] {
  try {
    const saved = localStorage.getItem('gemini_api_keys');
    if (saved && saved.trim().length > 0) {
      // Split by space, comma, newline and filter empty ones
      const keys = saved.split(/[\s,]+/).filter(k => k.trim().length > 0);
      if (keys.length > 0) return keys;
    }
  } catch (e) {
    // Ignore localStorage access errors
  }
  return DEFAULT_GEMINI_API_KEYS;
}

// ─── Model Assignments (Google AI Studio) ──────────────
const MODELS = {
  promptGeneration: 'gemini-2.5-flash',
  locationDescription: 'gemini-2.5-flash',
  imageAnalysis: 'gemini-2.5-flash',
  smartSuggestions: 'gemini-2.5-flash',
};

// ─── Gemini Chat Wrapper ─────────────────────────────────────────
async function geminiChat(
  model: string,
  messages: Array<{ role: string; content: string | any[] }>,
  options: {
    jsonMode?: boolean;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const ai = getGeminiAI();

  let systemInstruction: string | undefined = undefined;
  const contents: any[] = [];
  
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    } else {
      let parts = [];
      if (typeof msg.content === 'string') {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const c of msg.content) {
          if (c.type === 'text') {
            parts.push({ text: c.text });
          } else if (c.type === 'image_url') {
            const dataUrl = c.image_url.url;
            const mimeType = dataUrl.split(';')[0].split(':')[1] || 'image/png';
            const data = dataUrl.split(',')[1];
            parts.push({ inlineData: { data, mimeType } });
          }
        }
      }
      contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts });
    }
  }

  const config: any = {
    temperature: options.temperature ?? 0.7,
  };
  
  if (options.maxTokens) {
    config.maxOutputTokens = options.maxTokens;
  }
  
  if (options.jsonMode) {
    config.responseMimeType = 'application/json';
  }
  
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  const response = await ai.models.generateContent({
    model: model || 'gemini-2.5-flash',
    contents,
    config,
  });

  const text = response?.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini AI returned an empty response. Please try again.');
  }

  return text;
}

// ─── Gemini (getAi and configure) ─────────────────────────────────
const getGeminiAI = () => {
  const activeKeys = getActiveApiKeys();
  if (currentGeminiKeyIndex >= activeKeys.length) {
    currentGeminiKeyIndex = 0;
  }
  
  const key = activeKeys[currentGeminiKeyIndex];
  // Rotate to the next key for the subsequent request
  currentGeminiKeyIndex = (currentGeminiKeyIndex + 1) % activeKeys.length;
  console.log(`Using Gemini API key ending in: ...${key.slice(-4)} (from ${activeKeys.length} available)`);
  return new GoogleGenAI({ apiKey: key });
};
// ═══════════════════════════════════════════════════════════════════
// TEXT FUNCTIONS — powered by Nexum API
// ═══════════════════════════════════════════════════════════════════

export async function generateLocationDescription(hint: string): Promise<{ description: string; places: any[] }> {
  const response = await geminiChat(
    MODELS.locationDescription,
    [
      {
        role: 'system',
        content: 'You are a location description AI. Provide highly detailed physical descriptions suitable for image generation prompts. Include architecture, materials, vegetation, street elements, and atmosphere. No conversational text — just the description.',
      },
      {
        role: 'user',
        content: `Describe a real-world location based on this hint: "${hint}". 
        Provide a highly detailed physical description suitable for an image generation prompt. 
        Include details about:
        - Architecture and building materials
        - Vegetation and landscaping
        - Street elements (mailboxes, fences, pavement)
        - Lighting and atmosphere`,
      },
    ],
    { temperature: 0.6 }
  );

  return { description: response, places: [] };
}

export async function generatePrompts(params: any): Promise<any[]> {
  const { startYear, endYear, numImages, locationDescription, charactersEnabled, numPeople, characterNotes, decayLevel } = params;

  const years: number[] = [];
  if (numImages <= 1) {
    years.push(startYear);
  } else {
    const step = (endYear - startYear) / (numImages - 1);
    for (let i = 0; i < numImages; i++) {
      years.push(Math.round(startYear + step * i));
    }
  }

  const response = await geminiChat(
    MODELS.promptGeneration,
    [
      {
        role: 'system',
        content: `You are an expert cinematic prompt engineer. Generate image prompts for a time-travel street view video.
        
You MUST respond with ONLY a JSON array of objects with "year" (integer) and "prompt" (string) fields. No markdown, no code blocks, no explanation — just the raw JSON array.`,
      },
      {
        role: 'user',
        content: `Generate a sequence of ${numImages} image prompts for the years: ${years.join(', ')}.
    
    Location: ${locationDescription}
    Characters: ${charactersEnabled ? `${numPeople} people. Notes: ${characterNotes}` : 'No people.'}
    Decay Level (0-100): ${decayLevel} (0 = pristine, 100 = completely ruined by the final year)
    
    CRITICAL RULES FOR CONSISTENCY AND ANGLE:
    1. EXACT SAME CAMERA ANGLE: Every single prompt MUST start with the exact same description of the camera angle, framing, and perspective (e.g., "Eye-level wide shot from the center of the street looking directly at the front of the house..."). Do not vary the angle.
    2. STRUCTURAL CONSISTENCY: The core buildings, terrain, and layout MUST be described identically in every prompt.
    3. PROGRESSION: Only change the weather, aging, decay, overgrowth, and character aging based on the year and decay level.
    4. TEXT OVERLAY: Include "Text overlay: [YEAR]" at the end of each prompt.
    5. Each prompt must be a single, highly detailed paragraph ready for an image generation model.
    
    Respond with ONLY the JSON array. Example format:
    [{"year": 2000, "prompt": "Eye-level wide shot..."}]`,
      },
    ],
    { jsonMode: true, temperature: 0.7, maxTokens: 8000 }
  );

  let text = response.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  
  if (!text) {
    throw new Error('Gemini AI returned an empty response. Please try again.');
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    // Fallback: If it's abruptly cut off, attempt to inject closing brackets
    console.warn("Failed to parse raw JSON, attempting fallback fix:", text);
    if (!text.endsWith(']')) text = text + '}]';
    if (!text.endsWith('}]')) text = text + ']';
    
    try {
      return JSON.parse(text);
    } catch (fallbackError) {
      throw new Error(`The AI model failed to produce a valid timeline array. Response got truncated.`);
    }
  }
}

export async function analyzeImage(base64Image: string): Promise<string> {
  const dataUrl = base64Image; 

  const response = await geminiChat(
    MODELS.imageAnalysis,
    [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: dataUrl },
          },
          {
            type: 'text',
            text: 'Analyze this image in detail. Describe the environment, the condition of the location, any characters present, and the overall mood.',
          },
        ],
      },
    ],
    { temperature: 0.5 }
  );

  return response;
}

export async function generateSmartSuggestions(params: {
  startYear: number;
  endYear: number;
  existingYears: number[];
  locationHint: string;
  locationDescription: string;
}): Promise<Array<{ year: number; reason: string; promptSuggestion: string }>> {
  const { startYear, endYear, existingYears, locationHint, locationDescription } = params;

  const response = await geminiChat(
    MODELS.smartSuggestions,
    [
      {
        role: 'system',
        content: `You are a historical consultant for a time-travel street view video project. Suggest missing historically significant years that would create dramatic visual changes.
        
You MUST respond with ONLY a JSON array of objects, each with "year" (integer), "reason" (string, 1-2 sentences), and "promptSuggestion" (string, detailed image prompt). No markdown, no code blocks — just the raw JSON array.`,
      },
      {
        role: 'user',
        content: `The current timeline spans ${startYear} to ${endYear} at this location: "${locationHint}".
    Description: ${locationDescription}
    
    Existing scene years: ${existingYears.join(', ')}
    
    Suggest 3-4 historically significant years that are MISSING from this timeline.
    These should be years where something visually dramatic or historically important would have changed the appearance of this location.
    
    Consider:
    - Major historical events (wars, disasters, booms)
    - Architectural movements and styles
    - Technological changes (gaslight to electric, horses to cars)
    - Cultural shifts visible in street life
    - Natural events (storms, droughts)
    
    Each suggestion should be a year NOT already in the existing list.
    
    Respond with ONLY the JSON array.`,
      },
    ],
    { jsonMode: true, temperature: 0.6 }
  );

  let text = response.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(text);
}

// ═══════════════════════════════════════════════════════════════════
// IMAGE FUNCTIONS — powered by Gemini native API (image gen only)
// ═══════════════════════════════════════════════════════════════════

export async function generateImage(prompt: string, aspectRatio: string, imageSize: string): Promise<string> {
  const ai = getGeminiAI();

  // Clean up the prompt to prevent 500 errors and ensure it's safe for the model.
  let safePrompt = prompt.replace(/Text overlay:.*?$/im, '').trim();
  safePrompt = safePrompt.substring(0, 1000) + ' Documentary photography, highly detailed.';

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: safePrompt }] },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const mimeType = part.inlineData.mimeType || 'image/png';
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error('No image generated');
}

export async function editImage(base64Image: string, editPrompt: string): Promise<string> {
  const ai = getGeminiAI();
  const mimeType = base64Image.split(';')[0].split(':')[1];
  const data = base64Image.split(',')[1];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ inlineData: { data, mimeType } }, { text: editPrompt }],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const outMimeType = part.inlineData.mimeType || 'image/png';
      return `data:${outMimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error('No image generated');
}

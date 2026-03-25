import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_MODEL = "gemini-2.5-flash-preview-05-20";

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set. Add it to your .env file.");
  return new GoogleGenAI({ apiKey });
}

async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI['models']['generateContent']>[0],
  maxRetries = 3
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent(params);
      const text = response.text;
      if (!text) throw new Error("No response from AI");
      return text;
    } catch (error: unknown) {
      const isRateLimit =
        error instanceof Error &&
        (error.message.includes('429') || error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('rate'));

      if (isRateLimit && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function translateCard(frontText: string, backText: string, targetLanguage: string = "English"): Promise<{ frontTranslation: string; backTranslation: string }> {
  const ai = getAI();

  const prompt = `Translate the following flashcard content into ${targetLanguage}. If it is already in ${targetLanguage}, provide a slightly simplified or alternative ${targetLanguage} phrasing.

Front: ${frontText}
Back: ${backText}`;

  const text = await generateWithRetry(ai, {
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          frontTranslation: { type: Type.STRING, description: "Translated front text." },
          backTranslation: { type: Type.STRING, description: "Translated back text." },
        },
        required: ["frontTranslation", "backTranslation"],
      },
    },
  });

  return JSON.parse(text);
}

export async function summarizeCard(backText: string): Promise<{ backShort: string }> {
  const ai = getAI();

  const prompt = `Summarize the following flashcard answer into a concise short answer (1–2 sentences max). Keep only the most essential information.

Answer: ${backText}`;

  const text = await generateWithRetry(ai, {
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          backShort: { type: Type.STRING, description: "A concise 1–2 sentence summary." },
        },
        required: ["backShort"],
      },
    },
  });

  return JSON.parse(text);
}

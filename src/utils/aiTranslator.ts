import { GoogleGenAI, Type } from "@google/genai";

export async function translateCard(frontText: string, backText: string, targetLanguage: string = "English"): Promise<{ frontTranslation: string; backTranslation: string }> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `Translate the following flashcard content into ${targetLanguage}. If it is already in ${targetLanguage}, provide a slightly simplified or alternative ${targetLanguage} phrasing. Provide a good translation.
    
Front: ${frontText}
Back: ${backText}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            frontTranslation: {
              type: Type.STRING,
              description: "The translated text for the front of the flashcard.",
            },
            backTranslation: {
              type: Type.STRING,
              description: "The translated text for the back of the flashcard.",
            },
          },
          required: ["frontTranslation", "backTranslation"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from AI");
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

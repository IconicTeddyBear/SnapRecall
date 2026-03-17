import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'gemini-api-proxy',
        configureServer(server) {
          server.middlewares.use('/api/translate', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            let body = '';
            req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
            req.on('end', async () => {
              try {
                const { frontText, backText, targetLanguage } = JSON.parse(body);
                const apiKey = env.GEMINI_API_KEY;
                if (!apiKey) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }));
                  return;
                }

                const { GoogleGenAI, Type } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey });

                const prompt = `Translate the following flashcard content into ${targetLanguage || 'English'}. If it is already in ${targetLanguage || 'English'}, provide a slightly simplified or alternative phrasing. Provide a good translation.\n\nFront: ${frontText}\nBack: ${backText}`;

                const response = await ai.models.generateContent({
                  model: 'gemini-2.0-flash',
                  contents: prompt,
                  config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                        frontTranslation: { type: Type.STRING, description: 'The translated text for the front of the flashcard.' },
                        backTranslation: { type: Type.STRING, description: 'The translated text for the back of the flashcard.' },
                      },
                      required: ['frontTranslation', 'backTranslation'],
                    },
                  },
                });

                const text = response.text;
                if (!text) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'No response from AI' }));
                  return;
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(text);
              } catch (error) {
                console.error('Translation API error:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Translation failed' }));
              }
            });
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

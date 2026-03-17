export async function translateCard(frontText: string, backText: string, targetLanguage: string = "English"): Promise<{ frontTranslation: string; backTranslation: string }> {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frontText, backText, targetLanguage }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Translation failed' }));
    throw new Error(error.error || 'Translation failed');
  }

  return response.json();
}

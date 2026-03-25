import { Card } from '../models/types';

export const csvUtils = {
  generateCSV: (cards: Card[]): string => {
    const header = 'id,front,back,back_short,category,tags,front_image,back_image,front_translation,back_translation\n';
    const rows = cards.map(card => {
      const id = card.id;
      const front = `"${card.front.replace(/"/g, '""')}"`;
      const back = `"${card.back.replace(/"/g, '""')}"`;
      const backShort = `"${(card.backShort || '').replace(/"/g, '""')}"`;
      const category = `"${(card.category || '').replace(/"/g, '""')}"`;
      // Use semicolon for tags to avoid conflict with comma separator
      const tags = `"${card.tags.join(';').replace(/"/g, '""')}"`;
      const frontImage = `"${(card.frontImage || '').replace(/"/g, '""')}"`;
      const backImage = `"${(card.backImage || '').replace(/"/g, '""')}"`;
      const frontTranslation = `"${(card.frontTranslation || '').replace(/"/g, '""')}"`;
      const backTranslation = `"${(card.backTranslation || '').replace(/"/g, '""')}"`;
      return `${id},${front},${back},${backShort},${category},${tags},${frontImage},${backImage},${frontTranslation},${backTranslation}`;
    }).join('\n');
    return header + rows;
  },

  parseCSV: (csvText: string): Partial<Card>[] => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const idIdx = headers.indexOf('id');
    const frontIdx = headers.indexOf('front');
    const backIdx = headers.indexOf('back');
    const backShortIdx = headers.indexOf('back_short');
    const categoryIdx = headers.indexOf('category');
    const tagsIdx = headers.indexOf('tags');
    const frontImgIdx = headers.indexOf('front_image');
    const backImgIdx = headers.indexOf('back_image');
    const frontTransIdx = headers.indexOf('front_translation');
    const backTransIdx = headers.indexOf('back_translation');

    if (frontIdx === -1 || backIdx === -1) {
      throw new Error('CSV must have "front" and "back" columns.');
    }

    const results: Partial<Card>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parser that handles quotes
      const parts: string[] = [];
      let currentPart = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          if (inQuotes && line[j + 1] === '"') {
            currentPart += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          parts.push(currentPart.trim());
          currentPart = '';
        } else {
          currentPart += char;
        }
      }
      parts.push(currentPart.trim());

      if (parts.length >= 2) {
        const tagsRaw = tagsIdx !== -1 && parts[tagsIdx] ? parts[tagsIdx] : '';
        // Support both semicolon and comma for tags
        const tags = tagsRaw.split(/[;,]/).map(t => t.trim()).filter(t => t !== '');

        const card: Partial<Card> = {
          front: parts[frontIdx] || '',
          back: parts[backIdx] || '',
          tags: tags,
        };

        if (idIdx !== -1 && parts[idIdx]) card.id = parts[idIdx];
        if (backShortIdx !== -1 && parts[backShortIdx]) card.backShort = parts[backShortIdx];
        if (categoryIdx !== -1 && parts[categoryIdx]) card.category = parts[categoryIdx];
        if (frontImgIdx !== -1 && parts[frontImgIdx]) card.frontImage = parts[frontImgIdx];
        if (backImgIdx !== -1 && parts[backImgIdx]) card.backImage = parts[backImgIdx];
        if (frontTransIdx !== -1 && parts[frontTransIdx]) card.frontTranslation = parts[frontTransIdx];
        if (backTransIdx !== -1 && parts[backTransIdx]) card.backTranslation = parts[backTransIdx];

        results.push(card);
      }
    }

    return results;
  },

  downloadCSV: (csvText: string, filename: string) => {
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};

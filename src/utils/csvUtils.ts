import { Card } from '../models/types';

export const csvUtils = {
  generateCSV: (cards: Card[]): string => {
    const header = 'front,back,tags,front_image,back_image\n';
    const rows = cards.map(card => {
      const front = `"${card.front.replace(/"/g, '""')}"`;
      const back = `"${card.back.replace(/"/g, '""')}"`;
      const tags = `"${card.tags.join(',').replace(/"/g, '""')}"`;
      const frontImage = `"${(card.frontImage || '').replace(/"/g, '""')}"`;
      const backImage = `"${(card.backImage || '').replace(/"/g, '""')}"`;
      return `${front},${back},${tags},${frontImage},${backImage}`;
    }).join('\n');
    return header + rows;
  },

  parseCSV: (csvText: string): Partial<Card>[] => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const frontIdx = headers.indexOf('front');
    const backIdx = headers.indexOf('back');
    const tagsIdx = headers.indexOf('tags');
    const frontImgIdx = headers.indexOf('front_image');
    const backImgIdx = headers.indexOf('back_image');

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
        const tags = tagsIdx !== -1 && parts[tagsIdx] 
          ? parts[tagsIdx].split(',').map(t => t.trim().toLowerCase()).filter(t => t !== '')
          : [];

        results.push({
          front: parts[frontIdx] || '',
          back: parts[backIdx] || '',
          tags: tags,
          frontImage: frontImgIdx !== -1 ? parts[frontImgIdx] : undefined,
          backImage: backImgIdx !== -1 ? parts[backImgIdx] : undefined,
        });
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

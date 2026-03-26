import React from 'react';
import { Bold, Italic, List, ListOrdered, Minus, Code } from 'lucide-react';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (val: string) => void;
}

type Format = 'bold' | 'italic' | 'bullet' | 'numbered' | 'hr' | 'code';

function applyFormat(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (val: string) => void,
  format: Format
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.substring(start, end);
  const before = value.substring(0, start);
  const after = value.substring(end);

  let inserted = '';
  let cursorStart = start;
  let cursorEnd = start;

  switch (format) {
    case 'bold': {
      inserted = `**${selected || 'bold text'}**`;
      cursorStart = selected ? start : start + 2;
      cursorEnd = selected ? start + inserted.length - 4 + selected.length : start + inserted.length - 2;
      break;
    }
    case 'italic': {
      inserted = `*${selected || 'italic text'}*`;
      cursorStart = selected ? start : start + 1;
      cursorEnd = selected ? start + inserted.length - 2 + selected.length : start + inserted.length - 1;
      break;
    }
    case 'bullet': {
      if (selected) {
        inserted = selected.split('\n').map(l => `- ${l}`).join('\n');
      } else {
        inserted = '- ';
      }
      cursorStart = start + inserted.length;
      cursorEnd = cursorStart;
      break;
    }
    case 'numbered': {
      if (selected) {
        inserted = selected.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n');
      } else {
        inserted = '1. ';
      }
      cursorStart = start + inserted.length;
      cursorEnd = cursorStart;
      break;
    }
    case 'hr': {
      const prefix = before.endsWith('\n') || before === '' ? '' : '\n';
      inserted = `${prefix}---\n`;
      cursorStart = start + inserted.length;
      cursorEnd = cursorStart;
      break;
    }
    case 'code': {
      inserted = `\`${selected || 'code'}\``;
      cursorStart = selected ? start : start + 1;
      cursorEnd = selected ? start + inserted.length - 2 + selected.length : start + inserted.length - 1;
      break;
    }
  }

  const newValue = before + inserted + after;
  onChange(newValue);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(cursorStart, cursorEnd);
  });
}

const tools: { format: Format; icon: React.ElementType; title: string }[] = [
  { format: 'bold', icon: Bold, title: 'Bold (select text first)' },
  { format: 'italic', icon: Italic, title: 'Italic (select text first)' },
  { format: 'bullet', icon: List, title: 'Bullet list' },
  { format: 'numbered', icon: ListOrdered, title: 'Numbered list' },
  { format: 'code', icon: Code, title: 'Inline code' },
  { format: 'hr', icon: Minus, title: 'Horizontal rule' },
];

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ textareaRef, value, onChange }) => {
  const handleClick = (e: React.MouseEvent, format: Format) => {
    e.preventDefault();
    if (!textareaRef.current) return;
    applyFormat(textareaRef.current, value, onChange, format);
  };

  return (
    <div className="flex items-center gap-1 mb-1">
      {tools.map(({ format, icon: Icon, title }) => (
        <button
          key={format}
          type="button"
          title={title}
          onMouseDown={(e) => handleClick(e, format)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors"
        >
          <Icon size={15} />
        </button>
      ))}
      <span className="ml-2 text-[10px] text-slate-600 font-mono">Markdown + LaTeX supported</span>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { Card } from '../models/types';
import { X, Save, Tag as TagIcon, Image as ImageIcon, Trash2, Eye, Languages, Loader2, Wand2 } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { translateCard, summarizeCard } from '../utils/aiTranslator';
import DOMPurify from 'dompurify';

interface EditorViewProps {
  card?: Card;
  categories: string[];
  initialTags?: string[];
  initialCategory?: string;
  onSave: (card: Partial<Card>) => void;
  onCancel: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({ card, categories, initialTags, initialCategory, onSave, onCancel }) => {
  const [front, setFront] = useState(card?.front || '');
  const [back, setBack] = useState(card?.back || '');
  const [backShort, setBackShort] = useState(card?.backShort || '');
  const [category, setCategory] = useState(card?.category || initialCategory || '');
  const [frontImage, setFrontImage] = useState(card?.frontImage || '');
  const [backImage, setBackImage] = useState(card?.backImage || '');
  const [tagsInput, setTagsInput] = useState(card?.tags.join(', ') || initialTags?.join(', ') || '');
  const [showPreview, setShowPreview] = useState(false);
  const [frontTranslation, setFrontTranslation] = useState(card?.frontTranslation || '');
  const [backTranslation, setBackTranslation] = useState(card?.backTranslation || '');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (side === 'front') setFrontImage(base64);
      else setBackImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleTranslate = async () => {
    if (!front && !back) return;
    setIsTranslating(true);
    try {
      const { frontTranslation: ft, backTranslation: bt } = await translateCard(front, back);
      setFrontTranslation(ft);
      setBackTranslation(bt);
    } catch (error) {
      alert(`Translation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSummarize = async () => {
    if (!back) return;
    setIsSummarizing(true);
    try {
      const { backShort: summary } = await summarizeCard(back);
      setBackShort(summary);
    } catch (error) {
      alert(`Summarize failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clean and deduplicate tags
    const tags = Array.from(new Set(
      tagsInput.split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t !== '')
    ));
    
    onSave({
      id: card?.id,
      front,
      back,
      backShort: backShort || undefined,
      category: category.trim() || undefined,
      frontImage,
      backImage,
      frontTranslation: frontTranslation || undefined,
      backTranslation: backTranslation || undefined,
      tags,
    });
  };

  const currentTags = Array.from(new Set(
    tagsInput.split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t !== '')
  ));

  const renderPreview = (text: string) => {
    const isHtml = (t: string) => {
      const trimmed = t.trim();
      return trimmed.startsWith('<') && trimmed.endsWith('>');
    };

    if (isHtml(text)) {
      const sanitizedHtml = DOMPurify.sanitize(text);
      return (
        <div 
          className="markdown-body text-base font-medium text-white leading-relaxed text-center inline-block w-full max-w-full prose prose-invert prose-p:my-2 prose-headings:my-3 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 p-4 bg-slate-900 border border-slate-700 rounded-2xl min-h-[100px]"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      );
    }

    return (
      <div className="markdown-body text-base font-medium text-white leading-relaxed text-center inline-block w-full max-w-full prose prose-invert prose-p:my-2 prose-headings:my-3 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 p-4 bg-slate-900 border border-slate-700 rounded-2xl min-h-[100px]">
        <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {text || '*Empty*'}
        </Markdown>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">{card ? 'Edit Card' : 'Create New Card'}</h2>
          <p className="text-slate-400 text-sm">Fill in the details for your flashcard. Supports Markdown and LaTeX.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onCancel} 
            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
            title="Close editor"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Category Section */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Category</label>
          <div className="relative">
            <input
              type="text"
              list="categories-list"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Allgemeinbildung, NIN, Science..."
              className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all font-medium shadow-sm text-white placeholder-slate-500"
            />
            <datalist id="categories-list">
              {categories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Front Section */}
        <div className="space-y-4 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-sm">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Front Content</label>
            {showPreview ? renderPreview(front) : (
              <textarea
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="Enter raw Markdown or LaTeX here..."
                className="w-full min-h-[150px] p-4 bg-slate-900 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all resize-y font-mono text-sm text-white placeholder-slate-500"
              />
            )}
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Front Image (Optional)</label>
            <div className="flex items-center gap-4">
              {frontImage ? (
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-slate-700 group">
                  <img src={frontImage} alt="Front preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => setFrontImage('')}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => frontInputRef.current?.click()}
                  className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 hover:border-slate-500 hover:text-slate-300 transition-all"
                >
                  <ImageIcon size={24} />
                  <span className="text-[10px] font-bold mt-2">UPLOAD</span>
                </button>
              )}
              <input 
                type="file" 
                ref={frontInputRef} 
                onChange={(e) => handleImageUpload(e, 'front')} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>
        </div>

        {/* Back Section */}
        <div className="space-y-4 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-sm">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Back Content (Long Answer)</label>
            {showPreview ? renderPreview(back) : (
              <textarea
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="Enter raw Markdown or LaTeX here..."
                className="w-full min-h-[150px] p-4 bg-slate-900 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all resize-y font-mono text-sm text-white placeholder-slate-500"
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Short Answer (Optional)</label>
            {showPreview ? renderPreview(backShort) : (
              <textarea
                value={backShort}
                onChange={(e) => setBackShort(e.target.value)}
                placeholder="Enter a short version of the answer..."
                className="w-full min-h-[80px] p-4 bg-slate-900 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all resize-y font-mono text-sm text-white placeholder-slate-500"
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Back Image (Optional)</label>
            <div className="flex items-center gap-4">
              {backImage ? (
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-slate-700 group">
                  <img src={backImage} alt="Back preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => setBackImage('')}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => backInputRef.current?.click()}
                  className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 hover:border-slate-500 hover:text-slate-300 transition-all"
                >
                  <ImageIcon size={24} />
                  <span className="text-[10px] font-bold mt-2">UPLOAD</span>
                </button>
              )}
              <input 
                type="file" 
                ref={backInputRef} 
                onChange={(e) => handleImageUpload(e, 'back')} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-sm">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Translations (Optional)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <textarea
                value={frontTranslation}
                onChange={(e) => setFrontTranslation(e.target.value)}
                placeholder="Front translation..."
                className="w-full min-h-[80px] p-4 bg-slate-900 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all resize-none font-medium text-sm text-white placeholder-slate-500"
              />
              <textarea
                value={backTranslation}
                onChange={(e) => setBackTranslation(e.target.value)}
                placeholder="Back translation..."
                className="w-full min-h-[80px] p-4 bg-slate-900 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all resize-none font-medium text-sm text-white placeholder-slate-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
            <span className="flex items-center gap-2"><TagIcon size={14} /> Tags (comma separated)</span>
            <span className="text-[10px] font-medium text-slate-500">{currentTags.length} tags detected</span>
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. biology, exam-prep, chapter-1"
            className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all font-medium shadow-sm text-white placeholder-slate-500"
          />
          {currentTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {currentTags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-slate-700 text-slate-300 text-[10px] font-bold rounded-md uppercase tracking-wider border border-slate-600">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={handleTranslate}
            disabled={isTranslating || (!front && !back)}
            className="flex-1 md:flex-none bg-slate-700 text-white px-6 py-4 rounded-2xl font-bold hover:bg-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTranslating ? <Loader2 size={20} className="animate-spin" /> : <Languages size={20} />}
            Auto-Translate
          </button>
          <button
            type="button"
            onClick={handleSummarize}
            disabled={isSummarizing || !back}
            className="flex-1 md:flex-none bg-slate-700 text-white px-6 py-4 rounded-2xl font-bold hover:bg-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSummarizing ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
            Auto-Summarize
          </button>
          
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`flex-1 md:flex-none px-6 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border ${showPreview ? 'bg-violet-600/20 text-violet-400 border-violet-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
          >
            <Eye size={20} />
            {showPreview ? 'Edit Raw' : 'Preview'}
          </button>

          <button
            type="submit"
            className="flex-1 bg-violet-600 text-white py-4 rounded-2xl font-bold hover:bg-violet-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 active:scale-[0.98]"
          >
            <Save size={20} />
            {card ? 'Update Card' : 'Save Card'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-8 py-4 bg-slate-800 border border-slate-700 text-slate-300 rounded-2xl font-bold hover:bg-slate-700 transition-all active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

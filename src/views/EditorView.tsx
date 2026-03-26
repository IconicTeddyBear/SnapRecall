import React, { useState, useRef } from 'react';
import { useT } from '../i18n/useT';
import { Card } from '../models/types';
import { X, Save, Tag as TagIcon, Image as ImageIcon, Trash2, Eye, Languages, Loader2, Wand2 } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import { translateCard, summarizeCard } from '../utils/aiTranslator';
import DOMPurify from 'dompurify';
import { MarkdownToolbar } from '../components/MarkdownToolbar';
import { supabase } from '../services/supabaseClient';
import { useSupabase } from '../contexts/SupabaseContext';

interface EditorViewProps {
  card?: Card;
  categories: string[];
  initialTags?: string[];
  initialCategory?: string;
  onSave: (card: Partial<Card>) => void;
  onCancel: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({ card, categories, initialTags, initialCategory, onSave, onCancel }) => {
  const t = useT();
  const { user } = useSupabase();
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
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // File input refs
  const frontFileRef = useRef<HTMLInputElement>(null);
  const backFileRef = useRef<HTMLInputElement>(null);

  // Textarea refs for the Markdown toolbar
  const frontTextareaRef = useRef<HTMLTextAreaElement>(null);
  const backTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If user is not logged in, fall back to base64
    if (!user) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (side === 'front') setFrontImage(base64);
        else setBackImage(base64);
      };
      reader.readAsDataURL(file);
      return;
    }

    setIsUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/${Date.now()}-${side}.${ext}`;

      const { error } = await supabase.storage.from('card-images').upload(path, file);
      if (error) throw error;

      const { data } = supabase.storage.from('card-images').getPublicUrl(path);
      if (side === 'front') setFrontImage(data.publicUrl);
      else setBackImage(data.publicUrl);
    } catch (error) {
      alert(`Image upload failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploadingImage(false);
      // Reset the file input
      if (side === 'front' && frontFileRef.current) frontFileRef.current.value = '';
      if (side === 'back' && backFileRef.current) backFileRef.current.value = '';
    }
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
        <Markdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
          {text || '*Empty*'}
        </Markdown>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">{card ? t.editor.editTitle : t.editor.createTitle}</h2>
          <p className="text-slate-400 text-sm">{t.editor.subtitle}</p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-slate-800 rounded-full transition-colors"
          title={t.editor.closeEditor}
        >
          <X size={24} className="text-slate-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Category */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.editor.category}</label>
          <div className="relative">
            <input
              type="text"
              list="categories-list"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t.editor.categoryPlaceholder}
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
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.editor.frontContent}</label>
            {showPreview ? renderPreview(front) : (
              <>
                <MarkdownToolbar textareaRef={frontTextareaRef} value={front} onChange={setFront} />
                <textarea
                  ref={frontTextareaRef}
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  placeholder="Enter Markdown, LaTeX, or plain text..."
                  className="w-full min-h-[150px] p-4 bg-slate-900 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all resize-y font-mono text-sm text-white placeholder-slate-500"
                />
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.editor.frontImage}</label>
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
                  onClick={() => frontFileRef.current?.click()}
                  disabled={isUploadingImage}
                  className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 hover:border-slate-500 hover:text-slate-300 transition-all disabled:opacity-50"
                >
                  {isUploadingImage ? <Loader2 size={24} className="animate-spin" /> : <ImageIcon size={24} />}
                  <span className="text-[10px] font-bold mt-2">{isUploadingImage ? 'Uploading...' : t.editor.upload}</span>
                </button>
              )}
              <input type="file" ref={frontFileRef} onChange={(e) => handleImageUpload(e, 'front')} accept="image/*" className="hidden" />
            </div>
          </div>
        </div>

        {/* Back Section */}
        <div className="space-y-4 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-sm">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.editor.backContent}</label>
            {showPreview ? renderPreview(back) : (
              <>
                <MarkdownToolbar textareaRef={backTextareaRef} value={back} onChange={setBack} />
                <textarea
                  ref={backTextareaRef}
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  placeholder="Enter Markdown, LaTeX, or plain text..."
                  className="w-full min-h-[150px] p-4 bg-slate-900 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all resize-y font-mono text-sm text-white placeholder-slate-500"
                />
              </>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.editor.backShort}</label>
            {showPreview ? renderPreview(backShort) : (
              <textarea
                value={backShort}
                onChange={(e) => setBackShort(e.target.value)}
                placeholder={t.editor.backShortPlaceholder}
                className="w-full min-h-[80px] p-4 bg-slate-900 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all resize-y font-mono text-sm text-white placeholder-slate-500"
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.editor.backImage}</label>
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
                  onClick={() => backFileRef.current?.click()}
                  disabled={isUploadingImage}
                  className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 hover:border-slate-500 hover:text-slate-300 transition-all disabled:opacity-50"
                >
                  {isUploadingImage ? <Loader2 size={24} className="animate-spin" /> : <ImageIcon size={24} />}
                  <span className="text-[10px] font-bold mt-2">{isUploadingImage ? 'Uploading...' : t.editor.upload}</span>
                </button>
              )}
              <input type="file" ref={backFileRef} onChange={(e) => handleImageUpload(e, 'back')} accept="image/*" className="hidden" />
            </div>
          </div>
        </div>

        {/* Translations */}
        <div className="space-y-4 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-sm">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.editor.translations}</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <textarea
                value={frontTranslation}
                onChange={(e) => setFrontTranslation(e.target.value)}
                placeholder={t.editor.frontTranslationPlaceholder}
                className="w-full min-h-[80px] p-4 bg-slate-900 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all resize-none font-medium text-sm text-white placeholder-slate-500"
              />
              <textarea
                value={backTranslation}
                onChange={(e) => setBackTranslation(e.target.value)}
                placeholder={t.editor.backTranslationPlaceholder}
                className="w-full min-h-[80px] p-4 bg-slate-900 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all resize-none font-medium text-sm text-white placeholder-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
            <span className="flex items-center gap-2"><TagIcon size={14} /> {t.editor.tags}</span>
            <span className="text-[10px] font-medium text-slate-500">{currentTags.length} {t.editor.tagsDetected}</span>
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder={t.editor.tagsPlaceholder}
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

        {/* Actions */}
        <div className="pt-4 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={handleTranslate}
            disabled={isTranslating || (!front && !back)}
            className="flex-1 md:flex-none bg-slate-700 text-white px-6 py-4 rounded-2xl font-bold hover:bg-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTranslating ? <Loader2 size={20} className="animate-spin" /> : <Languages size={20} />}
            {t.editor.autoTranslate}
          </button>
          <button
            type="button"
            onClick={handleSummarize}
            disabled={isSummarizing || !back}
            className="flex-1 md:flex-none bg-slate-700 text-white px-6 py-4 rounded-2xl font-bold hover:bg-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSummarizing ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
            {t.editor.autoSummarize}
          </button>

          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`flex-1 md:flex-none px-6 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border ${showPreview ? 'bg-violet-600/20 text-violet-400 border-violet-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
          >
            <Eye size={20} />
            {showPreview ? t.editor.editRaw : t.editor.preview}
          </button>

          <button
            type="submit"
            className="flex-1 bg-violet-600 text-white py-4 rounded-2xl font-bold hover:bg-violet-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 active:scale-[0.98]"
          >
            <Save size={20} />
            {card ? t.editor.updateCard : t.editor.saveCard}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-8 py-4 bg-slate-800 border border-slate-700 text-slate-300 rounded-2xl font-bold hover:bg-slate-700 transition-all active:scale-[0.98]"
          >
            {t.editor.cancel}
          </button>
        </div>
      </form>
    </div>
  );
};

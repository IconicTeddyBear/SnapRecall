import React, { useState, useRef } from 'react';
import { Card } from '../models/types';
import { X, Save, Tag as TagIcon, Image as ImageIcon, Trash2 } from 'lucide-react';

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
  const [category, setCategory] = useState(card?.category || initialCategory || '');
  const [frontImage, setFrontImage] = useState(card?.frontImage || '');
  const [backImage, setBackImage] = useState(card?.backImage || '');
  const [tagsInput, setTagsInput] = useState(card?.tags.join(', ') || initialTags?.join(', ') || '');

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
      category: category.trim() || undefined,
      frontImage,
      backImage,
      tags,
    });
  };

  const currentTags = Array.from(new Set(
    tagsInput.split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t !== '')
  ));

  return (
    <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">{card ? 'Edit Card' : 'Create New Card'}</h2>
          <p className="text-zinc-500 text-sm">Fill in the details for your flashcard.</p>
        </div>
        <button 
          onClick={onCancel} 
          className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          title="Close editor"
        >
          <X size={24} className="text-zinc-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Category Section */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Category</label>
          <div className="relative">
            <input
              type="text"
              list="categories-list"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Allgemeinbildung, NIN, Science..."
              className="w-full p-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all font-medium shadow-sm"
            />
            <datalist id="categories-list">
              {categories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Front Section */}
        <div className="space-y-4 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Front Content</label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Enter question or prompt..."
              className="w-full min-h-[100px] p-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all resize-none font-medium text-lg"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Front Image (Optional)</label>
            <div className="flex items-center gap-4">
              {frontImage ? (
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-zinc-200 group">
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
                  className="w-32 h-32 rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 transition-all"
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
        <div className="space-y-4 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Back Content</label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Enter answer or explanation..."
              className="w-full min-h-[100px] p-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all resize-none font-medium text-lg"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Back Image (Optional)</label>
            <div className="flex items-center gap-4">
              {backImage ? (
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-zinc-200 group">
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
                  className="w-32 h-32 rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 transition-all"
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

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-between">
            <span className="flex items-center gap-2"><TagIcon size={14} /> Tags (comma separated)</span>
            <span className="text-[10px] font-medium text-zinc-400">{currentTags.length} tags detected</span>
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. biology, exam-prep, chapter-1"
            className="w-full p-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all font-medium shadow-sm"
          />
          {currentTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {currentTags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-md uppercase tracking-wider">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 flex gap-4">
          <button
            type="submit"
            className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-200 active:scale-[0.98]"
          >
            <Save size={20} />
            {card ? 'Update Card' : 'Save Card'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-8 py-4 bg-white border border-zinc-200 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-50 transition-all active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

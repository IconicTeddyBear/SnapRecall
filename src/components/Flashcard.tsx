import React from 'react';
import { motion } from 'motion/react';
import { Smile, Meh, Frown, RefreshCcw, Sparkles } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import DOMPurify from 'dompurify';

interface FlashcardProps {
  front: string;
  back: string;
  frontImage?: string;
  backImage?: string;
  frontTranslation?: string;
  backTranslation?: string;
  showTranslation?: boolean;
  isFlipped: boolean;
  onFlip: () => void;
  onGrade?: (quality: number) => void; // 1=Again, 2=Hard, 3=Neutral, 4=Good, 5=Easy
}

export const Flashcard: React.FC<FlashcardProps> = ({ 
  front, 
  back, 
  frontImage, 
  backImage, 
  frontTranslation,
  backTranslation,
  showTranslation,
  isFlipped, 
  onFlip, 
  onGrade 
}) => {
  const getFontSize = (text: string) => {
    // Strip HTML tags for length calculation
    const cleanText = text.replace(/<[^>]*>/g, '');
    if (cleanText.length > 300) return 'text-sm';
    if (cleanText.length > 150) return 'text-base';
    if (cleanText.length > 80) return 'text-lg';
    return 'text-xl md:text-2xl';
  };

  const isHtml = (text: string) => {
    const trimmed = text.trim();
    return trimmed.startsWith('<') && trimmed.endsWith('>');
  };

  const renderContent = (text: string) => {
    const fontSize = getFontSize(text);
    
    if (isHtml(text)) {
      const sanitizedHtml = DOMPurify.sanitize(text);
      return (
        <div 
          className={`markdown-body ${fontSize} font-medium text-white leading-relaxed text-center inline-block w-full max-w-full prose prose-invert prose-p:text-center prose-headings:text-center prose-ul:text-center prose-ol:text-center prose-p:my-2 prose-headings:my-3 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800`}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      );
    }

    return (
      <div className={`markdown-body ${fontSize} font-medium text-white leading-relaxed text-center inline-block w-full max-w-full prose prose-invert prose-p:text-center prose-headings:text-center prose-ul:text-center prose-ol:text-center prose-p:my-2 prose-headings:my-3 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800`}>
        <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {text}
        </Markdown>
      </div>
    );
  };

  const displayFront = showTranslation && frontTranslation ? frontTranslation : front;
  const displayBack = showTranslation && backTranslation ? backTranslation : back;

  return (
    <div 
      className="w-full max-w-2xl aspect-[3/2] perspective-1000 cursor-pointer group"
      onClick={onFlip}
    >
      <motion.div
        className="relative w-full h-full transition-all duration-300 preserve-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
      >
        {/* Front Side */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-slate-800 rounded-3xl border-2 border-slate-700 shadow-xl flex flex-col overflow-hidden">
          <div className="flex-none pt-6 pb-2 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              {showTranslation && frontTranslation ? 'Question (Translated)' : 'Question'}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto px-8 py-2 text-center scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <div className="flex flex-col items-center justify-center min-h-full gap-6">
              {frontImage && (
                <div className="w-full max-h-[40%] flex justify-center flex-none">
                  <img src={frontImage} alt="Front" className="max-w-full max-h-full object-contain rounded-xl shadow-sm border border-slate-700" />
                </div>
              )}

              {renderContent(displayFront)}
            </div>
          </div>

          <div className="flex-none pb-6 pt-4 text-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">Click to reveal</p>
          </div>
        </div>

        {/* Back Side */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-slate-900 rounded-3xl border-2 border-slate-800 shadow-xl flex flex-col overflow-hidden rotate-y-180">
          <div className="flex-none pt-6 pb-2 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              {showTranslation && backTranslation ? 'Answer (Translated)' : 'Answer'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-2 text-center scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent relative">
            <div className="flex flex-col items-center justify-center min-h-full gap-6 pb-24">
              {backImage && (
                <div className="w-full max-h-[40%] flex justify-center flex-none">
                  <img src={backImage} alt="Back" className="max-w-full max-h-full object-contain rounded-xl shadow-sm border border-slate-800" />
                </div>
              )}

              {renderContent(displayBack)}
            </div>
          </div>

          {/* Grading Buttons - Fixed at bottom with solid background */}
          {onGrade && (
            <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-4 z-10">
              <div className="flex justify-center gap-1 sm:gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onGrade(1); }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-800 transition-colors group/btn min-w-[50px] sm:min-w-[60px]"
                >
                  <div className="p-2 bg-rose-500/10 text-rose-500 rounded-full group-hover/btn:bg-rose-500 group-hover/btn:text-white transition-colors border border-rose-500/20">
                    <RefreshCcw size={18} />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 group-hover/btn:text-slate-300 uppercase tracking-wider">Again</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onGrade(2); }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-800 transition-colors group/btn min-w-[50px] sm:min-w-[60px]"
                >
                  <div className="p-2 bg-orange-500/10 text-orange-500 rounded-full group-hover/btn:bg-orange-500 group-hover/btn:text-white transition-colors border border-orange-500/20">
                    <Frown size={18} />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 group-hover/btn:text-slate-300 uppercase tracking-wider">Hard</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onGrade(3); }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-800 transition-colors group/btn min-w-[50px] sm:min-w-[60px]"
                >
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-full group-hover/btn:bg-amber-500 group-hover/btn:text-white transition-colors border border-amber-500/20">
                    <Meh size={18} />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 group-hover/btn:text-slate-300 uppercase tracking-wider">Neutral</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onGrade(4); }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-800 transition-colors group/btn min-w-[50px] sm:min-w-[60px]"
                >
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-full group-hover/btn:bg-blue-500 group-hover/btn:text-white transition-colors border border-blue-500/20">
                    <Smile size={18} />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 group-hover/btn:text-slate-300 uppercase tracking-wider">Good</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onGrade(5); }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-800 transition-colors group/btn min-w-[50px] sm:min-w-[60px]"
                >
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-full group-hover/btn:bg-emerald-500 group-hover/btn:text-white transition-colors border border-emerald-500/20">
                    <Sparkles size={18} />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 group-hover/btn:text-slate-300 uppercase tracking-wider">Easy</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

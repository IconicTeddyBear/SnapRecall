import React from 'react';
import { motion } from 'motion/react';
import { Smile, Meh, Frown } from 'lucide-react';

interface FlashcardProps {
  front: string;
  back: string;
  frontImage?: string;
  backImage?: string;
  isFlipped: boolean;
  onFlip: () => void;
  onGrade?: (quality: number) => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({ front, back, frontImage, backImage, isFlipped, onFlip, onGrade }) => {
  const getFontSize = (text: string) => {
    if (text.length > 300) return 'text-sm';
    if (text.length > 150) return 'text-base';
    if (text.length > 80) return 'text-lg';
    return 'text-xl md:text-2xl';
  };

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
        <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-3xl border-2 border-zinc-200 shadow-xl flex flex-col overflow-hidden">
          <div className="flex-none pt-6 pb-2 text-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Question</span>
          </div>
          
          <div className="flex-1 overflow-y-auto px-8 py-2 text-center scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
            <div className="flex flex-col items-center justify-center min-h-full gap-6">
              {frontImage && (
                <div className="w-full max-h-[40%] flex justify-center flex-none">
                  <img src={frontImage} alt="Front" className="max-w-full max-h-full object-contain rounded-xl shadow-sm" />
                </div>
              )}

              <p className={`${getFontSize(front)} font-bold text-zinc-900 leading-tight whitespace-pre-wrap`}>
                {front}
              </p>
            </div>
          </div>

          <div className="flex-none pb-6 pt-4 text-center">
            <p className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest animate-pulse">Click to reveal</p>
          </div>
        </div>

        {/* Back Side */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-zinc-900 rounded-3xl border-2 border-zinc-800 shadow-xl flex flex-col overflow-hidden rotate-y-180">
          <div className="flex-none pt-6 pb-2 text-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Answer</span>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-2 text-center scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent relative">
             {/* Scroll Indicator Hint (only visible if content overflows, but hard to detect in pure CSS without JS. 
                 Instead, we use a shadow gradient at the bottom if we can, or just rely on the scrollbar) */}
            <div className="flex flex-col items-center justify-center min-h-full gap-6 pb-20">
              {backImage && (
                <div className="w-full max-h-[40%] flex justify-center flex-none">
                  <img src={backImage} alt="Back" className="max-w-full max-h-full object-contain rounded-xl shadow-sm border border-zinc-800" />
                </div>
              )}

              <p className={`${getFontSize(back)} font-bold text-white leading-tight whitespace-pre-wrap`}>
                {back}
              </p>
            </div>
          </div>

          {/* Grading Buttons - Fixed at bottom with solid background */}
          {onGrade && (
            <div className="absolute bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 p-4 z-10">
              <div className="flex justify-center gap-4">
                <button
                  onClick={(e) => { e.stopPropagation(); onGrade(1); }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-zinc-800 transition-colors group/btn min-w-[60px]"
                >
                  <div className="p-2 bg-rose-500/10 text-rose-500 rounded-full group-hover/btn:bg-rose-500 group-hover/btn:text-white transition-colors border border-rose-500/20">
                    <Frown size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 group-hover/btn:text-zinc-300 uppercase tracking-wider">Hard</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onGrade(3); }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-zinc-800 transition-colors group/btn min-w-[60px]"
                >
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-full group-hover/btn:bg-blue-500 group-hover/btn:text-white transition-colors border border-blue-500/20">
                    <Meh size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 group-hover/btn:text-zinc-300 uppercase tracking-wider">Good</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onGrade(5); }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-zinc-800 transition-colors group/btn min-w-[60px]"
                >
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-full group-hover/btn:bg-emerald-500 group-hover/btn:text-white transition-colors border border-emerald-500/20">
                    <Smile size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 group-hover/btn:text-zinc-300 uppercase tracking-wider">Easy</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

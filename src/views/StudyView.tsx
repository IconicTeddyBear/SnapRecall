import React, { useState, useEffect } from 'react';
import { useT } from '../i18n/useT';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { Card, UserSettings } from '../models/types';
import { Flashcard } from '../components/Flashcard';
import { X, ChevronLeft, ChevronRight, Trash2, AlertCircle, Undo2, Plus, Languages, Loader2, Pencil } from 'lucide-react';
import { translateCard } from '../utils/aiTranslator';

interface StudyViewProps {
  cards: Card[];
  settings: UserSettings;
  onGrade: (card: Card, quality: number) => void;
  onDelete: (cardId: string) => void;
  onUndo: () => boolean;
  onUpdateCard: (card: Card) => void;
  onFinish: () => void;
  onAddCard: () => void;
  onEditCard: (card: Card) => void;
}

export const StudyView: React.FC<StudyViewProps> = ({ cards, settings, onGrade, onDelete, onUndo, onUpdateCard, onFinish, onAddCard, onEditCard }) => {
  const t = useT();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const currentCard = cards[currentIndex];

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (showUndoToast) {
      timer = setTimeout(() => setShowUndoToast(false), 5000);
    }
    return () => clearTimeout(timer);
  }, [showUndoToast]);

  const handleGrade = (quality: number) => {
    onGrade(currentCard, quality);
    nextCard();
  };

  const handleDelete = () => {
    onDelete(currentCard.id);
    setShowDeleteConfirm(false);
    setShowUndoToast(true);
    
    if (cards.length <= 1) {
      onFinish();
    } else {
      if (currentIndex === cards.length - 1) {
        setCurrentIndex(prev => prev - 1);
      }
      setIsFlipped(false);
    }
  };

  const handleUndo = () => {
    if (onUndo()) {
      setShowUndoToast(false);
      // After undo, we might want to stay on the same index or move to the restored card.
      // Since the cards array will update via props, we just reset state.
      setIsFlipped(false);
    }
  };

  const nextCard = () => {
    if (currentIndex < cards.length - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      onFinish();
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    const velocityThreshold = 500;

    if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      prevCard();
    } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      nextCard();
    }
  };

  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center">
          <X size={40} />
        </div>
        <h2 className="text-2xl font-bold text-white">{t.study.noCards}</h2>
        <p className="text-slate-400 max-w-xs">{t.study.noCardsDesc}</p>
        <div className="flex gap-4">
          <button 
            onClick={onFinish}
            className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-700 transition-all border border-slate-700"
          >
            {t.study.backToDashboard}
          </button>
          <button 
            onClick={onAddCard}
            className="bg-violet-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-violet-500 transition-all flex items-center gap-2 shadow-lg shadow-violet-500/20"
          >
            <Plus size={18} /> {t.study.addCards}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col items-center gap-12 py-4">
      {/* Header Info */}
      <div className="w-full flex items-center justify-between px-4">
        <button 
          onClick={onFinish}
          className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
        >
          <X size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.study.sessionProgress}</span>
          <div className="flex items-center gap-3 mt-1">
            <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="bg-violet-500 h-full transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-300">{currentIndex + 1} / {cards.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowTranslation(!showTranslation)}
            disabled={isTranslating}
            className={`p-2 rounded-full transition-colors ${showTranslation ? 'bg-violet-600/20 text-violet-400' : 'hover:bg-slate-800 text-slate-400 hover:text-white'} ${isTranslating ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={t.study.toggleTranslation}
          >
            {isTranslating ? <Loader2 size={24} className="animate-spin" /> : <Languages size={24} />}
          </button>
          <button 
            onClick={onAddCard}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
            title={t.study.addCard}
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Card Area */}
      <div className="relative w-full flex items-center justify-center px-12">
        <button 
          onClick={prevCard}
          disabled={currentIndex === 0}
          className={`absolute left-0 p-3 rounded-full transition-all ${currentIndex === 0 ? 'opacity-0' : 'hover:bg-slate-800 text-slate-500 hover:text-white'}`}
        >
          <ChevronLeft size={32} />
        </button>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentCard.id}
            custom={direction}
            initial={{ x: direction > 0 ? 300 : -300, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: direction > 0 ? -300 : 300, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            whileDrag={{ 
              scale: 0.95,
              rotate: direction > 0 ? -2 : 2, // This is tricky because direction is set on exit
            }}
            style={{ x: 0 }} // Reset x to 0 for the motion value if needed, but framer handles it
            className="w-full flex flex-col items-center gap-6"
          >
            <Flashcard 
              front={currentCard.front} 
              back={currentCard.back} 
              backShort={currentCard.backShort}
              frontImage={currentCard.frontImage}
              backImage={currentCard.backImage}
              frontTranslation={currentCard.frontTranslation}
              backTranslation={currentCard.backTranslation}
              showTranslation={showTranslation}
              answerDisplayMode={settings.answerDisplayMode}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped(!isFlipped)}
              onGrade={isFlipped ? handleGrade : undefined}
            />
            
            <div className="flex items-center gap-6">
              <button
                onClick={() => onEditCard(currentCard)}
                className="flex items-center gap-2 text-slate-500 hover:text-violet-400 transition-colors text-xs font-bold uppercase tracking-widest group"
              >
                <Pencil size={14} className="group-hover:scale-110 transition-transform" />
                {t.study.editCard}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-slate-500 hover:text-rose-500 transition-colors text-xs font-bold uppercase tracking-widest group"
              >
                <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                {t.study.deleteCard}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        <button 
          onClick={nextCard}
          disabled={currentIndex === cards.length - 1}
          className={`absolute right-0 p-3 rounded-full transition-all ${currentIndex === cards.length - 1 ? 'opacity-0' : 'hover:bg-slate-800 text-slate-500 hover:text-white'}`}
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-6 border border-slate-800"
            >
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{t.study.deleteConfirmTitle}</h3>
                <p className="text-slate-400 mt-2">{t.study.deleteConfirmDesc}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleDelete}
                  className="flex-1 bg-rose-500 text-white py-3 rounded-2xl font-bold hover:bg-rose-600 transition-all active:scale-95"
                >
                  {t.study.delete}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-2xl font-bold hover:bg-slate-700 transition-all active:scale-95"
                >
                  {t.study.cancel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="h-24 flex items-center justify-center w-full relative">
        {/* Undo Toast */}
        <AnimatePresence>
          {showUndoToast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-0 bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-4 z-50 border border-slate-700"
            >
              <span className="text-sm font-medium">{t.study.cardDeleted}</span>
              <button 
                onClick={handleUndo}
                className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold text-sm transition-colors"
              >
                <Undo2 size={16} />
                {t.study.undo}
              </button>
              <button 
                onClick={() => setShowUndoToast(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

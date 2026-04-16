import React, { useState, useRef } from 'react';
import { X, Wand2, RotateCcw, Sparkles, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { editImage } from '../services/gemini';

interface MagicEditModalProps {
  imageUrl: string;
  year: number;
  onApply: (newImageUrl: string) => void;
  onClose: () => void;
}

const PRESET_CATEGORIES = [
  {
    label: 'Atmosphere',
    color: '#6366f1',
    presets: [
      'Make it look foggy and mysterious',
      'Add dramatic storm clouds',
      'Make it golden hour sunset',
      'Add heavy rain and puddles',
      'Make it a bright sunny day',
    ]
  },
  {
    label: 'Era & Style',
    color: '#f59e0b',
    presets: [
      'Apply sepia vintage film grain',
      'Make it look like a 1970s photograph',
      'Add vignette and film scratches',
      'Make it black and white',
      'Apply cyberpunk neon lighting',
    ]
  },
  {
    label: 'Environment',
    color: '#10b981',
    presets: [
      'Overgrow with vines and moss',
      'Add heavy snow and frost',
      'Make it appear war-damaged',
      'Add flood water on the ground',
      'Make everything bloom with flowers',
    ]
  },
  {
    label: 'Details',
    color: '#ec4899',
    presets: [
      'Remove all cars and vehicles',
      'Add vintage street signs',
      'Make the buildings crumbling and decayed',
      'Add graffiti and street art',
      'Make it look pristine and newly built',
    ]
  },
];

export function MagicEditModal({ imageUrl, year, onApply, onClose }: MagicEditModalProps) {
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editHistory, setEditHistory] = useState<Array<{ url: string; prompt: string }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeCategory, setActiveCategory] = useState(0);
  const [showSplitView, setShowSplitView] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentPreviewUrl = previewUrl || imageUrl;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < editHistory.length - 1;

  const handleApplyEdit = async (prompt: string) => {
    const promptToUse = prompt || editPrompt;
    if (!promptToUse.trim()) return;
    setIsEditing(true);
    setError('');
    try {
      const sourceImage = editHistory[historyIndex]?.url || imageUrl;
      const newUrl = await editImage(sourceImage, promptToUse);
      const newHistory = editHistory.slice(0, historyIndex + 1).concat({ url: newUrl, prompt: promptToUse });
      setEditHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setPreviewUrl(newUrl);
      setEditPrompt('');
      setShowSplitView(true);
    } catch (e: any) {
      setError(e.message || 'Edit failed. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleUndo = () => {
    if (canUndo) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPreviewUrl(newIndex === -1 ? null : editHistory[newIndex - 1]?.url || imageUrl);
    } else {
      setPreviewUrl(null);
      setHistoryIndex(-1);
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPreviewUrl(editHistory[newIndex].url);
    }
  };

  const handleConfirm = () => {
    const finalUrl = editHistory[historyIndex]?.url;
    if (finalUrl) {
      onApply(finalUrl);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(6px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .shimmer-btn {
            background: linear-gradient(90deg, #d97706, #f59e0b, #fbbf24, #f59e0b, #d97706);
            background-size: 200% auto;
            animation: shimmer 2s linear infinite;
          }
          .glass-panel {
            background: rgba(12, 12, 15, 0.85);
            backdrop-filter: blur(24px);
            border: 1px solid rgba(255,255,255,0.07);
          }
          .category-pill {
            transition: all 0.2s ease;
          }
        `}</style>

        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="glass-panel rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: isEditing ? 360 : 0 }}
                transition={{ duration: 2, repeat: isEditing ? Infinity : 0, ease: 'linear' }}
                className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20"
              >
                <Wand2 size={18} className="text-amber-400" />
              </motion.div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Magic Edit <span className="text-xs font-normal px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">AI-Powered</span>
                </h2>
                <p className="text-xs text-zinc-500">Scene {year} — Apply intelligent edits with Gemini</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {editHistory.length > 0 && (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                  <Clock size={12} className="text-amber-500" />
                  {editHistory.length} edit{editHistory.length !== 1 ? 's' : ''}
                </div>
              )}
              <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left — Image Preview */}
            <div className="flex-1 flex flex-col bg-zinc-950/60 relative overflow-hidden">
              {/* Split view controls */}
              {previewUrl && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-full overflow-hidden"
                  style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    onClick={() => setShowSplitView(false)}
                    className={`px-4 py-1.5 text-xs font-semibold transition-all ${!showSplitView ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}
                  >
                    Edited
                  </button>
                  <button
                    onClick={() => setShowSplitView(true)}
                    className={`px-4 py-1.5 text-xs font-semibold transition-all ${showSplitView ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}
                  >
                    Compare
                  </button>
                </div>
              )}

              {/* Image Display */}
              <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
                {showSplitView && previewUrl ? (
                  <div className="w-full h-full grid grid-cols-2 gap-3">
                    <div className="relative rounded-xl overflow-hidden border border-zinc-800">
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-zinc-900/90 text-xs text-zinc-400 border border-zinc-700">Before</div>
                      <img src={imageUrl} alt="Original" className="w-full h-full object-contain" />
                    </div>
                    <div className="relative rounded-xl overflow-hidden border border-amber-500/30">
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-amber-500/20 text-xs text-amber-400 border border-amber-500/30">After</div>
                      <motion.img
                        key={previewUrl}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        src={previewUrl} alt="Edited" className="w-full h-full object-contain" />
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <motion.img
                      key={currentPreviewUrl}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      src={currentPreviewUrl}
                      alt="Current"
                      className="max-w-full max-h-full object-contain rounded-xl"
                      style={{ boxShadow: '0 0 40px rgba(0,0,0,0.6)' }}
                    />
                    {isEditing && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex flex-col items-center justify-center rounded-xl"
                        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
                      >
                        <motion.div
                          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                          transition={{ rotate: { duration: 2, repeat: Infinity, ease: 'linear' }, scale: { duration: 1, repeat: Infinity } }}
                          className="text-5xl mb-4"
                        >
                          ✨
                        </motion.div>
                        <p className="text-white font-semibold text-sm">Gemini is editing your scene…</p>
                        <p className="text-zinc-400 text-xs mt-1">This may take a few seconds</p>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* History Undo/Redo */}
              {editHistory.length > 0 && (
                <div className="px-6 pb-4 flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-600 mr-1">History:</span>
                  <button onClick={handleUndo} disabled={historyIndex <= 0 && !previewUrl} className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 transition-all">
                    <ChevronLeft size={14} />
                  </button>
                  <div className="flex gap-1.5 flex-1 overflow-hidden">
                    {editHistory.slice(Math.max(0, historyIndex - 1), historyIndex + 2).map((h, i) => (
                      <div key={i} className="text-xs px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-500 truncate max-w-[120px]">
                        {h.prompt.substring(0, 20)}…
                      </div>
                    ))}
                  </div>
                  <button onClick={handleRedo} disabled={!canRedo} className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 transition-all">
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => { setPreviewUrl(null); setEditHistory([]); setHistoryIndex(-1); setShowSplitView(false); }}
                    className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 transition-all"
                    title="Reset all edits"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Right Panel — Presets + Input */}
            <div className="w-80 border-l border-white/5 flex flex-col overflow-hidden">
              {/* Category Tabs */}
              <div className="px-4 pt-4 pb-0 shrink-0">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Quick Presets</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {PRESET_CATEGORIES.map((cat, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveCategory(i)}
                      className="category-pill px-2.5 py-1 rounded-full text-xs font-semibold border"
                      style={{
                        background: activeCategory === i ? cat.color + '22' : 'transparent',
                        borderColor: activeCategory === i ? cat.color + '55' : 'rgba(255,255,255,0.08)',
                        color: activeCategory === i ? cat.color : '#71717a',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset List */}
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategory}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-1.5"
                  >
                    {PRESET_CATEGORIES[activeCategory].presets.map((preset, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => {
                          setEditPrompt(preset);
                          handleApplyEdit(preset);
                        }}
                        disabled={isEditing}
                        className="w-full text-left px-3 py-2.5 rounded-lg border text-xs text-zinc-300 transition-all disabled:opacity-50 group"
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          borderColor: 'rgba(255,255,255,0.06)',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = PRESET_CATEGORIES[activeCategory].color + '18';
                          (e.currentTarget as HTMLElement).style.borderColor = PRESET_CATEGORIES[activeCategory].color + '44';
                          (e.currentTarget as HTMLElement).style.color = '#fff';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                          (e.currentTarget as HTMLElement).style.color = '';
                        }}
                      >
                        <Sparkles size={11} className="inline mr-2 text-zinc-600 group-hover:text-amber-400 transition-colors" />
                        {preset}
                      </motion.button>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Custom Prompt Input */}
              <div className="px-4 pb-4 pt-3 border-t border-white/5 shrink-0">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Custom Edit</p>
                <textarea
                  ref={textareaRef}
                  value={editPrompt}
                  onChange={e => setEditPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleApplyEdit(editPrompt); }
                  }}
                  placeholder="Describe your edit… (Enter to apply)"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border text-xs text-zinc-300 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-zinc-600 transition-all"
                  style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.08)' }}
                />

                {error && (
                  <p className="text-red-400 text-xs mt-1.5">{error}</p>
                )}

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleApplyEdit(editPrompt)}
                    disabled={isEditing || !editPrompt.trim()}
                    className="flex-1 py-2.5 shimmer-btn text-zinc-950 font-bold text-sm rounded-lg shadow-lg shadow-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                  >
                    {isEditing ? (
                      <><span className="animate-spin">✨</span> Applying…</>
                    ) : (
                      <><Wand2 size={14} /> Apply Edit</>
                    )}
                  </button>
                </div>

                {/* Confirm / Cancel */}
                {editHistory.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2 mt-2"
                  >
                    <button
                      onClick={onClose}
                      className="flex-1 py-2 rounded-lg border border-zinc-800 text-zinc-400 text-xs hover:text-white transition-colors"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-lg shadow-emerald-500/20"
                    >
                      ✓ Confirm Edit
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

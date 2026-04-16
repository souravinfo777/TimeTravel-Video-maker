import React, { useState } from 'react';
import { Scene } from '../types';
import { generateImage, analyzeImage } from '../services/gemini';
import {
  Image as ImageIcon,
  Download,
  Wand2,
  Search,
  GripVertical,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MagicEditModal } from './MagicEditModal';

interface SceneCardProps {
  key?: React.Key;
  scene: Scene;
  index: number;
  total: number;
  aspectRatio: string;
  imageSize: string;
  onUpdate: (updates: Partial<Scene>) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function SceneCard({ scene, index, total, aspectRatio, imageSize, onUpdate, dragHandleProps }: SceneCardProps) {
  const [showMagicEdit, setShowMagicEdit] = useState(false);
  const [showNarrative, setShowNarrative] = useState(false);

  const handleGenerateImage = async () => {
    onUpdate({ isGeneratingImage: true, imageError: undefined });
    try {
      const imageUrl = await generateImage(scene.prompt, aspectRatio, imageSize);
      onUpdate({ imageUrl, isGeneratingImage: false });
    } catch (error: any) {
      onUpdate({ imageError: error.message, isGeneratingImage: false });
    }
  };

  const handleAnalyzeImage = async () => {
    if (!scene.imageUrl) return;
    onUpdate({ isAnalyzing: true });
    try {
      const analysis = await analyzeImage(scene.imageUrl);
      onUpdate({ analysis, isAnalyzing: false });
    } catch (error: any) {
      onUpdate({ analysis: `Error: ${error.message}`, isAnalyzing: false });
    }
  };

  const handleDownload = () => {
    if (!scene.imageUrl) return;
    const a = document.createElement('a');
    a.href = scene.imageUrl;
    a.download = `scene-${scene.year}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const progressPct = total > 1 ? (index / (total - 1)) * 100 : 0;

  return (
    <>
      <motion.div
        layout
        className="scene-card group relative bg-zinc-900/80 rounded-xl sm:rounded-2xl shadow-2xl border border-zinc-800/80 overflow-hidden flex flex-col md:flex-row transition-all duration-300 hover:border-amber-500/25 hover:shadow-amber-500/5"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
      >
        {/* Drag Handle — mobile top bar + desktop left gutter */}
        <div
          {...dragHandleProps}
          className="flex md:flex-col items-center justify-center md:w-8 h-6 md:h-auto shrink-0 bg-zinc-950/30 border-b md:border-b-0 md:border-r border-zinc-800/50 cursor-grab active:cursor-grabbing group-hover:bg-zinc-800/30 transition-colors"
        >
          <GripVertical size={16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors rotate-90 md:rotate-0" />
        </div>

        {/* Left — Prompt Panel */}
        <div className="p-3 sm:p-5 md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-zinc-800/60">
          {/* Year badge + meta */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="bg-zinc-800 text-amber-400 font-mono font-black px-3 py-1.5 rounded-lg text-lg border border-zinc-700/80 tracking-tight shadow-inner">
                {scene.year}
              </div>
              {/* Progress tick */}
              <div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-amber-500/40 rounded-full"
                style={{ opacity: progressPct > 0 && progressPct < 100 ? 1 : 0 }}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Scene {index + 1} <span className="text-zinc-700">/ {total}</span>
              </div>
              <div className="h-1 w-24 rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>

          {/* Prompt textarea */}
          <div className="flex-1 mb-3">
            <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">
              Image Prompt
            </label>
            <textarea
              value={scene.prompt}
              onChange={e => onUpdate({ prompt: e.target.value })}
              className="w-full h-36 p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500/60 focus:border-amber-500/40 resize-none transition-all placeholder-zinc-700"
            />
          </div>

          {/* Narrative note toggle */}
          <button
            onClick={() => setShowNarrative(v => !v)}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 mb-2 transition-colors w-fit"
          >
            <FileText size={12} />
            {showNarrative ? 'Hide' : 'Add'} narrative note
            {showNarrative ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {scene.narrativeNote && !showNarrative && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded-full text-[10px] border border-amber-500/20">
                {scene.narrativeNote.length > 30 ? scene.narrativeNote.slice(0, 30) + '…' : scene.narrativeNote}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNarrative && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-3"
              >
                <textarea
                  value={scene.narrativeNote || ''}
                  onChange={e => onUpdate({ narrativeNote: e.target.value })}
                  placeholder="Add a story note for this scene (e.g. 'The old oak tree still standing after 30 years…')"
                  rows={2}
                  className="w-full p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none transition-all placeholder-zinc-700"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generate Image Button */}
          <button
            onClick={handleGenerateImage}
            disabled={scene.isGeneratingImage}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl shadow-sm disabled:opacity-50 transition-all flex justify-center items-center gap-2 border border-zinc-700/60 hover:border-zinc-600 group/btn"
          >
            {scene.isGeneratingImage ? (
              <>
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="text-amber-500">⏳</motion.span>
                <span className="text-sm">Generating…</span>
              </>
            ) : (
              <>
                <ImageIcon size={16} className="text-amber-500 group-hover/btn:scale-110 transition-transform" />
                <span className="text-sm">Generate Image</span>
              </>
            )}
          </button>

          {scene.imageError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-xs mt-2 px-1"
            >
              ⚠ {scene.imageError}
            </motion.p>
          )}
        </div>

        {/* Right — Image Panel */}
        <div className="md:w-1/2 bg-zinc-950/40 p-3 sm:p-5 flex flex-col items-center justify-center relative min-h-[200px] sm:min-h-[300px]">
          {scene.imageUrl ? (
            <div className="w-full h-full flex flex-col gap-3">
              {/* Image container */}
              <div className="relative flex-1 flex items-center justify-center bg-zinc-900/60 rounded-xl overflow-hidden border border-zinc-800/50 min-h-[220px]">
                <motion.img
                  key={scene.imageUrl}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45 }}
                  src={scene.imageUrl}
                  alt={`Scene from ${scene.year}`}
                  className="max-w-full max-h-[380px] object-contain"
                />

                {/* Magic Edit Button — floating top-right */}
                <motion.button
                  onClick={() => setShowMagicEdit(true)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-950 rounded-full shadow-lg shadow-amber-500/30 border border-amber-400/30 z-10 transition-all"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                  title="Open Magic Edit"
                >
                  <Wand2 size={12} className="animate-pulse" />
                  Magic Edit
                </motion.button>

                {/* Loading overlay */}
                <AnimatePresence>
                  {(scene.isEditing || scene.isGeneratingImage) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl"
                    >
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                        className="text-4xl"
                      >
                        ✨
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action row */}
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 rounded-lg text-xs hover:bg-zinc-700 hover:text-white shadow-sm transition-all group/dl"
                >
                  <Download size={13} className="group-hover/dl:-translate-y-0.5 transition-transform" />
                  Download
                </button>
                <button
                  onClick={handleAnalyzeImage}
                  disabled={scene.isAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 rounded-lg text-xs hover:bg-indigo-800/50 hover:border-indigo-500/40 hover:text-white shadow-sm disabled:opacity-50 transition-all"
                >
                  <Search size={13} />
                  {scene.isAnalyzing ? 'Analyzing…' : 'Analyze'}
                </button>
              </div>

              {/* Analysis panel */}
              <AnimatePresence>
                {scene.analysis && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3.5 bg-indigo-950/30 border border-indigo-800/30 rounded-xl text-xs text-zinc-300 max-h-36 overflow-y-auto">
                      <h4 className="font-bold text-indigo-300 mb-1.5 flex items-center gap-1.5">
                        <Search size={12} /> Scene Analysis
                      </h4>
                      <p className="whitespace-pre-wrap leading-relaxed text-zinc-400">{scene.analysis}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-zinc-700 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 flex items-center justify-center">
                <ImageIcon size={28} className="opacity-30" />
              </div>
              <p className="text-xs text-zinc-600">No image generated yet</p>
              <p className="text-[10px] text-zinc-700">Click "Generate Image" →</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Magic Edit Modal (portal-level) */}
      {showMagicEdit && scene.imageUrl && (
        <MagicEditModal
          imageUrl={scene.imageUrl}
          year={scene.year}
          onApply={(newUrl) => onUpdate({ imageUrl: newUrl })}
          onClose={() => setShowMagicEdit(false)}
        />
      )}
    </>
  );
}

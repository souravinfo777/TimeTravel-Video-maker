import React from 'react';
import { Scene } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, CheckCircle2, XCircle, Clock, RotateCcw, X, Zap } from 'lucide-react';

interface GenerationQueueProps {
  scenes: Scene[];
  isActive: boolean;
  onRetryFailed: () => void;
  onCancel: () => void;
}

export function GenerationQueue({ scenes, isActive, onRetryFailed, onCancel }: GenerationQueueProps) {
  if (!isActive && !scenes.some(s => s.generationStatus)) return null;

  const queued = scenes.filter(s => s.generationStatus === 'queued').length;
  const generating = scenes.filter(s => s.generationStatus === 'generating').length;
  const done = scenes.filter(s => s.generationStatus === 'done').length;
  const errored = scenes.filter(s => s.generationStatus === 'error').length;
  const total = scenes.filter(s => s.generationStatus).length;
  const progress = total > 0 ? Math.round(((done + errored) / total) * 100) : 0;
  const isComplete = queued === 0 && generating === 0 && total > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 w-80"
      >
        <div
          className="rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            background: 'rgba(12, 12, 15, 0.92)',
            backdropFilter: 'blur(20px)',
            borderColor: isComplete
              ? errored > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'
              : 'rgba(245, 158, 11, 0.2)',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${isComplete ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                {isComplete ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
                    <Loader2 size={14} className="text-amber-400" />
                  </motion.div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {isComplete ? 'Generation Complete' : 'Generating Images...'}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {done} done · {errored > 0 ? `${errored} failed · ` : ''}{queued + generating} remaining
                </p>
              </div>
            </div>
            {isComplete && (
              <button
                onClick={onCancel}
                className="p-1 rounded-md text-zinc-600 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono text-zinc-500">{progress}%</span>
              <span className="text-[10px] font-mono text-zinc-600">{done + errored}/{total}</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: errored > 0
                    ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                    : 'linear-gradient(90deg, #d97706, #f59e0b)',
                }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* Scene status list */}
          <div className="px-4 pb-2 max-h-48 overflow-y-auto">
            <div className="space-y-1">
              {scenes.filter(s => s.generationStatus).map((scene) => (
                <div
                  key={scene.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs"
                  style={{
                    background: scene.generationStatus === 'generating'
                      ? 'rgba(245, 158, 11, 0.06)'
                      : 'transparent',
                  }}
                >
                  {scene.generationStatus === 'queued' && (
                    <Clock size={12} className="text-zinc-600 shrink-0" />
                  )}
                  {scene.generationStatus === 'generating' && (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Loader2 size={12} className="text-amber-400 shrink-0" />
                    </motion.div>
                  )}
                  {scene.generationStatus === 'done' && (
                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                  )}
                  {scene.generationStatus === 'error' && (
                    <XCircle size={12} className="text-red-400 shrink-0" />
                  )}
                  <span className="font-mono font-bold text-zinc-400 w-10 shrink-0">{scene.year}</span>
                  <span className={`truncate flex-1 ${
                    scene.generationStatus === 'done' ? 'text-zinc-500' :
                    scene.generationStatus === 'generating' ? 'text-amber-300' :
                    scene.generationStatus === 'error' ? 'text-red-400' :
                    'text-zinc-600'
                  }`}>
                    {scene.generationStatus === 'queued' && 'Waiting...'}
                    {scene.generationStatus === 'generating' && 'Generating...'}
                    {scene.generationStatus === 'done' && 'Complete'}
                    {scene.generationStatus === 'error' && (scene.imageError || 'Failed')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 pb-3 pt-1 flex gap-2">
            {isComplete && errored > 0 && (
              <button
                onClick={onRetryFailed}
                className="flex-1 py-2 flex items-center justify-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-lg hover:bg-amber-500/20 transition-colors"
              >
                <RotateCcw size={12} /> Retry Failed ({errored})
              </button>
            )}
            {!isComplete && (
              <button
                onClick={onCancel}
                className="flex-1 py-2 flex items-center justify-center gap-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold rounded-lg hover:bg-zinc-700 transition-colors"
              >
                <X size={12} /> Cancel
              </button>
            )}
            {isComplete && errored === 0 && (
              <button
                onClick={onCancel}
                className="flex-1 py-2 flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-500/20 transition-colors"
              >
                <Zap size={12} /> All Done — Dismiss
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

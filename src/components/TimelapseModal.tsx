import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause } from 'lucide-react';
import { Scene } from '../types';

export function TimelapseModal({ scenes, onClose }: { scenes: Scene[], onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const validScenes = scenes.filter(s => s.imageUrl);

  useEffect(() => {
    if (!isPlaying || validScenes.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validScenes.length);
    }, 1500); // 1.5s per frame
    return () => clearInterval(interval);
  }, [isPlaying, validScenes.length]);

  if (validScenes.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-6">
      <button onClick={onClose} className="absolute top-6 right-6 text-zinc-400 hover:text-white transition-colors z-50 bg-zinc-900/50 p-2 rounded-full">
        <X size={32} />
      </button>

      <div className="relative w-full max-w-5xl aspect-video bg-zinc-950 rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={validScenes[currentIndex].imageUrl}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-contain"
          />
        </AnimatePresence>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-20">
          <div className="bg-black/60 backdrop-blur-md text-amber-400 px-6 py-2 rounded-full text-2xl font-bold tracking-widest border border-white/10 shadow-lg">
            {validScenes[currentIndex].year}
          </div>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-14 h-14 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          >
            {isPlaying ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current ml-1" />}
          </button>
        </div>
      </div>
    </div>
  );
}

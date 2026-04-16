import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Scene, TransitionType } from '../types';
import { motion } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Gauge, X, Maximize2, Minimize2 } from 'lucide-react';
import { loadImage, drawSceneFrame, drawTransition, drawYearOverlay } from '../services/videoUtils';

interface LivePreviewPlayerProps {
  scenes: Scene[];
  onClose: () => void;
  transition?: TransitionType;
  useKenBurns?: boolean;
  useVintageFilters?: boolean;
  duration?: number;
}

export function LivePreviewPlayer({
  scenes,
  onClose,
  transition = 'fade',
  useKenBurns = true,
  useVintageFilters = true,
  duration = 3,
}: LivePreviewPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());

  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameCounterRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  const speedRef = useRef(speed);

  const validScenes = scenes.filter(s => s.imageUrl);

  // Preload all images
  useEffect(() => {
    const preload = async () => {
      const imageMap = new Map<string, HTMLImageElement>();
      for (const scene of validScenes) {
        if (scene.imageUrl) {
          try {
            const img = await loadImage(scene.imageUrl);
            imageMap.set(scene.id, img);
          } catch {
            // Skip failed images
          }
        }
      }
      setLoadedImages(imageMap);
    };
    preload();
  }, [scenes]);

  // Set canvas size once images are loaded
  useEffect(() => {
    if (canvasRef.current && loadedImages.size > 0) {
      const firstImg = loadedImages.values().next().value;
      if (firstImg) {
        const canvas = canvasRef.current;
        // Scale down for performance in preview
        const maxWidth = isExpanded ? 960 : 480;
        const scale = Math.min(1, maxWidth / firstImg.width);
        canvas.width = firstImg.width * scale;
        canvas.height = firstImg.height * scale;
      }
    }
  }, [loadedImages, isExpanded]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const renderFrame = useCallback((timestamp: number) => {
    if (!isPlayingRef.current || !canvasRef.current || validScenes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const elapsed = (timestamp - lastTimeRef.current) * speedRef.current;
    lastTimeRef.current = timestamp;

    const fps = 30;
    const frameDuration = 1000 / fps;

    if (elapsed >= frameDuration) {
      frameCounterRef.current += 1;
      lastTimeRef.current = timestamp;

      const totalFramesPerScene = duration * fps;
      const transitionFrames = transition === 'cut' ? 0 : Math.min(fps, totalFramesPerScene / 2);
      const totalFrames = validScenes.length * totalFramesPerScene;

      const globalFrame = frameCounterRef.current % totalFrames;
      const sceneIndex = Math.min(Math.floor(globalFrame / totalFramesPerScene), validScenes.length - 1);
      const localFrame = globalFrame % totalFramesPerScene;

      setCurrentSceneIndex(sceneIndex);
      setProgress((globalFrame / totalFrames) * 100);

      const currentScene = validScenes[sceneIndex];
      const currentImg = loadedImages.get(currentScene.id);

      if (currentImg) {
        drawSceneFrame(ctx, currentImg, localFrame, totalFramesPerScene, {
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          useKenBurns,
          useVintageFilters,
          year: currentScene.year,
          sceneIndex,
        });

        // Transitions
        const nextScene = validScenes[sceneIndex + 1];
        if (nextScene && localFrame >= totalFramesPerScene - transitionFrames) {
          const nextImg = loadedImages.get(nextScene.id);
          if (nextImg) {
            const t = (localFrame - (totalFramesPerScene - transitionFrames)) / transitionFrames;
            drawTransition(ctx, currentImg, nextImg, t, transition, {
              canvasWidth: canvas.width,
              canvasHeight: canvas.height,
              useVintageFilters,
              useKenBurns,
              nextYear: nextScene.year,
              nextSceneIndex: sceneIndex + 1,
            });
          }
        }

        drawYearOverlay(ctx, currentScene.year, canvas.width, canvas.height);
      }
    }

    animFrameRef.current = requestAnimationFrame(renderFrame);
  }, [validScenes, loadedImages, duration, transition, useKenBurns, useVintageFilters]);

  useEffect(() => {
    if (isPlaying && loadedImages.size > 0) {
      lastTimeRef.current = 0;
      animFrameRef.current = requestAnimationFrame(renderFrame);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, renderFrame, loadedImages]);

  const togglePlay = () => {
    if (!isPlaying) {
      lastTimeRef.current = 0;
    }
    setIsPlaying(!isPlaying);
  };

  const skipToScene = (delta: number) => {
    const newIndex = Math.max(0, Math.min(currentSceneIndex + delta, validScenes.length - 1));
    const fps = 30;
    frameCounterRef.current = newIndex * duration * fps;
    setCurrentSceneIndex(newIndex);
  };

  const cycleSpeed = () => {
    const speeds = [0.5, 1, 1.5, 2];
    const currentIdx = speeds.indexOf(speed);
    setSpeed(speeds[(currentIdx + 1) % speeds.length]);
  };

  if (validScenes.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <p className="text-sm text-zinc-500">Generate images first to preview</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden ${isExpanded ? 'fixed inset-4 z-50' : 'relative'}`}
      style={{
        background: 'rgba(9, 9, 11, 0.95)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(245, 158, 11, 0.15)',
      }}
    >
      {/* Expanded backdrop */}
      {isExpanded && (
        <div className="fixed inset-0 -z-10 bg-black/80" onClick={() => setIsExpanded(false)} />
      )}

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-amber-500/10">
            <Play size={12} className="text-amber-400" />
          </div>
          <span className="text-xs font-bold text-white">Live Preview</span>
          {isPlaying && (
            <span className="text-[10px] text-amber-400 font-mono">
              Scene {currentSceneIndex + 1}/{validScenes.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className={`flex items-center justify-center bg-black ${isExpanded ? 'flex-1 h-[calc(100%-100px)]' : ''}`}>
        <canvas
          ref={canvasRef}
          className={`${isExpanded ? 'max-h-full max-w-full' : 'w-full'}`}
          style={{ imageRendering: 'auto' }}
        />
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-t border-white/5">
        {/* Progress bar */}
        <div className="h-1 bg-zinc-800 rounded-full mb-3 overflow-hidden cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            const fps = 30;
            frameCounterRef.current = Math.floor(ratio * validScenes.length * duration * fps);
          }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #d97706, #f59e0b)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Buttons row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => skipToScene(-1)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <SkipBack size={16} />
            </button>
            <button
              onClick={togglePlay}
              className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/25 transition-all"
            >
              {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current ml-0.5" />}
            </button>
            <button
              onClick={() => skipToScene(1)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <SkipForward size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Year display */}
            <span className="text-xs font-mono font-bold text-amber-400 bg-zinc-800 px-2 py-1 rounded-md">
              {validScenes[currentSceneIndex]?.year || '-'}
            </span>

            {/* Speed control */}
            <button
              onClick={cycleSpeed}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs font-mono font-bold text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
            >
              <Gauge size={12} className="text-zinc-500" />
              {speed}x
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

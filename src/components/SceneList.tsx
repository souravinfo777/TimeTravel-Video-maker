import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, Scene } from '../types';
import { SceneCard } from './SceneCard';
import { generateImage } from '../services/gemini';
import { Reorder, useDragControls, motion, AnimatePresence } from 'motion/react';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { TimelapseModal } from './TimelapseModal';
import { VideoExportModal } from './VideoExportModal';
import { GenerationQueue } from './GenerationQueue';
import { SmartSuggestions } from './SmartSuggestions';
import { TimelineScrubber } from './TimelineScrubber';
import { LivePreviewPlayer } from './LivePreviewPlayer';
import {
  Play,
  Video,
  Sparkles,
  LayoutList,
  Film,
  GripVertical,
  Clock,
  Eye,
  Square,
} from 'lucide-react';

interface SceneListProps {
  state: AppState;
  updateState: (updates: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => void;
}

// Individual draggable scene row that exposes drag controls
function DraggableSceneItem({
  scene,
  index,
  total,
  aspectRatio,
  imageSize,
  onUpdate,
  isNarrativeMode,
  sceneRef,
}: {
  scene: Scene;
  index: number;
  total: number;
  aspectRatio: string;
  imageSize: string;
  onUpdate: (updates: Partial<Scene>) => void;
  isNarrativeMode: boolean;
  sceneRef: React.RefObject<HTMLDivElement | null>;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      key={scene.id}
      value={scene}
      dragListener={false}
      dragControls={dragControls}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ delay: index * 0.06, duration: 0.38, type: 'spring', stiffness: 260, damping: 26 }}
      whileDrag={{
        scale: 1.015,
        boxShadow: '0 16px 48px rgba(245,158,11,0.18)',
        zIndex: 50,
        rotate: 0.4,
      }}
      className="relative"
    >
      <div ref={sceneRef}>
        <SceneCard
          scene={scene}
          index={index}
          total={total}
          aspectRatio={aspectRatio}
          imageSize={imageSize}
          onUpdate={onUpdate}
          dragHandleProps={{
            onPointerDown: (e) => dragControls.start(e),
            style: { touchAction: 'none' },
          }}
        />
      </div>

      {/* Narrative note badge (narrative mode compact view) */}
      {isNarrativeMode && scene.narrativeNote && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 ml-8 mr-4 px-4 py-2 rounded-lg border text-xs text-zinc-400 italic"
          style={{
            background: 'rgba(245,158,11,0.04)',
            borderColor: 'rgba(245,158,11,0.12)',
          }}
        >
          <span className="text-amber-500/60 not-italic font-bold mr-1">✦</span>
          {scene.narrativeNote}
        </motion.div>
      )}
    </Reorder.Item>
  );
}

// The animated connector line between scenes
function TimelineConnector({ index, total }: { index: number; total: number }) {
  if (index >= total - 1) return null;
  return (
    <div className="flex items-center gap-3 py-1 px-4 ml-8 select-none pointer-events-none">
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.4, delay: index * 0.07 }}
          className="w-px h-6 origin-top rounded-full"
          style={{ background: 'linear-gradient(to bottom, rgba(245,158,11,0.35), rgba(245,158,11,0.06))' }}
        />
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'rgba(245,158,11,0.25)', boxShadow: '0 0 6px rgba(245,158,11,0.2)' }}
        />
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.4, delay: index * 0.07 + 0.05 }}
          className="w-px h-6 origin-bottom rounded-full"
          style={{ background: 'linear-gradient(to bottom, rgba(245,158,11,0.06), rgba(245,158,11,0.0))' }}
        />
      </div>
      <span className="text-[10px] text-zinc-700 font-mono">▸ next scene</span>
    </div>
  );
}

export function SceneList({ state, updateState }: SceneListProps) {
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [showVideoExport, setShowVideoExport] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [narrativeMode, setNarrativeMode] = useState(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const abortRef = useRef(false);
  const sceneRefs = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(new Map());

  // Provide or get a ref for each scene
  const getSceneRef = (sceneId: string) => {
    if (!sceneRefs.current.has(sceneId)) {
      sceneRefs.current.set(sceneId, React.createRef());
    }
    return sceneRefs.current.get(sceneId)!;
  };

  // IntersectionObserver for tracking active scene
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    state.scenes.forEach((scene, index) => {
      const ref = sceneRefs.current.get(scene.id);
      if (ref?.current) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              setActiveSceneIndex(index);
            }
          },
          { threshold: 0.5 }
        );
        observer.observe(ref.current);
        observers.push(observer);
      }
    });
    return () => observers.forEach(o => o.disconnect());
  }, [state.scenes]);

  const updateScene = (id: string, updates: Partial<Scene>) => {
    updateState(prev => ({
      scenes: prev.scenes.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  // Sequential batch generation with queue
  const handleGenerateAll = useCallback(async () => {
    const scenesToGenerate = state.scenes.filter(s => !s.imageUrl && !s.isGeneratingImage);
    if (scenesToGenerate.length === 0) return;

    setIsBatchGenerating(true);
    abortRef.current = false;

    // Mark all as queued
    scenesToGenerate.forEach(scene => {
      updateScene(scene.id, { generationStatus: 'queued', imageError: undefined });
    });

    // Generate sequentially
    for (const scene of scenesToGenerate) {
      if (abortRef.current) break;

      updateScene(scene.id, { generationStatus: 'generating', isGeneratingImage: true });

      try {
        const imageUrl = await generateImage(scene.prompt, state.aspectRatio, state.imageSize);
        updateScene(scene.id, {
          imageUrl,
          isGeneratingImage: false,
          generationStatus: 'done',
        });
      } catch (error: any) {
        updateScene(scene.id, {
          imageError: error.message,
          isGeneratingImage: false,
          generationStatus: 'error',
        });
      }
    }

    setIsBatchGenerating(false);
  }, [state.scenes, state.aspectRatio, state.imageSize]);

  const handleRetryFailed = useCallback(async () => {
    const failedScenes = state.scenes.filter(s => s.generationStatus === 'error');
    if (failedScenes.length === 0) return;

    setIsBatchGenerating(true);
    abortRef.current = false;

    failedScenes.forEach(scene => {
      updateScene(scene.id, { generationStatus: 'queued', imageError: undefined });
    });

    for (const scene of failedScenes) {
      if (abortRef.current) break;

      updateScene(scene.id, { generationStatus: 'generating', isGeneratingImage: true });

      try {
        const imageUrl = await generateImage(scene.prompt, state.aspectRatio, state.imageSize);
        updateScene(scene.id, {
          imageUrl,
          isGeneratingImage: false,
          generationStatus: 'done',
        });
      } catch (error: any) {
        updateScene(scene.id, {
          imageError: error.message,
          isGeneratingImage: false,
          generationStatus: 'error',
        });
      }
    }

    setIsBatchGenerating(false);
  }, [state.scenes, state.aspectRatio, state.imageSize]);

  const handleCancelBatch = () => {
    abortRef.current = true;
    // Clear status for queued items
    state.scenes.forEach(scene => {
      if (scene.generationStatus === 'queued') {
        updateScene(scene.id, { generationStatus: undefined });
      }
    });
    setIsBatchGenerating(false);
  };

  const handleDismissQueue = () => {
    state.scenes.forEach(scene => {
      if (scene.generationStatus) {
        updateScene(scene.id, { generationStatus: undefined });
      }
    });
    setIsBatchGenerating(false);
  };

  const handleAddSuggestedScene = (newScene: Scene) => {
    updateState(prev => {
      const scenes = [...prev.scenes, newScene].sort((a, b) => a.year - b.year);
      return { scenes };
    });
  };

  const handleScrubberClick = (index: number) => {
    const scene = state.scenes[index];
    const ref = sceneRefs.current.get(scene.id);
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setActiveSceneIndex(index);
  };

  const firstScene = state.scenes[0];
  const lastScene = state.scenes[state.scenes.length - 1];
  const hasBeforeAfter = firstScene?.imageUrl && lastScene?.imageUrl && state.scenes.length > 1;
  const hasAnyImages = state.scenes.some(s => s.imageUrl);
  const allImagesGenerated = state.scenes.length > 0 && state.scenes.every(s => s.imageUrl);
  const generatedCount = state.scenes.filter(s => s.imageUrl).length;

  return (
    <div className="max-w-4xl mx-auto pb-24 relative">
      {/* Generating skeleton */}
      {state.isGeneratingPrompts && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            className="text-5xl mb-6 text-amber-500"
          >
            ⏳
          </motion.div>
          <p className="text-lg animate-pulse font-medium">Thinking deeply about the timeline…</p>
          <p className="text-sm text-zinc-600 mt-1">Gemini is crafting your narrative sequence</p>
          <div className="w-full mt-12 space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-full h-56 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 animate-pulse flex overflow-hidden">
                <div className="w-8 bg-zinc-950/30" />
                <div className="flex-1 p-6 border-r border-zinc-800/50">
                  <div className="h-6 w-20 bg-zinc-800 rounded-md mb-4" />
                  <div className="h-3 w-full bg-zinc-800 rounded mb-2" />
                  <div className="h-3 w-4/5 bg-zinc-800 rounded mb-2" />
                  <div className="h-3 w-2/3 bg-zinc-800 rounded" />
                </div>
                <div className="flex-1 bg-zinc-950/40" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!state.isGeneratingPrompts && state.scenes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Generated Timeline</h2>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <p className="text-zinc-500 text-sm">
                  {state.scenes.length} scenes · {state.startYear} → {state.endYear}
                </p>
                {hasAnyImages && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
                        animate={{ width: `${(generatedCount / state.scenes.length) * 100}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                    <span className="text-xs text-zinc-600">{generatedCount}/{state.scenes.length} images</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Narrative Mode Toggle */}
              <button
                onClick={() => setNarrativeMode(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  narrativeMode
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Narrative flow mode: show story notes inline"
              >
                {narrativeMode ? <LayoutList size={14} /> : <Film size={14} />}
                <span className="hidden sm:inline">{narrativeMode ? 'Narrative Mode' : 'Storyboard'}</span>
              </button>

              {/* Live Preview Toggle */}
              {hasAnyImages && (
                <button
                  onClick={() => setShowPreview(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    showPreview
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <Eye size={14} className={showPreview ? 'text-emerald-400' : 'text-amber-500'} />
                  <span className="hidden sm:inline">Preview</span>
                </button>
              )}

              {hasAnyImages && (
                <button
                  onClick={() => setShowTimelapse(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-all"
                >
                  <Play size={14} className="text-amber-500" /> <span className="hidden sm:inline">Timelapse</span>
                </button>
              )}
              {allImagesGenerated && (
                <button
                  onClick={() => setShowVideoExport(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border border-amber-500/25 text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-all"
                >
                  <Video size={14} className="text-amber-500" /> <span className="hidden sm:inline">Make Video</span>
                </button>
              )}
              <button
                onClick={handleGenerateAll}
                disabled={isBatchGenerating}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50"
              >
                <Sparkles size={14} />
                <span className="hidden sm:inline">Generate All Images</span>
                <span className="sm:hidden">Generate All</span>
              </button>
            </div>
          </div>

          {/* Smart Suggestions */}
          <SmartSuggestions state={state} onAddScene={handleAddSuggestedScene} />

          {/* Live Preview Player */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
              >
                <LivePreviewPlayer
                  scenes={state.scenes}
                  onClose={() => setShowPreview(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Before / After Slider */}
          {hasBeforeAfter && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-12"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                <Clock size={12} className="text-amber-500" />
                Before &amp; After Comparison
              </h3>
              <BeforeAfterSlider
                beforeImage={firstScene.imageUrl!}
                afterImage={lastScene.imageUrl!}
                beforeLabel={firstScene.year.toString()}
                afterLabel={lastScene.year.toString()}
              />
            </motion.div>
          )}

          {/* Narrative Mode Header */}
          {narrativeMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 rounded-xl border border-amber-500/15 text-sm text-zinc-400"
              style={{ background: 'rgba(245,158,11,0.04)' }}
            >
              <p className="flex items-center gap-2">
                <Film size={14} className="text-amber-500 shrink-0" />
                <span>
                  <span className="text-white font-semibold">Narrative Mode</span> — story notes appear beneath each scene.
                  Drag the <GripVertical size={12} className="inline text-zinc-500" /> handle to reorder the timeline.
                </span>
              </p>
            </motion.div>
          )}

          {/* Scene list with drag + timeline connectors */}
          <Reorder.Group
            axis="y"
            values={state.scenes}
            onReorder={(newScenes) => updateState({ scenes: newScenes })}
            className="space-y-0"
          >
            <AnimatePresence>
              {state.scenes.map((scene, index) => (
                <React.Fragment key={scene.id}>
                  <DraggableSceneItem
                    scene={scene}
                    index={index}
                    total={state.scenes.length}
                    aspectRatio={state.aspectRatio}
                    imageSize={state.imageSize}
                    onUpdate={(updates) => updateScene(scene.id, updates)}
                    isNarrativeMode={narrativeMode}
                    sceneRef={getSceneRef(scene.id)}
                  />
                  {/* Timeline connector between scenes */}
                  {index < state.scenes.length - 1 && (
                    <TimelineConnector index={index} total={state.scenes.length} />
                  )}
                </React.Fragment>
              ))}
            </AnimatePresence>
          </Reorder.Group>

          {/* Timeline Scrubber */}
          <TimelineScrubber
            scenes={state.scenes}
            activeIndex={activeSceneIndex}
            onSceneClick={handleScrubberClick}
          />
        </motion.div>
      )}

      {/* Generation Queue Panel */}
      <GenerationQueue
        scenes={state.scenes}
        isActive={isBatchGenerating}
        onRetryFailed={handleRetryFailed}
        onCancel={isBatchGenerating ? handleCancelBatch : handleDismissQueue}
      />

      {showTimelapse && (
        <TimelapseModal scenes={state.scenes} onClose={() => setShowTimelapse(false)} />
      )}
      {showVideoExport && (
        <VideoExportModal scenes={state.scenes} onClose={() => setShowVideoExport(false)} />
      )}
    </div>
  );
}

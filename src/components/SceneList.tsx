import React, { useState } from 'react';
import { AppState, Scene } from '../types';
import { SceneCard } from './SceneCard';
import { generateImage } from '../services/gemini';
import { motion } from 'motion/react';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { TimelapseModal } from './TimelapseModal';
import { VideoExportModal } from './VideoExportModal';
import { Play, Video } from 'lucide-react';

interface SceneListProps {
  state: AppState;
  updateState: (updates: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => void;
}

export function SceneList({ state, updateState }: SceneListProps) {
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [showVideoExport, setShowVideoExport] = useState(false);

  const updateScene = (id: string, updates: Partial<Scene>) => {
    updateState(prev => ({
      scenes: prev.scenes.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const handleGenerateAll = async () => {
    const scenesToGenerate = state.scenes.filter(scene => !scene.imageUrl && !scene.isGeneratingImage);
    
    // Mark all as generating immediately
    scenesToGenerate.forEach(scene => {
      updateScene(scene.id, { isGeneratingImage: true, imageError: undefined });
    });

    // Generate all images in parallel for much faster execution
    await Promise.all(scenesToGenerate.map(async (scene) => {
      try {
        const imageUrl = await generateImage(scene.prompt, state.aspectRatio, state.imageSize);
        updateScene(scene.id, { imageUrl, isGeneratingImage: false });
      } catch (error: any) {
        updateScene(scene.id, { imageError: error.message, isGeneratingImage: false });
      }
    }));
  };

  const firstScene = state.scenes[0];
  const lastScene = state.scenes[state.scenes.length - 1];
  const hasBeforeAfter = firstScene?.imageUrl && lastScene?.imageUrl && state.scenes.length > 1;
  const hasAnyImages = state.scenes.some(s => s.imageUrl);
  const allImagesGenerated = state.scenes.length > 0 && state.scenes.every(s => s.imageUrl);

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {state.isGeneratingPrompts && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="text-4xl mb-6 text-amber-500"
          >
            ⏳
          </motion.div>
          <p className="text-lg animate-pulse">Thinking deeply about the timeline...</p>
          
          {/* Skeleton Loaders */}
          <div className="w-full mt-12 space-y-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-full h-64 bg-zinc-900/50 rounded-xl border border-zinc-800/50 animate-pulse flex">
                <div className="w-1/2 p-6 border-r border-zinc-800/50">
                  <div className="h-6 w-24 bg-zinc-800 rounded mb-4"></div>
                  <div className="h-4 w-full bg-zinc-800 rounded mb-2"></div>
                  <div className="h-4 w-3/4 bg-zinc-800 rounded"></div>
                </div>
                <div className="w-1/2 bg-zinc-950/50"></div>
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
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Generated Timeline</h2>
              <p className="text-zinc-400 mt-1">{state.scenes.length} scenes from {state.startYear} to {state.endYear}</p>
            </div>
            <div className="flex gap-3">
              {hasAnyImages && (
                <button 
                  onClick={() => setShowTimelapse(true)} 
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <Play size={16} className="text-amber-500" /> Play Timelapse
                </button>
              )}
              {allImagesGenerated && (
                <button 
                  onClick={() => setShowVideoExport(true)} 
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2 border border-amber-500/20"
                >
                  <Video size={16} className="text-amber-500" /> Make Video
                </button>
              )}
              <button 
                onClick={handleGenerateAll} 
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold rounded-lg shadow-sm transition-colors"
              >
                Generate All Images
              </button>
            </div>
          </div>
          
          {hasBeforeAfter && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-12"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">Before & After Comparison</h3>
              <BeforeAfterSlider 
                beforeImage={firstScene.imageUrl!} 
                afterImage={lastScene.imageUrl!} 
                beforeLabel={firstScene.year.toString()}
                afterLabel={lastScene.year.toString()}
              />
            </motion.div>
          )}

          <div className="space-y-8">
            {state.scenes.map((scene, index) => (
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
              >
                <SceneCard 
                  scene={scene} 
                  index={index} 
                  total={state.scenes.length}
                  aspectRatio={state.aspectRatio}
                  imageSize={state.imageSize}
                  onUpdate={(updates) => updateScene(scene.id, updates)} 
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {showTimelapse && (
        <TimelapseModal scenes={state.scenes} onClose={() => setShowTimelapse(false)} />
      )}

      {showVideoExport && (
        <VideoExportModal scenes={state.scenes} onClose={() => setShowVideoExport(false)} />
      )}
    </div>
  );
}

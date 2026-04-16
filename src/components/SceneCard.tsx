import React, { useState } from 'react';
import { Scene } from '../types';
import { generateImage, editImage, analyzeImage } from '../services/gemini';
import { Image as ImageIcon, Download, Wand2, Search, Edit3 } from 'lucide-react';
import { motion } from 'motion/react';

interface SceneCardProps {
  key?: React.Key;
  scene: Scene;
  index: number;
  total: number;
  aspectRatio: string;
  imageSize: string;
  onUpdate: (updates: Partial<Scene>) => void;
}

export function SceneCard({ scene, index, total, aspectRatio, imageSize, onUpdate }: SceneCardProps) {
  const [editPrompt, setEditPrompt] = useState('');
  const [showEdit, setShowEdit] = useState(false);

  const handleGenerateImage = async () => {
    onUpdate({ isGeneratingImage: true, imageError: undefined });
    try {
      const imageUrl = await generateImage(scene.prompt, aspectRatio, imageSize);
      onUpdate({ imageUrl, isGeneratingImage: false });
    } catch (error: any) {
      onUpdate({ imageError: error.message, isGeneratingImage: false });
    }
  };

  const handleEditImage = async () => {
    if (!scene.imageUrl || !editPrompt) return;
    onUpdate({ isEditing: true, imageError: undefined });
    try {
      const newImageUrl = await editImage(scene.imageUrl, editPrompt);
      onUpdate({ imageUrl: newImageUrl, isEditing: false });
      setEditPrompt('');
      setShowEdit(false);
    } catch (error: any) {
      onUpdate({ imageError: error.message, isEditing: false });
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

  return (
    <div className="bg-zinc-900 rounded-xl shadow-xl border border-zinc-800 overflow-hidden flex flex-col md:flex-row transition-all hover:border-zinc-700">
      <div className="p-6 md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-zinc-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-zinc-800 text-amber-400 font-mono font-bold px-3 py-1 rounded-md text-lg border border-zinc-700">
            {scene.year}
          </div>
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Scene {index + 1} of {total}
          </div>
        </div>
        
        <div className="flex-1 mb-4">
          <label className="block text-xs font-medium text-zinc-500 mb-2">Prompt</label>
          <textarea 
            value={scene.prompt}
            onChange={e => onUpdate({ prompt: e.target.value })}
            className="w-full h-40 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
          />
        </div>

        <button 
          onClick={handleGenerateImage} 
          disabled={scene.isGeneratingImage}
          className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 transition-colors flex justify-center items-center gap-2 border border-zinc-700"
        >
          {scene.isGeneratingImage ? (
            <><span className="animate-spin text-amber-500">⏳</span> Generating Image...</>
          ) : (
            <><ImageIcon size={18} className="text-amber-500" /> Generate Image</>
          )}
        </button>
        {scene.imageError && (
          <p className="text-red-400 text-xs mt-2">{scene.imageError}</p>
        )}
      </div>

      <div className="md:w-1/2 bg-zinc-950/50 p-6 flex flex-col items-center justify-center relative min-h-[300px]">
        {scene.imageUrl ? (
          <div className="w-full h-full flex flex-col">
            <div className="relative flex-1 flex items-center justify-center mb-4 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
              <motion.img 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={scene.imageUrl} 
                alt={`Scene from ${scene.year}`} 
                className="max-w-full max-h-[400px] object-contain" 
              />
              {(scene.isEditing || scene.isGeneratingImage) && (
                <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center">
                  <span className="animate-spin text-4xl text-amber-500">⏳</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-md text-sm hover:bg-zinc-700 hover:text-white shadow-sm transition-colors">
                <Download size={14} /> Download
              </button>
              <button onClick={() => setShowEdit(!showEdit)} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-md text-sm hover:bg-zinc-700 hover:text-white shadow-sm transition-colors">
                <Edit3 size={14} /> Edit
              </button>
              <button onClick={handleAnalyzeImage} disabled={scene.isAnalyzing} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-md text-sm hover:bg-zinc-700 hover:text-white shadow-sm disabled:opacity-50 transition-colors">
                <Search size={14} /> {scene.isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>

            {showEdit && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-zinc-900 border border-zinc-800 rounded-lg shadow-sm flex gap-2"
              >
                <input 
                  type="text" 
                  placeholder="e.g. Add a retro filter" 
                  value={editPrompt}
                  onChange={e => setEditPrompt(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button 
                  onClick={handleEditImage}
                  disabled={!editPrompt || scene.isEditing}
                  className="px-3 py-1.5 bg-amber-600 text-zinc-950 rounded-md text-sm font-bold hover:bg-amber-500 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  <Wand2 size={14} /> Apply
                </button>
              </motion.div>
            )}

            {scene.analysis && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg shadow-sm text-sm text-zinc-300 max-h-40 overflow-y-auto"
              >
                <h4 className="font-bold text-white mb-2 flex items-center gap-1.5"><Search size={14} className="text-amber-500" /> Analysis</h4>
                <p className="whitespace-pre-wrap leading-relaxed">{scene.analysis}</p>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="text-zinc-600 flex flex-col items-center">
            <ImageIcon size={48} className="mb-3 opacity-20" />
            <p className="text-sm">No image generated yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

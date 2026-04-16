import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { SceneList } from './components/SceneList';
import { AppState, Scene } from './types';
import { generatePrompts, generateLocationDescription } from './services/gemini';
import { Copy, Code } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>({
    startYear: 2000,
    endYear: 2024,
    numImages: 5,
    locationHint: '',
    locationDescription: '',
    charactersEnabled: false,
    numPeople: 1,
    characterNotes: '',
    decayLevel: 50,
    aspectRatio: '16:9',
    imageSize: '1K',
    scenes: [],
    isGeneratingPrompts: false,
    isGeneratingLocation: false,
    places: []
  });

  const updateState = (updates: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => {
    setState(prev => {
      const resolvedUpdates = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...resolvedUpdates };
    });
  };

  const handleGenerateLocation = async () => {
    if (!state.locationHint) return;
    updateState({ isGeneratingLocation: true, globalError: undefined });
    try {
      const { description, places } = await generateLocationDescription(state.locationHint);
      updateState({ locationDescription: description, places, isGeneratingLocation: false });
    } catch (error: any) {
      updateState({ globalError: error.message, isGeneratingLocation: false });
    }
  };

  const handleGeneratePrompts = async () => {
    updateState({ isGeneratingPrompts: true, globalError: undefined });
    try {
      const prompts = await generatePrompts(state);
      const scenes: Scene[] = prompts.map((p: any, i: number) => ({
        id: `scene-${i}-${Date.now()}`,
        year: p.year,
        prompt: p.prompt
      }));
      updateState({ scenes, isGeneratingPrompts: false });
    } catch (error: any) {
      updateState({ globalError: error.message, isGeneratingPrompts: false });
    }
  };

  const handleCopyPrompts = () => {
    const text = state.scenes.map(s => `Year ${s.year}:\n${s.prompt}`).join('\n\n');
    navigator.clipboard.writeText(text);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.scenes, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "prompts.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden selection:bg-amber-500/30">
      <Sidebar state={state} updateState={updateState} onGenerateLocation={handleGenerateLocation} onGeneratePrompts={handleGeneratePrompts} />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-6 py-4 flex justify-between items-center shrink-0 z-10">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-amber-500">⏳</span> TimeTravel StreetView
          </h1>
          <div className="flex gap-3">
            <button onClick={handleCopyPrompts} disabled={state.scenes.length === 0} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-md disabled:opacity-50 transition-colors">
              <Copy size={16} /> Copy Prompts
            </button>
            <button onClick={handleExportJSON} disabled={state.scenes.length === 0} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-md disabled:opacity-50 transition-colors">
              <Code size={16} /> Export JSON
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {state.globalError && (
            <div className="mb-6 p-4 bg-red-950/50 text-red-400 rounded-lg border border-red-900/50">
              {state.globalError}
            </div>
          )}
          
          {state.scenes.length === 0 && !state.isGeneratingPrompts ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600">
              <div className="text-6xl mb-4 opacity-20">🕰️</div>
              <p className="text-lg">Configure settings and generate prompts to begin.</p>
            </div>
          ) : (
            <SceneList state={state} updateState={updateState} />
          )}
        </div>
      </main>
    </div>
  );
}

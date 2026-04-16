import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { SceneList } from './components/SceneList';
import { AppState, Scene } from './types';
import { generatePrompts, generateLocationDescription } from './services/gemini';
import { Copy, Code, Menu, X } from 'lucide-react';

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
    places: [],
    sidebarOpen: false,
  });

  const updateState = (updates: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => {
    setState(prev => {
      const resolvedUpdates = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...resolvedUpdates };
    });
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      updateState({ projects: data });
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectSave = async () => {
    const name = prompt('Project Name:', state.name || 'My Street Timeline');
    if (!name) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: state.id,
          name,
          state: { ...state, projects: undefined }
        })
      });
      const data = await res.json();
      updateState({ id: data.id, name: data.name });
      fetchProjects();
      alert('Project saved successfully!');
    } catch (err) {
      updateState({ globalError: 'Failed to save project' });
    }
  };

  const handleProjectLoad = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      const project = await res.json();
      setState({ ...project.data, id: project.id, name: project.name, projects: state.projects });
      updateState({ sidebarOpen: false });
    } catch (err) {
      updateState({ globalError: 'Failed to load project' });
    }
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
        prompt: p.prompt,
        imageUrl: (i === 0 && state.uploadedImageBase64) ? state.uploadedImageBase64 : undefined
      }));
      updateState({ scenes, isGeneratingPrompts: false, sidebarOpen: false });
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
      {/* Mobile sidebar overlay backdrop */}
      {state.sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => updateState({ sidebarOpen: false })}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${state.sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar 
          state={state} 
          updateState={updateState} 
          onGenerateLocation={handleGenerateLocation} 
          onGeneratePrompts={handleGeneratePrompts}
          onProjectSave={handleProjectSave}
          onProjectLoad={handleProjectLoad}
          onClose={() => updateState({ sidebarOpen: false })}
        />
      </div>
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="glass bg-zinc-900/40 backdrop-blur-md border-b border-white/5 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shrink-0 z-10 transition-all duration-300">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => updateState({ sidebarOpen: true })}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors lg:hidden"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 group">
              <span className="text-amber-500 group-hover:rotate-12 transition-transform">⏳</span>
              TimeTravel <span className="text-zinc-500 font-light hidden sm:inline">StreetView</span>
            </h1>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button onClick={handleCopyPrompts} disabled={state.scenes.length === 0} className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-md disabled:opacity-50 transition-colors">
              <Copy size={14} /> <span className="hidden sm:inline">Copy Prompts</span>
            </button>
            <button onClick={handleExportJSON} disabled={state.scenes.length === 0} className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-md disabled:opacity-50 transition-colors">
              <Code size={14} /> <span className="hidden sm:inline">Export JSON</span>
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 scroll-smooth">
          {state.globalError && (
            <div className="mb-6 p-4 bg-red-950/50 text-red-400 rounded-lg border border-red-900/50">
              {state.globalError}
            </div>
          )}
          
          {state.scenes.length === 0 && !state.isGeneratingPrompts ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 px-4">
              <div className="text-6xl mb-4 opacity-20">🕰️</div>
              <p className="text-lg text-center">Configure settings and generate prompts to begin.</p>
              <button
                onClick={() => updateState({ sidebarOpen: true })}
                className="mt-4 px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-sm font-semibold hover:bg-amber-500/20 transition-colors lg:hidden"
              >
                Open Settings
              </button>
            </div>
          ) : (
            <SceneList state={state} updateState={updateState} />
          )}
        </div>
      </main>
    </div>
  );
}

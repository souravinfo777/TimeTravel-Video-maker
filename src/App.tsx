import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { SceneList } from './components/SceneList';
import { AppState, SavedProject, Scene } from './types';
import { generatePrompts, generateLocationDescription } from './services/gemini';
import { buildSavedProject, createBlankState, createSerializableSnapshot, hasMeaningfulProjectData, loadCurrentDraft, loadSavedProjects, saveCurrentDraft, saveSavedProjects, suggestProjectName } from './services/storage';
import { Copy, Code } from 'lucide-react';

export default function App() {
  const [initialDraft] = useState(() => loadCurrentDraft());
  const [state, setState] = useState<AppState>(() => initialDraft?.snapshot || createBlankState());
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() => loadSavedProjects());
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(() => initialDraft?.currentProjectId);
  const [storageError, setStorageError] = useState<string | undefined>();

  const updateState = (updates: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => {
    setState(prev => {
      const resolvedUpdates = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...resolvedUpdates };
    });
  };

  useEffect(() => {
    const result = saveCurrentDraft(state, currentProjectId);
    setStorageError(result.ok ? undefined : result.error);
  }, [state, currentProjectId]);

  const suggestedProjectName = useMemo(() => suggestProjectName(state), [state.locationHint, state.locationDescription, state.startYear, state.endYear]);

  const persistProjects = (projects: SavedProject[]) => {
    const result = saveSavedProjects(projects);
    if (!result.ok) {
      setStorageError(result.error);
      updateState({ globalError: result.error });
      return false;
    }
    setStorageError(undefined);
    setSavedProjects(projects);
    return true;
  };

  const handleSaveProject = (name: string) => {
    const existing = currentProjectId ? savedProjects.find(project => project.id === currentProjectId) : undefined;
    const project = buildSavedProject(state, name, existing);
    const nextProjects = [project, ...savedProjects.filter(item => item.id !== project.id)]
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    if (persistProjects(nextProjects)) {
      setCurrentProjectId(project.id);
      updateState({ globalError: undefined });
    }
  };

  const handleLoadProject = (project: SavedProject) => {
    setState(createSerializableSnapshot(project.snapshot));
    setCurrentProjectId(project.id);
    setStorageError(undefined);
  };

  const handleDeleteProject = (project: SavedProject) => {
    if (!window.confirm(`Delete "${project.name}" from this browser?`)) return;
    const nextProjects = savedProjects.filter(item => item.id !== project.id);
    if (persistProjects(nextProjects) && currentProjectId === project.id) {
      setCurrentProjectId(undefined);
    }
  };

  const handleNewProject = () => {
    setState(createBlankState());
    setCurrentProjectId(undefined);
    setStorageError(undefined);
  };

  const handleGenerateLocation = async () => {
    if (!state.locationHint.trim()) {
      updateState({ globalError: 'Enter a location hint before generating a description.' });
      return;
    }
    updateState({ isGeneratingLocation: true, globalError: undefined });
    try {
      const { description, places } = await generateLocationDescription(state.locationHint.trim());
      updateState({ locationDescription: description, places, isGeneratingLocation: false });
    } catch (error: any) {
      updateState({ globalError: error.message, isGeneratingLocation: false });
    }
  };

  const validatePromptGeneration = () => {
    if (!state.locationDescription.trim()) return 'Add or generate a detailed location description first.';
    if (!Number.isFinite(state.startYear) || !Number.isFinite(state.endYear)) return 'Enter valid start and end years.';
    if (state.endYear <= state.startYear) return 'End year must be later than start year.';
    if (!Number.isFinite(state.numImages) || state.numImages < 2 || state.numImages > 20) return 'Number of images must be between 2 and 20.';
    return undefined;
  };

  const handleGeneratePrompts = async () => {
    const validationError = validatePromptGeneration();
    if (validationError) {
      updateState({ globalError: validationError });
      return;
    }

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

  const visibleError = state.globalError || storageError;

  return (
    <div className="flex h-screen flex-col lg:flex-row bg-zinc-950 text-zinc-100 font-sans overflow-hidden selection:bg-amber-500/30">
      <Sidebar
        state={state}
        updateState={updateState}
        onGenerateLocation={handleGenerateLocation}
        onGeneratePrompts={handleGeneratePrompts}
        projects={savedProjects}
        currentProjectId={currentProjectId}
        suggestedProjectName={suggestedProjectName}
        hasProjectData={hasMeaningfulProjectData(state)}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onDeleteProject={handleDeleteProject}
        onNewProject={handleNewProject}
      />
      
      <main className="min-h-0 flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center shrink-0 z-10">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-amber-500">⏳</span> TimeTravel StreetView
          </h1>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleCopyPrompts} disabled={state.scenes.length === 0} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-md disabled:opacity-50 transition-colors">
              <Copy size={16} /> Copy Prompts
            </button>
            <button onClick={handleExportJSON} disabled={state.scenes.length === 0} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-md disabled:opacity-50 transition-colors">
              <Code size={16} /> Export JSON
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
          {visibleError && (
            <div className="mb-6 p-4 bg-red-950/50 text-red-400 rounded-lg border border-red-900/50">
              {visibleError}
            </div>
          )}
          
          {state.scenes.length === 0 && !state.isGeneratingPrompts ? (
            <div className="min-h-[50vh] lg:h-full flex flex-col items-center justify-center text-center text-zinc-600 px-4">
              <div className="text-6xl mb-4 opacity-20">🕰️</div>
              <p className="text-lg">Configure settings and generate prompts to begin.</p>
              <p className="mt-2 text-sm text-zinc-700">Drafts auto-save in this browser; save named projects to keep multiple timelines.</p>
            </div>
          ) : (
            <SceneList state={state} updateState={updateState} />
          )}
        </div>
      </main>
    </div>
  );
}

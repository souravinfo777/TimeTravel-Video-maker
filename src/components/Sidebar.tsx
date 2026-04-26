import React from 'react';
import { AppState, SavedProject } from '../types';
import { MapPin, Sparkles, Users, Image as ImageIcon, Settings2 } from 'lucide-react';
import { ProjectHistory } from './ProjectHistory';
import { parseNumberOrFallback } from '../services/storage';

interface SidebarProps {
  state: AppState;
  updateState: (updates: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => void;
  onGenerateLocation: () => void;
  onGeneratePrompts: () => void;
  projects: SavedProject[];
  currentProjectId?: string;
  suggestedProjectName: string;
  hasProjectData: boolean;
  onSaveProject: (name: string) => void;
  onLoadProject: (project: SavedProject) => void;
  onDeleteProject: (project: SavedProject) => void;
  onNewProject: () => void;
}

export function Sidebar({ state, updateState, onGenerateLocation, onGeneratePrompts, projects, currentProjectId, suggestedProjectName, hasProjectData, onSaveProject, onLoadProject, onDeleteProject, onNewProject }: SidebarProps) {
  return (
    <aside className="w-full lg:w-80 lg:max-w-80 bg-zinc-900 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col lg:h-full shrink-0 overflow-y-auto">
      <ProjectHistory
        projects={projects}
        currentProjectId={currentProjectId}
        suggestedName={suggestedProjectName}
        hasProjectData={hasProjectData}
        onSave={onSaveProject}
        onLoad={onLoadProject}
        onDelete={onDeleteProject}
        onNewProject={onNewProject}
      />

      <div className="p-5 border-b border-zinc-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
          <Settings2 size={16} className="text-amber-500" /> Timeline Settings
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1" htmlFor="start-year">Start Year</label>
            <input id="start-year" type="number" value={state.startYear} onChange={e => updateState(prev => ({ startYear: parseNumberOrFallback(e.target.value, prev.startYear, 0, 9999) }))} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1" htmlFor="end-year">End Year</label>
            <input id="end-year" type="number" value={state.endYear} onChange={e => updateState(prev => ({ endYear: parseNumberOrFallback(e.target.value, prev.endYear, 0, 9999) }))} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1" htmlFor="num-images">Number of Images</label>
          <input id="num-images" type="number" min="2" max="20" value={state.numImages} onChange={e => updateState(prev => ({ numImages: parseNumberOrFallback(e.target.value, prev.numImages, 2, 20) }))} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </div>
      </div>

      <div className="p-5 border-b border-zinc-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
          <MapPin size={16} className="text-amber-500" /> Location
        </h2>
        <div className="mb-3">
          <label className="block text-xs font-medium text-zinc-400 mb-1" htmlFor="location-hint">Location Hint (for AI)</label>
          <div className="flex gap-2">
            <input id="location-hint" type="text" placeholder="e.g. Texas old yard" value={state.locationHint} onChange={e => updateState({ locationHint: e.target.value })} className="min-w-0 flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
            <button 
              onClick={onGenerateLocation} 
              disabled={state.isGeneratingLocation || !state.locationHint.trim()} 
              className="px-3 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md hover:bg-amber-500/20 disabled:opacity-50 transition-colors flex items-center justify-center" 
              title="AI Generate Location"
              aria-label="AI Generate Location"
            >
              {state.isGeneratingLocation ? (
                <span className="animate-spin text-xs">⏳</span>
              ) : (
                <Sparkles size={16} />
              )}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1" htmlFor="location-description">Detailed Description</label>
          <textarea id="location-description" value={state.locationDescription} onChange={e => updateState({ locationDescription: e.target.value })} rows={4} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none" placeholder="Describe the location in detail..." />
        </div>
        {state.places && state.places.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-zinc-500 mb-1">Maps References:</p>
            <ul className="text-xs text-amber-500 space-y-1">
              {state.places.map((place, i) => (
                <li key={i}><a href={place.uri} target="_blank" rel="noreferrer" className="hover:underline">{place.title || 'View on Maps'}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="p-5 border-b border-zinc-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
          <Users size={16} className="text-amber-500" /> Characters
        </h2>
        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input type="checkbox" checked={state.charactersEnabled} onChange={e => updateState({ charactersEnabled: e.target.checked })} className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900" />
          <span className="text-sm font-medium text-zinc-300">Enable Characters</span>
        </label>
        {state.charactersEnabled && (
          <div className="space-y-3 pl-6 border-l-2 border-zinc-800">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1" htmlFor="num-people">Number of People</label>
              <input id="num-people" type="number" min="1" max="10" value={state.numPeople} onChange={e => updateState(prev => ({ numPeople: parseNumberOrFallback(e.target.value, prev.numPeople, 1, 10) }))} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1" htmlFor="character-notes">Character Notes</label>
              <input id="character-notes" type="text" placeholder="e.g. elderly couple" value={state.characterNotes} onChange={e => updateState({ characterNotes: e.target.value })} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
          </div>
        )}
      </div>

      <div className="p-5 border-b border-zinc-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
          <ImageIcon size={16} className="text-amber-500" /> Image Settings
        </h2>
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-zinc-400" htmlFor="decay-level">Decay Theme</label>
            <span className="text-xs text-zinc-500">{state.decayLevel}%</span>
          </div>
          <input id="decay-level" type="range" min="0" max="100" value={state.decayLevel} onChange={e => updateState(prev => ({ decayLevel: parseNumberOrFallback(e.target.value, prev.decayLevel, 0, 100) }))} className="w-full accent-amber-500" />
          <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
            <span>Pristine</span>
            <span>Ruined</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1" htmlFor="aspect-ratio">Aspect Ratio</label>
            <select id="aspect-ratio" value={state.aspectRatio} onChange={e => updateState({ aspectRatio: e.target.value })} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500">
              <option value="1:1">1:1</option>
              <option value="3:4">3:4</option>
              <option value="4:3">4:3</option>
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1" htmlFor="image-size">Image Size</label>
            <select id="image-size" value={state.imageSize} onChange={e => updateState({ imageSize: e.target.value })} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500">
              <option value="1K">1K</option>
              <option value="2K">2K</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-5 lg:mt-auto">
        <button onClick={onGeneratePrompts} disabled={state.isGeneratingPrompts || !state.locationDescription.trim()} className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex justify-center items-center gap-2">
          {state.isGeneratingPrompts ? (
            <><span className="animate-spin">⏳</span> Generating...</>
          ) : (
            <><Sparkles size={18} /> Generate Prompts</>
          )}
        </button>
      </div>
    </aside>
  );
}

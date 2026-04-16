import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AppState, MapLocation } from '../types';
import {
  MapPin,
  Sparkles,
  Users,
  Image as ImageIcon,
  Settings2,
  Upload,
  Maximize2,
  Globe,
  ExternalLink,
  X,
  Layout,
  Key,
} from 'lucide-react';
import { analyzeImage } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { InteractiveMapModal } from './InteractiveMapModal';
import { TemplateModal } from './TemplateModal';

interface SidebarProps {
  state: AppState;
  updateState: (updates: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => void;
  onGenerateLocation: () => void;
  onGeneratePrompts: () => void;
  onProjectSave: () => void;
  onProjectLoad: (id: string) => void;
  onClose?: () => void;
}

export function Sidebar({ state, updateState, onGenerateLocation, onGeneratePrompts, onProjectSave, onProjectLoad, onClose }: SidebarProps) {
  const [showMapModal, setShowMapModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [apiKeys, setApiKeys] = useState(() => localStorage.getItem('gemini_api_keys') || '');
  const [keysSaved, setKeysSaved] = useState(false);

  const handleSaveKeys = () => {
    localStorage.setItem('gemini_api_keys', apiKeys);
    setKeysSaved(true);
    setTimeout(() => setKeysSaved(false), 2000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      updateState({ uploadedImageBase64: base64, isAnalyzingImage: true });
      try {
        const description = await analyzeImage(base64);
        updateState({ locationDescription: description, locationHint: 'Generated from uploaded photo', isAnalyzingImage: false });
      } catch (error: any) {
        updateState({ globalError: 'Failed to analyze image: ' + error.message, isAnalyzingImage: false });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMapLocationConfirm = (location: MapLocation) => {
    updateState({
      mapLocation: location,
      locationHint: location.name.split(',').slice(0, 2).join(',').trim(),
    });
  };

  const handleTemplateSelect = (updates: Partial<AppState>) => {
    updateState(updates);
  };

  // Build the Google Maps embed URL from pinned location or location hint
  const mapEmbedQuery = state.mapLocation
    ? `${state.mapLocation.lat},${state.mapLocation.lng}`
    : (state.places?.[0]?.title || state.locationHint || 'Times Square, NY');

  const googleMapsLink = state.mapLocation
    ? `https://www.google.com/maps?q=${state.mapLocation.lat},${state.mapLocation.lng}`
    : `https://www.google.com/maps/search/${encodeURIComponent(state.locationHint || 'Times Square')}`;

  return (
    <>
      <aside className="w-80 glass backdrop-blur-md border-r bg-zinc-900/40 border-white/5 flex flex-col h-full shrink-0 overflow-y-auto relative z-20">

        {/* Mobile close button */}
        {onClose && (
          <div className="p-3 border-b border-white/5 flex items-center justify-between lg:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Settings</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Projects Section */}
        <div className="p-5 border-b border-white/5 bg-zinc-400/5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
            <ImageIcon size={14} className="text-amber-500" /> My Projects
          </h2>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 mb-4">
            {state.projects?.map(p => (
              <button
                key={p.id}
                onClick={() => onProjectLoad?.(p.id)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all flex justify-between items-center group ${
                  state.id === p.id
                    ? 'bg-amber-500/10 border-amber-500/30 text-white'
                    : 'bg-zinc-950/50 border-white/5 hover:bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <span className="truncate flex-1 font-medium">{p.name || 'Untitled Project'}</span>
                <span className="text-[10px] text-zinc-600 group-hover:text-amber-500/50 shrink-0 ml-2">
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </button>
            ))}
            {(!state.projects || state.projects.length === 0) && (
              <p className="text-[10px] text-zinc-600 text-center py-2">No saved projects yet</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onProjectSave}
              disabled={state.scenes.length === 0}
              className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Upload size={13} /> Save
            </button>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold rounded-lg border border-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Layout size={13} /> Templates
            </button>
          </div>
        </div>

        {/* Timeline Settings */}
        <div className="p-5 border-b border-white/5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
            <Settings2 size={14} className="text-amber-500" /> Timeline Settings
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Start Year</label>
              <input type="number" value={state.startYear} onChange={e => updateState({ startYear: parseInt(e.target.value) })} className="sidebar-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">End Year</label>
              <input type="number" value={state.endYear} onChange={e => updateState({ endYear: parseInt(e.target.value) })} className="sidebar-input" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Number of Scenes</label>
            <input type="number" min="2" max="20" value={state.numImages} onChange={e => updateState({ numImages: parseInt(e.target.value) })} className="sidebar-input" />
          </div>
        </div>

        {/* API Settings */}
        <div className="p-5 border-b border-white/5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
            <Key size={14} className="text-amber-500" /> API Settings
          </h2>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5 flex justify-between">
              <span>Gemini API Keys</span>
              <span className="text-[10px] text-zinc-600">Space separated</span>
            </label>
            <textarea
              value={apiKeys}
              onChange={e => {
                setApiKeys(e.target.value);
                setKeysSaved(false);
              }}
              rows={2}
              className="sidebar-input resize-none"
              placeholder="Leave empty to use defaults, or paste keys..."
            />
            <button
              onClick={handleSaveKeys}
              className={`mt-2 w-full py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                keysSaved 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white border-white/5'
              }`}
            >
              {keysSaved ? 'Saved! ✓' : 'Save Keys to LocalStorage'}
            </button>
          </div>
        </div>

        {/* Location Section — Enhanced */}
        <div className="p-5 border-b border-white/5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
            <MapPin size={14} className="text-amber-500" /> Location
          </h2>

          {/* Photo Upload */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-500 mb-2">Personalize (Optional)</label>
            <div className="flex flex-col gap-2 relative">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                title="Upload a photo of your street"
              />
              <div className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed transition-colors text-sm font-medium ${
                state.uploadedImageBase64
                  ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                  : 'bg-zinc-950/60 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
              }`}>
                <Upload size={15} />
                {state.isAnalyzingImage ? 'Analyzing…' : state.uploadedImageBase64 ? 'Photo Uploaded ✓' : 'Upload Anchor Photo'}
              </div>
              {state.uploadedImageBase64 && (
                <div className="relative w-full h-20 bg-black rounded-lg overflow-hidden border border-zinc-800">
                  <img src={state.uploadedImageBase64} className="w-full h-full object-cover" alt="Uploaded Anchor" />
                  <button
                    className="absolute top-1 right-1 bg-zinc-900/80 hover:bg-zinc-800 p-1 text-zinc-400 hover:text-white rounded-md text-xs z-20 transition-colors"
                    onClick={(e) => { e.stopPropagation(); updateState({ uploadedImageBase64: undefined }); }}
                  >✕</button>
                </div>
              )}
            </div>
          </div>

          {/* Text location hint */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Location Hint</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Times Square, New York"
                value={state.locationHint}
                onChange={e => updateState({ locationHint: e.target.value })}
                className="sidebar-input flex-1"
              />
              <button
                onClick={onGenerateLocation}
                disabled={state.isGeneratingLocation || !state.locationHint}
                className="px-3 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 disabled:opacity-50 transition-colors flex items-center"
                title="AI generate location description"
              >
                {state.isGeneratingLocation ? (
                  <span className="animate-spin text-xs">⏳</span>
                ) : (
                  <Sparkles size={15} />
                )}
              </button>
            </div>
          </div>

          {/* Pinned Location Badge */}
          <AnimatePresence>
            {state.mapLocation && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                className="mb-3 px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-300 truncate">{state.mapLocation.name}</p>
                  <p className="text-[10px] text-zinc-600">
                    {state.mapLocation.lat.toFixed(4)}, {state.mapLocation.lng.toFixed(4)}
                  </p>
                </div>
                <button
                  onClick={() => updateState({ mapLocation: undefined })}
                  className="text-zinc-600 hover:text-zinc-400 text-[10px] shrink-0 transition-colors"
                  title="Remove pin"
                >✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Description textarea */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Detailed Description</label>
            <textarea
              value={state.locationDescription}
              onChange={e => updateState({ locationDescription: e.target.value })}
              rows={3}
              className="sidebar-input resize-none"
              placeholder="Describe the location in detail…"
            />
          </div>

          {/* Map Preview + Controls */}
          {(state.locationHint || state.locationDescription || state.mapLocation) && (
            <div className="relative group rounded-xl overflow-hidden border border-zinc-800/80">
              {/* Controls bar over map */}
              <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-2.5 py-1.5 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, rgba(9,9,11,0.7) 0%, transparent 100%)' }}>
                <div className="flex items-center gap-1">
                  <Globe size={11} className="text-amber-500" />
                  <span className="text-[10px] font-semibold text-zinc-400">Map Preview</span>
                  {state.mapLocation && (
                    <span className="ml-1 text-[10px] px-1.5 py-0 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Pinned</span>
                  )}
                </div>
              </div>

              {/* Expand button */}
              <button
                onClick={() => setShowMapModal(true)}
                className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xl transition-all pointer-events-auto opacity-0 group-hover:opacity-100"
                style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Maximize2 size={12} className="text-amber-500" />
                Expand &amp; Pin
              </button>

              {/* Open in Google Maps */}
              <a
                href={googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-2 left-2 z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-zinc-300 shadow-xl transition-all pointer-events-auto opacity-0 group-hover:opacity-100"
                style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <ExternalLink size={10} className="text-zinc-500" /> Google Maps
              </a>

              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors pointer-events-none z-[5]" />
              <iframe
                width="100%"
                height="160"
                frameBorder="0"
                scrolling="no"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(mapEmbedQuery)}&t=&z=${state.mapLocation ? 15 : 13}&ie=UTF8&iwloc=&output=embed`}
                className="block"
                title="Location Map"
              />
            </div>
          )}

          {/* Open Map button (always visible) */}
          <button
            onClick={() => setShowMapModal(true)}
            className="mt-3 w-full py-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:border-amber-500/40 hover:text-amber-400 hover:bg-amber-500/5 text-xs font-semibold transition-all"
          >
            <Maximize2 size={13} />
            {state.mapLocation ? 'Change Pinned Location' : 'Open Interactive Map'}
          </button>
        </div>

        {/* Characters */}
        <div className="p-5 border-b border-white/5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
            <Users size={14} className="text-amber-500" /> Characters
          </h2>
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={state.charactersEnabled}
              onChange={e => updateState({ charactersEnabled: e.target.checked })}
              className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
            />
            <span className="text-sm font-medium text-zinc-300">Enable Characters</span>
          </label>
          {state.charactersEnabled && (
            <div className="space-y-3 pl-5 border-l-2 border-zinc-800">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Number of People</label>
                <input type="number" min="1" max="10" value={state.numPeople} onChange={e => updateState({ numPeople: parseInt(e.target.value) })} className="sidebar-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Character Notes</label>
                <input type="text" placeholder="e.g. elderly couple" value={state.characterNotes} onChange={e => updateState({ characterNotes: e.target.value })} className="sidebar-input" />
              </div>
            </div>
          )}
        </div>

        {/* Image Settings */}
        <div className="p-5 border-b border-white/5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
            <ImageIcon size={14} className="text-amber-500" /> Image Settings
          </h2>
          <div className="mb-4">
            <div className="flex justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-500">Decay Theme</label>
              <span className="text-xs text-amber-500 font-mono font-bold">{state.decayLevel}%</span>
            </div>
            <div className="relative">
              <input
                type="range" min="0" max="100"
                value={state.decayLevel}
                onChange={e => updateState({ decayLevel: parseInt(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-700 mt-1">
                <span>Pristine</span><span>Ruined</span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Aspect Ratio</label>
            <select
              value={state.aspectRatio}
              onChange={e => updateState({ aspectRatio: e.target.value })}
              className="sidebar-input"
            >
              <optgroup label="Standard">
                <option value="1:1">1:1 Square</option>
                <option value="16:9">16:9 Cinema</option>
                <option value="9:16">9:16 Vertical</option>
              </optgroup>
              <optgroup label="Classic">
                <option value="4:3">4:3 Classic</option>
                <option value="3:4">3:4 Portrait</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <div className="p-5 mt-auto">
          <button
            onClick={onGeneratePrompts}
            disabled={state.isGeneratingPrompts || !state.locationDescription}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-zinc-950 font-black rounded-xl shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2 group text-sm"
          >
            {state.isGeneratingPrompts ? (
              <><span className="animate-spin text-lg">⌛</span> Generating…</>
            ) : (
              <><Sparkles size={17} className="group-hover:rotate-12 transition-transform" /> Generate Timeline</>
            )}
          </button>
          {!state.locationDescription && (
            <p className="text-center text-[10px] text-zinc-600 mt-2">Add a location description to enable</p>
          )}
        </div>
      </aside>

      {/* Interactive Map Modal — portalled to body */}
      {showMapModal && createPortal(
        <InteractiveMapModal
          locationHint={state.locationHint || ''}
          onClose={() => setShowMapModal(false)}
          onLocationConfirm={handleMapLocationConfirm}
        />,
        document.body
      )}

      {/* Template Modal — portalled to body */}
      {showTemplateModal && createPortal(
        <TemplateModal
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateModal(false)}
        />,
        document.body
      )}
    </>
  );
}

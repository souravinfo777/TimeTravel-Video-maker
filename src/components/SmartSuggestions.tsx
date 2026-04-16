import React, { useState, useEffect } from 'react';
import { SmartSuggestion, AppState, Scene } from '../types';
import { generateSmartSuggestions } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, Plus, ChevronDown, ChevronUp, Loader2, X, Sparkles } from 'lucide-react';

interface SmartSuggestionsProps {
  state: AppState;
  onAddScene: (scene: Scene) => void;
}

export function SmartSuggestions({ state, onAddScene }: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [addedYears, setAddedYears] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (state.scenes.length > 0 && !isDismissed && suggestions.length === 0) {
      fetchSuggestions();
    }
  }, [state.scenes.length]);

  const fetchSuggestions = async () => {
    if (isLoading || state.scenes.length === 0) return;
    setIsLoading(true);
    try {
      const result = await generateSmartSuggestions({
        startYear: state.startYear,
        endYear: state.endYear,
        existingYears: state.scenes.map(s => s.year),
        locationHint: state.locationHint,
        locationDescription: state.locationDescription,
      });
      setSuggestions(result);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddScene = (suggestion: SmartSuggestion) => {
    const newScene: Scene = {
      id: `scene-suggested-${suggestion.year}-${Date.now()}`,
      year: suggestion.year,
      prompt: suggestion.promptSuggestion,
    };
    onAddScene(newScene);
    setAddedYears(prev => new Set(prev).add(suggestion.year));
  };

  if (isDismissed || (suggestions.length === 0 && !isLoading)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-8 rounded-xl border overflow-hidden"
      style={{
        background: 'rgba(99, 102, 241, 0.04)',
        borderColor: 'rgba(99, 102, 241, 0.15)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <Lightbulb size={14} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Smart Suggestions
              {isLoading && (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Loader2 size={12} className="text-indigo-400" />
                </motion.div>
              )}
            </h3>
            <p className="text-[10px] text-zinc-500">
              AI-detected historically significant years missing from your timeline
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setIsDismissed(true); }}
            className="p-1 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            <X size={14} />
          </button>
          {isExpanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {isLoading && suggestions.length === 0 && (
                <div className="py-6 flex flex-col items-center gap-2 text-zinc-500">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  >
                    <Sparkles size={20} className="text-indigo-400" />
                  </motion.div>
                  <p className="text-xs">Analyzing your timeline for gaps...</p>
                </div>
              )}

              {suggestions.map((suggestion, i) => {
                const isAdded = addedYears.has(suggestion.year);
                return (
                  <motion.div
                    key={suggestion.year}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-3 px-3 py-3 rounded-lg border transition-all"
                    style={{
                      background: isAdded ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                      borderColor: isAdded ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div className="shrink-0">
                      <div className={`font-mono font-black text-sm px-2 py-1 rounded-md border ${
                        isAdded
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-zinc-800 border-zinc-700 text-amber-400'
                      }`}>
                        {suggestion.year}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 leading-relaxed">{suggestion.reason}</p>
                      <p className="text-[10px] text-zinc-600 mt-1 truncate italic">
                        "{suggestion.promptSuggestion.substring(0, 80)}..."
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddScene(suggestion)}
                      disabled={isAdded}
                      className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isAdded
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20'
                      }`}
                    >
                      {isAdded ? (
                        <><span>✓ Added</span></>
                      ) : (
                        <><Plus size={12} /> Add</>
                      )}
                    </button>
                  </motion.div>
                );
              })}

              {suggestions.length > 0 && !isLoading && (
                <button
                  onClick={fetchSuggestions}
                  className="w-full py-2 text-[10px] text-zinc-600 hover:text-indigo-400 transition-colors"
                >
                  Refresh suggestions
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

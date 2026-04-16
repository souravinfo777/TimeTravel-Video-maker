import React, { useState } from 'react';
import { ProjectTemplate, AppState } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ArrowRight } from 'lucide-react';

const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'suburban-house',
    name: 'Suburban House',
    icon: '🏡',
    description: 'Watch a quiet suburban home age over decades — from fresh paint to weathered charm.',
    startYear: 1950,
    endYear: 2024,
    numImages: 8,
    locationHint: 'Quiet suburban neighborhood, two-story family house with front yard',
    decayLevel: 35,
    charactersEnabled: true,
    numPeople: 2,
    characterNotes: 'A married couple aging through the decades',
  },
  {
    id: 'city-corner',
    name: 'City Corner',
    icon: '🌆',
    description: 'A bustling city intersection transforms across centuries of urbanization.',
    startYear: 1800,
    endYear: 2050,
    numImages: 12,
    locationHint: 'Major city intersection with commercial buildings, downtown',
    decayLevel: 45,
    charactersEnabled: true,
    numPeople: 5,
    characterNotes: 'Pedestrians dressed in era-appropriate clothing',
  },
  {
    id: 'rural-farmland',
    name: 'Rural Farmland',
    icon: '🌾',
    description: 'Rural farmland evolves from pastoral beauty to modern agriculture or abandonment.',
    startYear: 1900,
    endYear: 2000,
    numImages: 6,
    locationHint: 'Rolling farmland with a barn, wooden fences, and dirt road',
    decayLevel: 60,
    charactersEnabled: true,
    numPeople: 1,
    characterNotes: 'A farmer working the land',
  },
  {
    id: 'post-apocalyptic',
    name: 'Post-Apocalyptic',
    icon: '☢️',
    description: 'Civilization crumbles as nature reclaims the streets in a dystopian future.',
    startYear: 2024,
    endYear: 2100,
    numImages: 10,
    locationHint: 'Modern city street that gradually becomes overgrown and abandoned',
    decayLevel: 95,
    charactersEnabled: false,
    numPeople: 0,
    characterNotes: '',
  },
  {
    id: 'european-village',
    name: 'European Village',
    icon: '🏰',
    description: 'A charming European village square endures wars, prosperity, and modernization.',
    startYear: 1600,
    endYear: 2024,
    numImages: 10,
    locationHint: 'Cobblestone European village square with a church, fountain, and old buildings',
    decayLevel: 25,
    charactersEnabled: true,
    numPeople: 3,
    characterNotes: 'Villagers in period-appropriate dress',
  },
  {
    id: 'tropical-paradise',
    name: 'Tropical Paradise',
    icon: '🌴',
    description: 'A tropical beach evolves from pristine wilderness to a tourist destination.',
    startYear: 1950,
    endYear: 2050,
    numImages: 8,
    locationHint: 'Tropical beachfront with palm trees, crystal water, and a small village',
    decayLevel: 40,
    charactersEnabled: true,
    numPeople: 2,
    characterNotes: 'Local residents and later tourists',
  },
  {
    id: 'industrial-revolution',
    name: 'Industrial Zone',
    icon: '🏭',
    description: 'Watch an area transform from fields to factories to modern tech parks.',
    startYear: 1850,
    endYear: 2024,
    numImages: 10,
    locationHint: 'Industrial area with factories, smokestacks, and railway tracks',
    decayLevel: 50,
    charactersEnabled: true,
    numPeople: 4,
    characterNotes: 'Workers in era-appropriate attire',
  },
  {
    id: 'ancient-ruins',
    name: 'Ancient Ruins',
    icon: '🏛️',
    description: 'Grand ancient structures slowly crumble and get overgrown through millennia.',
    startYear: 100,
    endYear: 2024,
    numImages: 8,
    locationHint: 'Ancient Roman or Greek temple complex with columns and stone steps',
    decayLevel: 70,
    charactersEnabled: false,
    numPeople: 0,
    characterNotes: '',
  },
];

interface TemplateModalProps {
  onSelect: (updates: Partial<AppState>) => void;
  onClose: () => void;
}

export function TemplateModal({ onSelect, onClose }: TemplateModalProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSelect = (template: ProjectTemplate) => {
    onSelect({
      startYear: template.startYear,
      endYear: template.endYear,
      numImages: template.numImages,
      locationHint: template.locationHint,
      locationDescription: '',
      decayLevel: template.decayLevel,
      charactersEnabled: template.charactersEnabled,
      numPeople: template.numPeople,
      characterNotes: template.characterNotes,
      scenes: [],
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border overflow-hidden"
        style={{
          background: 'rgba(12, 12, 15, 0.95)',
          backdropFilter: 'blur(24px)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Sparkles size={18} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Project Templates</h2>
              <p className="text-xs text-zinc-500">Choose a starting point for your timeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEMPLATES.map((template, i) => (
              <motion.button
                key={template.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelect(template)}
                onMouseEnter={() => setHoveredId(template.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="text-left p-4 rounded-xl border transition-all group relative overflow-hidden"
                style={{
                  background: hoveredId === template.id
                    ? 'rgba(245, 158, 11, 0.06)'
                    : 'rgba(255, 255, 255, 0.02)',
                  borderColor: hoveredId === template.id
                    ? 'rgba(245, 158, 11, 0.25)'
                    : 'rgba(255, 255, 255, 0.06)',
                }}
              >
                {/* Icon + Name */}
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-2xl">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      {template.startYear} → {template.endYear} · {template.numImages} scenes
                    </p>
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-zinc-700 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all mt-1 shrink-0"
                  />
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                  {template.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700/50">
                    Decay: {template.decayLevel}%
                  </span>
                  {template.charactersEnabled && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700/50">
                      {template.numPeople} character{template.numPeople !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {template.endYear - template.startYear} years
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

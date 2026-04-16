import React, { useState, useEffect, useRef } from 'react';
import { Scene } from '../types';
import { motion } from 'motion/react';

interface TimelineScrubberProps {
  scenes: Scene[];
  activeIndex: number;
  onSceneClick: (index: number) => void;
}

export function TimelineScrubber({ scenes, activeIndex, onSceneClick }: TimelineScrubberProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (scenes.length === 0) return null;

  const minYear = scenes[0].year;
  const maxYear = scenes[scenes.length - 1].year;
  const yearRange = maxYear - minYear || 1;

  // Keep active scene in view
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const activeEl = container.querySelector(`[data-scene-index="${activeIndex}"]`) as HTMLElement;
      if (activeEl) {
        const containerRect = container.getBoundingClientRect();
        const elRect = activeEl.getBoundingClientRect();
        if (elRect.left < containerRect.left || elRect.right > containerRect.right) {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }
  }, [activeIndex]);

  return (
    <div
      className="sticky bottom-0 z-30 mx-auto w-full max-w-4xl"
      style={{
        background: 'linear-gradient(to top, rgba(9,9,11,0.98) 70%, transparent 100%)',
      }}
    >
      <div className="px-4 pt-4 pb-4">
        {/* Year range labels */}
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="text-[10px] font-mono font-bold text-zinc-600">{minYear}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
            <span className="w-4 h-px bg-zinc-700 inline-block" />
            Timeline
            <span className="w-4 h-px bg-zinc-700 inline-block" />
          </span>
          <span className="text-[10px] font-mono font-bold text-zinc-600">{maxYear}</span>
        </div>

        {/* Scrubber track */}
        <div
          ref={scrollRef}
          className="relative overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="relative min-w-full" style={{ height: '60px' }}>
            {/* Background track line */}
            <div
              className="absolute top-1/2 left-4 right-4 h-px -translate-y-1/2"
              style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.1), rgba(245,158,11,0.3), rgba(245,158,11,0.1))' }}
            />

            {/* Progress fill */}
            {activeIndex >= 0 && (
              <motion.div
                className="absolute top-1/2 left-4 h-0.5 -translate-y-1/2 rounded-full"
                style={{ background: 'linear-gradient(90deg, #d97706, #f59e0b)' }}
                animate={{
                  width: `${((activeIndex) / (scenes.length - 1 || 1)) * (100 - 4)}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            )}

            {/* Scene markers */}
            {scenes.map((scene, index) => {
              const position = scenes.length > 1
                ? 4 + ((scene.year - minYear) / yearRange) * (100 - 8)
                : 50;
              const isActive = index === activeIndex;
              const isHovered = index === hoveredIndex;

              return (
                <div
                  key={scene.id}
                  data-scene-index={index}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer group"
                  style={{ left: `${position}%` }}
                  onClick={() => onSceneClick(index)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Hover preview tooltip */}
                  {(isHovered || isActive) && scene.imageUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 pointer-events-none"
                    >
                      <div
                        className="rounded-lg overflow-hidden border shadow-xl"
                        style={{
                          borderColor: isActive ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)',
                          width: '120px',
                        }}
                      >
                        <img
                          src={scene.imageUrl}
                          alt={`Scene ${scene.year}`}
                          className="w-full h-16 object-cover"
                        />
                        <div className="bg-zinc-900 px-2 py-1 text-center">
                          <span className="text-[10px] font-mono font-bold text-amber-400">
                            {scene.year}
                          </span>
                        </div>
                      </div>
                      {/* Arrow */}
                      <div
                        className="w-2 h-2 bg-zinc-900 rotate-45 mx-auto -mt-1"
                        style={{ borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </motion.div>
                  )}

                  {/* Main dot/thumbnail */}
                  <motion.div
                    animate={{
                      scale: isActive ? 1.3 : isHovered ? 1.15 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    {scene.imageUrl ? (
                      <div
                        className="w-8 h-8 rounded-full overflow-hidden border-2 shadow-lg transition-all"
                        style={{
                          borderColor: isActive ? '#f59e0b' : isHovered ? 'rgba(245,158,11,0.5)' : 'rgba(63,63,70,0.8)',
                          boxShadow: isActive ? '0 0 12px rgba(245,158,11,0.4)' : 'none',
                        }}
                      >
                        <img
                          src={scene.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-3 h-3 rounded-full border-2 transition-all"
                        style={{
                          background: isActive ? '#f59e0b' : 'rgba(63,63,70,0.5)',
                          borderColor: isActive ? '#f59e0b' : isHovered ? 'rgba(245,158,11,0.5)' : 'rgba(63,63,70,0.8)',
                          boxShadow: isActive ? '0 0 8px rgba(245,158,11,0.4)' : 'none',
                        }}
                      />
                    )}
                  </motion.div>

                  {/* Year label below */}
                  <div className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-mono font-bold transition-colors ${
                    isActive ? 'text-amber-400' : isHovered ? 'text-zinc-300' : 'text-zinc-600'
                  }`}>
                    {scene.year}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

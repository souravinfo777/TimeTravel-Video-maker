import React, { useState, useEffect, useRef } from 'react';
import { LocationResult } from '../types';
import { searchLocations } from '../services/freeApis';
import { MapPin, Search, Loader2, X } from 'lucide-react';

interface LocationSearchProps {
  onSelect: (location: LocationResult) => void;
  selectedLocation?: LocationResult;
  onClear: () => void;
}

export function LocationSearch({ onSelect, selectedLocation, onClear }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const locs = await searchLocations(query);
        setResults(locs);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (loc: LocationResult) => {
    onSelect(loc);
    setQuery('');
    setShowDropdown(false);
    setResults([]);
  };

  if (selectedLocation) {
    return (
      <div className="flex items-start gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
        <MapPin size={16} className="text-emerald-400 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-emerald-300 font-medium truncate">{selectedLocation.displayName.split(',')[0]}</p>
          <p className="text-[11px] text-zinc-400 truncate">{selectedLocation.displayName}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">{selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}</p>
        </div>
        <button onClick={onClear} className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5" title="Clear location">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="Search any place worldwide..."
          className="w-full pl-9 pr-8 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-zinc-600"
        />
        {isSearching && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin" />
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
          {results.map((loc, i) => (
            <button
              key={`${loc.lat}-${loc.lon}-${i}`}
              onClick={() => handleSelect(loc)}
              className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0 flex items-start gap-2"
            >
              <MapPin size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{loc.displayName.split(',')[0]}</p>
                <p className="text-[11px] text-zinc-500 truncate">{loc.displayName}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && results.length === 0 && query.length >= 2 && !isSearching && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-3">
          <p className="text-xs text-zinc-500 text-center">No locations found</p>
        </div>
      )}
    </div>
  );
}

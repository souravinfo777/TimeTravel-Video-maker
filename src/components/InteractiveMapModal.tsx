import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Layers, Navigation, Search, MapPin, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InteractiveMapModalProps {
  locationHint: string;
  onClose: () => void;
  onLocationConfirm: (location: { lat: number; lng: number; name: string }) => void;
}

// We load Leaflet dynamically to avoid SSR issues and handle CSS
let L: any = null;

export function InteractiveMapModal({ locationHint, onClose, onLocationConfirm }: InteractiveMapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite' | 'topo'>('street');
  const [searchQuery, setSearchQuery] = useState(locationHint || '');
  const [isSearching, setIsSearching] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [searchError, setSearchError] = useState('');
  const tileLayerRef = useRef<any>(null);

  const tileLayers = {
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      label: 'Street'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '© Esri World Imagery',
      label: 'Satellite'
    },
    topo: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '© OpenTopoMap contributors',
      label: 'Topo'
    }
  };

  const initMap = useCallback(async () => {
    if (mapRef.current || !mapContainerRef.current) return;

    // Dynamically load Leaflet
    if (!L) {
      // Add Leaflet CSS
      if (!document.querySelector('#leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const leaflet = await import('leaflet');
      L = leaflet.default;
      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    }

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add tile layer
    tileLayerRef.current = L.tileLayer(tileLayers.street.url, {
      attribution: tileLayers.street.attribution,
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Click to pin
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      placeMarker(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    });

    setIsLoading(false);

    // Auto-geocode the initial location hint
    if (locationHint) {
      setTimeout(() => geocodeLocation(locationHint), 300);
    }
  }, [locationHint]);

  const placeMarker = (lat: number, lng: number, name: string) => {
    if (!mapRef.current || !L) return;

    // Custom amber pin icon
    const customIcon = L.divIcon({
      html: `
        <div class="map-pin-wrapper">
          <div class="map-pin-dot"></div>
          <div class="map-pin-ring"></div>
        </div>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    if (markerRef.current) {
      markerRef.current.remove();
    }
    markerRef.current = L.marker([lat, lng], { icon: customIcon })
      .addTo(mapRef.current)
      .bindPopup(`<div style="font-family:sans-serif;font-size:12px;color:#18181b;font-weight:600">${name}</div>`, {
        closeButton: false,
        className: 'custom-popup'
      })
      .openPopup();

    setPinnedLocation({ lat, lng, name });
  };

  const geocodeLocation = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lon);
        mapRef.current?.flyTo([parsedLat, parsedLng], 15, { duration: 1.5 });
        placeMarker(parsedLat, parsedLng, display_name.split(',').slice(0, 2).join(','));
      } else {
        setSearchError('Location not found. Try a different search term.');
      }
    } catch {
      setSearchError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const switchMapStyle = (style: 'street' | 'satellite' | 'topo') => {
    if (!mapRef.current || !L || style === mapStyle) return;
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    tileLayerRef.current = L.tileLayer(tileLayers[style].url, {
      attribution: tileLayers[style].attribution,
      maxZoom: 19,
    }).addTo(mapRef.current);
    setMapStyle(style);
  };

  const handleReset = () => {
    mapRef.current?.flyTo([20, 0], 2, { duration: 1.5 });
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    setPinnedLocation(null);
  };

  useEffect(() => {
    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.85)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <style>{`
          .map-pin-wrapper { position: relative; width: 32px; height: 32px; }
          .map-pin-dot { position: absolute; top: 4px; left: 4px; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; background: #f59e0b; transform: rotate(-45deg); box-shadow: 0 2px 10px rgba(245,158,11,0.6); }
          .map-pin-ring { position: absolute; top: 0; left: 0; width: 32px; height: 32px; border-radius: 50%; border: 2px solid rgba(245,158,11,0.4); animation: ping 1.5s ease-out infinite; }
          @keyframes ping { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(1.8); opacity: 0; } }
          .leaflet-container { background: #0f0f11; }
          .custom-popup .leaflet-popup-content-wrapper { background: rgba(24,24,27,0.95); color: #f4f4f5; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(12px); border-radius: 8px; }
          .custom-popup .leaflet-popup-tip { background: rgba(24,24,27,0.95); }
        `}</style>

        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-5xl h-[85vh] rounded-2xl overflow-hidden flex flex-col"
          style={{ background: 'rgba(9,9,11,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0"
            style={{ background: 'rgba(24,24,27,0.60)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <MapPin size={16} className="text-amber-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Interactive Location Map</h2>
                <p className="text-xs text-zinc-500">Click anywhere to pin a location, or search below</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-5 py-3 border-b border-white/5 shrink-0" style={{ background: 'rgba(24,24,27,0.40)' }}>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && geocodeLocation(searchQuery)}
                  placeholder="Search any location (e.g. Times Square, New York)…"
                  className="w-full pl-9 pr-4 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>
              <button
                onClick={() => geocodeLocation(searchQuery)}
                disabled={isSearching}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm rounded-lg shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSearching ? (
                  <span className="animate-spin text-xs">⏳</span>
                ) : (
                  <Navigation size={14} />
                )}
                {isSearching ? 'Searching…' : 'Go'}
              </button>
              <button onClick={handleReset} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Reset">
                <RotateCcw size={16} />
              </button>
            </div>
            {searchError && (
              <p className="text-red-400 text-xs mt-1.5 ml-1">{searchError}</p>
            )}
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950">
                <div className="text-center">
                  <div className="text-4xl mb-3 animate-pulse">🗺️</div>
                  <p className="text-zinc-400 text-sm">Loading map…</p>
                </div>
              </div>
            )}

            {/* Map Style Switcher */}
            <div className="absolute top-3 left-3 z-[400] flex gap-1 rounded-lg overflow-hidden"
              style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {(['street', 'satellite', 'topo'] as const).map(style => (
                <button
                  key={style}
                  onClick={() => switchMapStyle(style)}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all ${
                    mapStyle === style
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Layers size={11} className="inline mr-1" />
                  {tileLayers[style].label}
                </button>
              ))}
            </div>

            <div ref={mapContainerRef} className="w-full h-full" />
          </div>

          {/* Bottom Bar */}
          <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between shrink-0"
            style={{ background: 'rgba(24,24,27,0.70)', backdropFilter: 'blur(20px)' }}>
            <div className="text-xs text-zinc-500">
              {pinnedLocation ? (
                <span className="text-zinc-300">
                  📍 <span className="text-amber-400 font-medium">{pinnedLocation.name.substring(0, 50)}{pinnedLocation.name.length > 50 ? '…' : ''}</span>
                  <span className="ml-2 text-zinc-600">({pinnedLocation.lat.toFixed(4)}, {pinnedLocation.lng.toFixed(4)})</span>
                </span>
              ) : (
                'Click on the map to pin a location'
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { if (pinnedLocation) { onLocationConfirm(pinnedLocation); onClose(); } }}
                disabled={!pinnedLocation}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm rounded-lg shadow-lg shadow-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <MapPin size={14} />
                Use This Location
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import React, { useState, useRef } from 'react';
import { Scene, TransitionType, ExportPreset } from '../types';
import { X, Video, Download, Settings, Clock, MoveHorizontal, Wand2, Monitor, Smartphone, Twitter, Youtube } from 'lucide-react';
import { motion } from 'motion/react';
import { loadImage, drawSceneFrame, drawTransition, drawYearOverlay } from '../services/videoUtils';

interface VideoExportModalProps {
  scenes: Scene[];
  onClose: () => void;
}

const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶️',
    aspectRatio: '16:9',
    duration: 4,
    transition: 'fade',
    quality: '1080p',
    description: '16:9 · 1080p · 4s/scene · Fade',
  },
  {
    id: 'instagram',
    name: 'Instagram Reel',
    icon: '📸',
    aspectRatio: '9:16',
    duration: 3,
    transition: 'slide',
    quality: '1080p',
    description: '9:16 · 1080p · 3s/scene · Slide',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    aspectRatio: '9:16',
    duration: 2,
    transition: 'cut',
    quality: '720p',
    description: '9:16 · 720p · 2s/scene · Fast Cut',
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    icon: '𝕏',
    aspectRatio: '1:1',
    duration: 2,
    transition: 'fade',
    quality: '720p',
    description: '1:1 · 720p · 2s/scene · Fade',
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: '⚙️',
    aspectRatio: '16:9',
    duration: 3,
    transition: 'fade',
    quality: 'auto',
    description: 'Configure manually',
  },
];

const TRANSITION_OPTIONS: { type: TransitionType; label: string; description: string }[] = [
  { type: 'fade', label: 'FADE', description: 'Smooth crossfade' },
  { type: 'slide', label: 'SLIDE', description: 'Horizontal slide' },
  { type: 'cut', label: 'CUT', description: 'Instant switch' },
  { type: 'dissolve', label: 'DISSOLVE', description: 'Cinematic dissolve' },
  { type: 'wipe', label: 'WIPE', description: 'Diagonal reveal' },
  { type: 'zoom', label: 'ZOOM', description: 'Zoom through' },
  { type: 'filmreel', label: 'FILM', description: 'Classic flicker' },
];

export function VideoExportModal({ scenes, onClose }: VideoExportModalProps) {
  const [duration, setDuration] = useState(3);
  const [transition, setTransition] = useState<TransitionType>('fade');
  const [useKenBurns, setUseKenBurns] = useState(true);
  const [useVintageFilters, setUseVintageFilters] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [exportMimeType, setExportMimeType] = useState('video/mp4');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chunksRef = useRef<Blob[]>([]);

  const imagesWithUrls = scenes.filter(s => s.imageUrl);

  const handlePresetSelect = (preset: ExportPreset) => {
    setSelectedPreset(preset.id);
    if (preset.id !== 'custom') {
      setDuration(preset.duration);
      setTransition(preset.transition);
    }
  };

  const getSupportedMimeType = () => {
    const types = [
      'video/mp4;codecs=h264',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'video/webm';
  };

  const startExport = async () => {
    if (!canvasRef.current || imagesWithUrls.length === 0) return;

    setIsExporting(true);
    setProgress(0);
    setVideoUrl(null);
    chunksRef.current = [];

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const firstImg = await loadImage(imagesWithUrls[0].imageUrl!);
    canvas.width = firstImg.width;
    canvas.height = firstImg.height;

    const mimeType = getSupportedMimeType();
    setExportMimeType(mimeType);

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 15000000
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsExporting(false);
    };

    recorder.start();

    const fps = 30;
    const totalFramesPerImage = duration * fps;
    const transitionFrames = transition === 'cut' ? 0 : Math.min(fps, totalFramesPerImage / 2);
    
    for (let i = 0; i < imagesWithUrls.length; i++) {
      const currentImg = await loadImage(imagesWithUrls[i].imageUrl!);
      const nextImg = i < imagesWithUrls.length - 1 ? await loadImage(imagesWithUrls[i + 1].imageUrl!) : null;

      for (let frame = 0; frame < totalFramesPerImage; frame++) {
        // Draw the main scene frame
        drawSceneFrame(ctx, currentImg, frame, totalFramesPerImage, {
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          useKenBurns,
          useVintageFilters,
          year: imagesWithUrls[i].year,
          sceneIndex: i,
        });

        // Handle transitions
        if (nextImg && frame >= totalFramesPerImage - transitionFrames) {
          const t = (frame - (totalFramesPerImage - transitionFrames)) / transitionFrames;
          drawTransition(ctx, currentImg, nextImg, t, transition, {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            useVintageFilters,
            useKenBurns,
            nextYear: imagesWithUrls[i + 1].year,
            nextSceneIndex: i + 1,
          });
        }

        // Draw year overlay
        drawYearOverlay(ctx, imagesWithUrls[i].year, canvas.width, canvas.height);

        setProgress(Math.round(((i * totalFramesPerImage + frame) / (imagesWithUrls.length * totalFramesPerImage)) * 100));
        
        await new Promise(resolve => setTimeout(resolve, 1000 / fps));
      }
    }

    recorder.stop();
  };

  const getFileExtension = () => {
    if (exportMimeType.includes('mp4')) return 'mp4';
    return 'webm';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Video className="text-amber-500" size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Export Video</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!videoUrl && !isExporting && (
            <>
              {/* Export Presets */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <Monitor size={16} className="text-zinc-500" /> Quick Presets
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {EXPORT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className={`flex flex-col items-center gap-1 py-2.5 px-1 text-xs rounded-lg border transition-all ${
                        selectedPreset === preset.id
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                          : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                      }`}
                    >
                      <span className="text-base">{preset.icon}</span>
                      <span className="font-bold text-[10px] leading-tight text-center">{preset.name}</span>
                    </button>
                  ))}
                </div>
                {selectedPreset && selectedPreset !== 'custom' && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] text-amber-400/60 text-center font-mono"
                  >
                    {EXPORT_PRESETS.find(p => p.id === selectedPreset)?.description}
                  </motion.p>
                )}
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                    <Clock size={16} className="text-zinc-500" /> Duration per image
                  </label>
                  <span className="text-amber-500 font-mono font-bold">{duration}s</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={duration} 
                  onChange={(e) => { setDuration(parseInt(e.target.value)); setSelectedPreset('custom'); }}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Transition Type — expanded grid */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <MoveHorizontal size={16} className="text-zinc-500" /> Transition Type
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {TRANSITION_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => { setTransition(opt.type); setSelectedPreset('custom'); }}
                      className={`py-2 px-1 text-center rounded-lg border transition-all ${
                        transition === opt.type 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-500' 
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600'
                      }`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-wider">{opt.label}</div>
                      <div className="text-[8px] text-zinc-600 mt-0.5">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* VFX */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <Wand2 size={16} className="text-zinc-500" /> Cinematic VFX
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={useKenBurns} onChange={e => setUseKenBurns(e.target.checked)} className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer" />
                    <div>
                      <div className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">Ken Burns Effect</div>
                      <div className="text-xs text-zinc-500">Slow dynamic zoom and pan</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={useVintageFilters} onChange={e => setUseVintageFilters(e.target.checked)} className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer" />
                    <div>
                      <div className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">Historical Film Filters</div>
                      <div className="text-xs text-zinc-500">Auto-applies Sepia, Grain, B&W based on year</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Quality info */}
              <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Quality Settings</p>
                <p className="text-xs text-zinc-400">High Bitrate (15Mbps) · {imagesWithUrls[0]?.imageUrl ? 'Original Resolution' : 'Auto'}</p>
              </div>

              <button 
                onClick={startExport}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Video size={18} /> Start Export
              </button>
            </>
          )}

          {isExporting && (
            <div className="py-8 flex flex-col items-center justify-center space-y-6">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" stroke="#27272a" strokeWidth="8" 
                  />
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" stroke="#f59e0b" strokeWidth="8" 
                    strokeDasharray={`${progress * 2.82} 282`}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-white">
                  {progress}%
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Generating High Quality Video...</p>
                <p className="text-zinc-500 text-sm mt-1">Please keep this tab active</p>
              </div>
            </div>
          )}

          {videoUrl && (
            <div className="space-y-6">
              <div className="aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800">
                <video src={videoUrl} controls className="w-full h-full" />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => { setVideoUrl(null); setProgress(0); }}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
                >
                  Reset
                </button>
                <a 
                  href={videoUrl} 
                  download={`timelapse-video.${getFileExtension()}`}
                  className="flex-[2] py-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Download size={18} /> Download .{getFileExtension().toUpperCase()}
                </a>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Scene } from '../types';
import { X, Video, Download, Loader2, Settings, Clock, MoveHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VideoExportModalProps {
  scenes: Scene[];
  onClose: () => void;
}

type TransitionType = 'fade' | 'slide' | 'cut';

export function VideoExportModal({ scenes, onClose }: VideoExportModalProps) {
  const [duration, setDuration] = useState(3);
  const [transition, setTransition] = useState<TransitionType>('fade');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [exportMimeType, setExportMimeType] = useState('video/mp4');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const imagesWithUrls = scenes.filter(s => s.imageUrl);

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
    const ctx = canvas.getContext('2d', { alpha: false }); // Disable alpha for better performance/quality
    if (!ctx) return;

    // Set canvas size based on first image or default
    const firstImg = await loadImage(imagesWithUrls[0].imageUrl!);
    canvas.width = firstImg.width;
    canvas.height = firstImg.height;

    const mimeType = getSupportedMimeType();
    setExportMimeType(mimeType);

    const stream = canvas.captureStream(30); // 30 FPS
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 15000000 // 15 Mbps for "best quality"
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
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw current image
        ctx.globalAlpha = 1;
        ctx.drawImage(currentImg, 0, 0, canvas.width, canvas.height);

        // Handle transitions
        if (nextImg && frame >= totalFramesPerImage - transitionFrames) {
          const t = (frame - (totalFramesPerImage - transitionFrames)) / transitionFrames;
          
          if (transition === 'fade') {
            ctx.globalAlpha = t;
            ctx.drawImage(nextImg, 0, 0, canvas.width, canvas.height);
          } else if (transition === 'slide') {
            ctx.globalAlpha = 1;
            ctx.drawImage(currentImg, -t * canvas.width, 0, canvas.width, canvas.height);
            ctx.drawImage(nextImg, canvas.width - t * canvas.width, 0, canvas.width, canvas.height);
          }
        }

        // Add Year Text Overlay - High Quality
        ctx.globalAlpha = 1;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(40, 40, 160, 60, 10);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#f59e0b'; // amber-500
        ctx.font = 'bold 36px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(imagesWithUrls[i].year.toString(), 120, 70);

        setProgress(Math.round(((i * totalFramesPerImage + frame) / (imagesWithUrls.length * totalFramesPerImage)) * 100));
        
        // Wait for next frame
        await new Promise(resolve => setTimeout(resolve, 1000 / fps));
      }
    }

    recorder.stop();
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
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
        className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
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
              <div className="space-y-4">
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
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <MoveHorizontal size={16} className="text-zinc-500" /> Transition Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['fade', 'slide', 'cut'] as TransitionType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTransition(type)}
                      className={`py-2 text-xs font-bold uppercase tracking-wider rounded-md border transition-all ${
                        transition === type 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-500' 
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Quality Settings</p>
                <p className="text-xs text-zinc-400">High Bitrate (15Mbps) • {imagesWithUrls[0]?.imageUrl ? 'Original Resolution' : 'Auto'}</p>
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

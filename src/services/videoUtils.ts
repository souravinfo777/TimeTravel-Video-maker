import { TransitionType } from '../types';

/**
 * Get vintage CSS filter string based on the year
 */
export function getVintageFilter(year: number): string {
  if (year < 1900) return 'sepia(80%) contrast(1.2) brightness(0.9) grayscale(20%)';
  if (year < 1960) return 'grayscale(100%) contrast(1.1)';
  if (year < 1980) return 'sepia(30%) saturate(70%)';
  if (year < 2000) return 'saturate(90%) contrast(1.05)';
  return 'none';
}

/**
 * Draw a single scene frame with Ken Burns effect and optional vintage filter
 */
export function drawSceneFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frame: number,
  totalFrames: number,
  options: {
    canvasWidth: number;
    canvasHeight: number;
    useKenBurns: boolean;
    useVintageFilters: boolean;
    year: number;
    sceneIndex: number;
  }
) {
  const { canvasWidth, canvasHeight, useKenBurns, useVintageFilters, year, sceneIndex } = options;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Apply vintage filter
  ctx.filter = 'none';
  if (useVintageFilters) {
    ctx.filter = getVintageFilter(year);
  }

  // Ken Burns effect
  ctx.save();
  ctx.globalAlpha = 1;

  if (useKenBurns) {
    const progress = frame / totalFrames;
    const zoomIn = sceneIndex % 2 === 0;
    const scale = zoomIn ? 1 + (progress * 0.15) : 1.15 - (progress * 0.15);
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.scale(scale, scale);
    ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
  }

  ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
  ctx.restore();
}

/**
 * Draw transition between two images
 */
export function drawTransition(
  ctx: CanvasRenderingContext2D,
  currentImg: HTMLImageElement,
  nextImg: HTMLImageElement,
  progress: number,
  type: TransitionType,
  options: {
    canvasWidth: number;
    canvasHeight: number;
    useVintageFilters: boolean;
    useKenBurns: boolean;
    nextYear: number;
    nextSceneIndex: number;
  }
) {
  const { canvasWidth, canvasHeight, useVintageFilters, useKenBurns, nextYear, nextSceneIndex } = options;

  ctx.save();

  switch (type) {
    case 'fade': {
      ctx.globalAlpha = progress;
      if (useVintageFilters) ctx.filter = getVintageFilter(nextYear);
      if (useKenBurns) {
        const zoomIn = nextSceneIndex % 2 === 0;
        const nextScale = zoomIn ? 1 : 1.15;
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(nextScale, nextScale);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
      }
      ctx.drawImage(nextImg, 0, 0, canvasWidth, canvasHeight);
      break;
    }

    case 'slide': {
      ctx.globalAlpha = 1;
      ctx.drawImage(currentImg, -progress * canvasWidth, 0, canvasWidth, canvasHeight);
      ctx.drawImage(nextImg, canvasWidth - progress * canvasWidth, 0, canvasWidth, canvasHeight);
      break;
    }

    case 'dissolve': {
      // Crossfade with brightness warp for a cinematic dissolve
      ctx.globalAlpha = progress;
      ctx.filter = `brightness(${1 + Math.sin(progress * Math.PI) * 0.3})`;
      if (useVintageFilters) {
        const vintageFilter = getVintageFilter(nextYear);
        if (vintageFilter !== 'none') {
          ctx.filter += ` ${vintageFilter}`;
        }
      }
      ctx.drawImage(nextImg, 0, 0, canvasWidth, canvasHeight);
      break;
    }

    case 'wipe': {
      // Diagonal wipe from left to right
      const wipeX = progress * (canvasWidth + canvasHeight * 0.3);
      ctx.beginPath();
      ctx.moveTo(wipeX, 0);
      ctx.lineTo(wipeX - canvasHeight * 0.3, canvasHeight);
      ctx.lineTo(canvasWidth + 10, canvasHeight);
      ctx.lineTo(canvasWidth + 10, 0);
      ctx.closePath();
      ctx.clip();
      if (useVintageFilters) ctx.filter = getVintageFilter(nextYear);
      ctx.drawImage(nextImg, 0, 0, canvasWidth, canvasHeight);
      break;
    }

    case 'zoom': {
      // Zoom into the center of old image, zoom out from new
      const halfProgress = progress < 0.5 ? progress * 2 : (progress - 0.5) * 2;
      if (progress < 0.5) {
        // Zoom into current image
        const scale = 1 + halfProgress * 2;
        ctx.globalAlpha = 1 - halfProgress;
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(scale, scale);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        ctx.drawImage(currentImg, 0, 0, canvasWidth, canvasHeight);
      } else {
        // Zoom out from next image
        const scale = 3 - halfProgress * 2;
        ctx.globalAlpha = halfProgress;
        if (useVintageFilters) ctx.filter = getVintageFilter(nextYear);
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(scale, scale);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        ctx.drawImage(nextImg, 0, 0, canvasWidth, canvasHeight);
      }
      break;
    }

    case 'filmreel': {
      // Rapid black frame flicker between scenes
      const flickerPhase = Math.floor(progress * 8);
      if (flickerPhase % 2 === 0) {
        // Black frame
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        // Add film grain noise
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 200; i++) {
          const x = Math.random() * canvasWidth;
          const y = Math.random() * canvasHeight;
          const size = Math.random() * 3 + 1;
          ctx.fillStyle = Math.random() > 0.5 ? '#333' : '#111';
          ctx.fillRect(x, y, size, size);
        }
      } else {
        ctx.globalAlpha = 0.4 + progress * 0.6;
        if (useVintageFilters) ctx.filter = getVintageFilter(nextYear);
        ctx.drawImage(nextImg, 0, 0, canvasWidth, canvasHeight);
        // Add scanlines
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#000';
        for (let y = 0; y < canvasHeight; y += 3) {
          ctx.fillRect(0, y, canvasWidth, 1);
        }
      }
      break;
    }

    case 'cut':
    default:
      break;
  }

  ctx.restore();
}

/**
 * Draw year text overlay on the canvas
 */
export function drawYearOverlay(
  ctx: CanvasRenderingContext2D,
  year: number,
  _canvasWidth: number,
  _canvasHeight: number
) {
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.roundRect(40, 40, 160, 60, 10);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 36px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(year.toString(), 120, 70);
}

/**
 * Load an image from a URL and return a promise
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

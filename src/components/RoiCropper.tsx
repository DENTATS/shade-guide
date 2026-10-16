/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Scan,
  Sparkles,
} from 'lucide-react';
import { RoiBounds } from '../types/dental';

interface RoiCropperProps {
  imageSrc: string;
  onCropComplete: (canvas: HTMLCanvasElement, roi: RoiBounds) => void;
  isProcessing?: boolean;
}

export const RoiCropper: React.FC<RoiCropperProps> = ({
  imageSrc,
  onCropComplete,
  isProcessing = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Normalized ROI (0..1 coordinates relative to image natural dimensions)
  const [roiNorm, setRoiNorm] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0.35,
    y: 0.3,
    w: 0.3,
    h: 0.35,
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startRoi: typeof roiNorm }>({
    clientX: 0,
    clientY: 0,
    startRoi: { x: 0, y: 0, w: 0, h: 0 },
  });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
      // Default to center middle-third crop
      setRoiNorm({
        x: 0.35,
        y: 0.35,
        w: 0.3,
        h: 0.3,
      });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Render on internal canvas when rotation or image changes
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Handle rotation dimensions
    const isTransposed = rotation === 90 || rotation === 270;
    const w = isTransposed ? img.naturalHeight : img.naturalWidth;
    const h = isTransposed ? img.naturalWidth : img.naturalHeight;

    canvas.width = w;
    canvas.height = h;

    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  }, [rotation]);

  useEffect(() => {
    if (imageLoaded) {
      redrawCanvas();
    }
  }, [imageLoaded, redrawCanvas]);

  // Preset tooth thirds (standard dental clinical protocol)
  const applyPresetZone = (zone: 'body' | 'incisal' | 'cervical' | 'full') => {
    if (zone === 'body') {
      // Middle third of tooth - recommended for shade guide matching
      setRoiNorm({ x: 0.35, y: 0.38, w: 0.3, h: 0.28 });
    } else if (zone === 'incisal') {
      setRoiNorm({ x: 0.35, y: 0.15, w: 0.3, h: 0.22 });
    } else if (zone === 'cervical') {
      setRoiNorm({ x: 0.35, y: 0.65, w: 0.3, h: 0.22 });
    } else {
      setRoiNorm({ x: 0.2, y: 0.15, w: 0.6, h: 0.7 });
    }
  };

  const handlePointerDown = (e: React.PointerEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragHandle(handle);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startRoi: { ...roiNorm },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragHandle || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragStartRef.current.clientX) / rect.width;
    const dy = (e.clientY - dragStartRef.current.clientY) / rect.height;

    const start = dragStartRef.current.startRoi;
    let next = { ...start };

    const minSize = 0.05;

    if (dragHandle === 'move') {
      next.x = Math.max(0, Math.min(1 - start.w, start.x + dx));
      next.y = Math.max(0, Math.min(1 - start.h, start.y + dy));
    } else if (dragHandle === 'nw') {
      const newX = Math.max(0, Math.min(start.x + start.w - minSize, start.x + dx));
      const newY = Math.max(0, Math.min(start.y + start.h - minSize, start.y + dy));
      next.w = start.w + (start.x - newX);
      next.h = start.h + (start.y - newY);
      next.x = newX;
      next.y = newY;
    } else if (dragHandle === 'ne') {
      const newY = Math.max(0, Math.min(start.y + start.h - minSize, start.y + dy));
      next.w = Math.max(minSize, Math.min(1 - start.x, start.w + dx));
      next.h = start.h + (start.y - newY);
      next.y = newY;
    } else if (dragHandle === 'sw') {
      const newX = Math.max(0, Math.min(start.x + start.w - minSize, start.x + dx));
      next.w = start.w + (start.x - newX);
      next.h = Math.max(minSize, Math.min(1 - start.y, start.h + dy));
      next.x = newX;
    } else if (dragHandle === 'se') {
      next.w = Math.max(minSize, Math.min(1 - start.x, start.w + dx));
      next.h = Math.max(minSize, Math.min(1 - start.y, start.h + dy));
    }

    setRoiNorm(next);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragHandle(null);
  };

  const handleTriggerAnalysis = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const roiPx: RoiBounds = {
      x: Math.round(roiNorm.x * canvas.width),
      y: Math.round(roiNorm.y * canvas.height),
      width: Math.max(5, Math.round(roiNorm.w * canvas.width)),
      height: Math.max(5, Math.round(roiNorm.h * canvas.height)),
    };

    onCropComplete(canvas, roiPx);
  };

  const canvas = canvasRef.current;
  const pixelDimensions = canvas
    ? {
        w: Math.round(roiNorm.w * canvas.width),
        h: Math.round(roiNorm.h * canvas.height),
      }
    : { w: 0, h: 0 };

  return (
    <div className="flex flex-col bg-slate-900/90 rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-800/90 border-b border-slate-700 text-slate-200 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-teal-400 flex items-center gap-1">
            <Scan className="w-4 h-4" /> Region of Interest (ROI)
          </span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-300 font-mono">
            {pixelDimensions.w} × {pixelDimensions.h} px
          </span>
        </div>

        {/* Quick Clinical Presets */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-700">
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider px-1">
            Zone:
          </span>
          <button
            type="button"
            onClick={() => applyPresetZone('body')}
            className="px-2 py-0.5 rounded text-[11px] font-medium bg-teal-600/30 text-teal-300 hover:bg-teal-600/50 transition-colors"
            title="Middle third of tooth crown (Standard clinical reference zone)"
          >
            Body (Middle 1/3)
          </button>
          <button
            type="button"
            onClick={() => applyPresetZone('incisal')}
            className="px-1.5 py-0.5 rounded text-[11px] text-slate-300 hover:bg-slate-700 transition-colors"
            title="Incisal third (translucent enamel region)"
          >
            Incisal
          </button>
          <button
            type="button"
            onClick={() => applyPresetZone('cervical')}
            className="px-1.5 py-0.5 rounded text-[11px] text-slate-300 hover:bg-slate-700 transition-colors"
            title="Cervical third (gingival margin zone)"
          >
            Cervical
          </button>
          <button
            type="button"
            onClick={() => applyPresetZone('full')}
            className="px-1.5 py-0.5 rounded text-[11px] text-slate-300 hover:bg-slate-700 transition-colors"
            title="Full tooth crown"
          >
            Full
          </button>
        </div>

        {/* Image Transform Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
            className="p-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-600 text-slate-200 transition-colors"
            title="Rotate Left 90°"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-600 text-slate-200 transition-colors"
            title="Rotate Right 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
            className="p-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-600 text-slate-200 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.2).toFixed(1))))}
            className="p-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-600 text-slate-200 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-600 text-slate-200 transition-colors"
            title="Reset Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Crop Viewport */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full h-[360px] sm:h-[460px] flex items-center justify-center overflow-hidden bg-slate-950 select-none cursor-crosshair"
        style={{ touchAction: 'none' }}
      >
        {/* Hidden high-res canvas holding actual transformed pixel data */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Display Image with transform */}
        {imageLoaded && (
          <div
            className="relative transition-transform duration-75"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            <img
              src={imageSrc}
              alt="Target tooth capture"
              className="max-h-[340px] sm:max-h-[440px] w-auto object-contain pointer-events-none rounded"
            />
          </div>
        )}

        {/* Overlay Crop Box (placed in normalized container coords) */}
        {imageLoaded && (
          <div
            className="absolute border-2 border-teal-400 bg-teal-400/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] rounded-sm pointer-events-auto"
            style={{
              left: `${roiNorm.x * 100}%`,
              top: `${roiNorm.y * 100}%`,
              width: `${roiNorm.w * 100}%`,
              height: `${roiNorm.h * 100}%`,
            }}
          >
            {/* Center drag handle */}
            <div
              onPointerDown={(e) => handlePointerDown(e, 'move')}
              className="w-full h-full cursor-move flex items-center justify-center"
            >
              <div className="bg-slate-900/80 text-teal-300 text-[10px] font-mono px-2 py-0.5 rounded shadow pointer-events-none backdrop-blur-sm border border-teal-500/40">
                Drag to position
              </div>
            </div>

            {/* Corner resize handles */}
            <div
              onPointerDown={(e) => handlePointerDown(e, 'nw')}
              className="absolute -top-2 -left-2 w-4 h-4 bg-teal-400 border-2 border-slate-900 rounded-full cursor-nwse-resize shadow-md"
            />
            <div
              onPointerDown={(e) => handlePointerDown(e, 'ne')}
              className="absolute -top-2 -right-2 w-4 h-4 bg-teal-400 border-2 border-slate-900 rounded-full cursor-nesw-resize shadow-md"
            />
            <div
              onPointerDown={(e) => handlePointerDown(e, 'sw')}
              className="absolute -bottom-2 -left-2 w-4 h-4 bg-teal-400 border-2 border-slate-900 rounded-full cursor-nesw-resize shadow-md"
            />
            <div
              onPointerDown={(e) => handlePointerDown(e, 'se')}
              className="absolute -bottom-2 -right-2 w-4 h-4 bg-teal-400 border-2 border-slate-900 rounded-full cursor-nwse-resize shadow-md"
            />

            {/* Rule of thirds grid inside crop box */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
              <div className="border-r border-b border-teal-300 border-dashed" />
              <div className="border-r border-b border-teal-300 border-dashed" />
              <div className="border-b border-teal-300 border-dashed" />
              <div className="border-r border-b border-teal-300 border-dashed" />
              <div className="border-r border-b border-teal-300 border-dashed" />
              <div className="border-b border-teal-300 border-dashed" />
              <div className="border-r border-teal-300 border-dashed" />
              <div className="border-r border-teal-300 border-dashed" />
              <div />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-3 bg-slate-800/90 border-t border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-300 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
          <span>Isolate tooth enamel without lip, gingiva, or specular glare reflections</span>
        </div>

        <button
          type="button"
          onClick={handleTriggerAnalysis}
          disabled={isProcessing}
          className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 active:scale-[0.98] text-white font-medium rounded-xl shadow-lg shadow-teal-900/30 transition-all disabled:opacity-50 text-sm cursor-pointer"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Extracting CIELAB Features...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-teal-200" />
              Analyse Selected Region
            </>
          )}
        </button>
      </div>
    </div>
  );
};

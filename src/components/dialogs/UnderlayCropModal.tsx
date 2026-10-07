/**
 * Underlay Crop Modal
 * Allows interactive, touch- and pencil-friendly cropping of the background template image.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Crop, X, Check, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { BackgroundImage, BackgroundImageCrop } from '../../types/cad';

interface UnderlayCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  backgroundImage?: BackgroundImage;
  onApplyCrop: (crop?: BackgroundImageCrop) => void;
}

export const UnderlayCropModal: React.FC<UnderlayCropModalProps> = ({
  isOpen,
  onClose,
  backgroundImage,
  onApplyCrop,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [crop, setCrop] = useState<BackgroundImageCrop>({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<string | null>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; initialCrop: BackgroundImageCrop } | null>(null);

  // Initialize or reset crop from backgroundImage
  useEffect(() => {
    if (!isOpen || !backgroundImage?.url) return;

    const sourceUrl = backgroundImage.originalUrl || backgroundImage.url;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgElement(img);
      if (backgroundImage.crop) {
        setCrop({ ...backgroundImage.crop });
      } else {
        setCrop({ x: 0, y: 0, width: 1, height: 1 });
      }
    };
    img.src = sourceUrl;
  }, [isOpen, backgroundImage]);

  // Draw canvas with image and interactive crop overlay
  useEffect(() => {
    if (!isOpen || !imgElement) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size canvas to image natural dimensions or scaled to max 1200
    const maxDim = 1000;
    const natW = imgElement.naturalWidth || 800;
    const natH = imgElement.naturalHeight || 600;
    const scale = Math.min(1, maxDim / Math.max(natW, natH));

    const drawW = Math.round(natW * scale);
    const drawH = Math.round(natH * scale);

    if (canvas.width !== drawW || canvas.height !== drawH) {
      canvas.width = drawW;
      canvas.height = drawH;
    }

    ctx.clearRect(0, 0, drawW, drawH);

    // 1. Draw base image
    ctx.drawImage(imgElement, 0, 0, drawW, drawH);

    // 2. Dark translucent mask outside crop area
    const cx = Math.max(0, Math.min(drawW, crop.x * drawW));
    const cy = Math.max(0, Math.min(drawH, crop.y * drawH));
    const cw = Math.max(10, Math.min(drawW - cx, crop.width * drawW));
    const ch = Math.max(10, Math.min(drawH - cy, crop.height * drawH));

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    // Top
    ctx.fillRect(0, 0, drawW, cy);
    // Bottom
    ctx.fillRect(0, cy + ch, drawW, drawH - (cy + ch));
    // Left
    ctx.fillRect(0, cy, cx, ch);
    // Right
    ctx.fillRect(cx + cw, cy, drawW - (cx + cw), ch);

    // 3. Crop outline & Rule-of-thirds grid
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(cx, cy, cw, ch);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // vertical grid lines
    ctx.moveTo(cx + cw / 3, cy);
    ctx.lineTo(cx + cw / 3, cy + ch);
    ctx.moveTo(cx + (cw * 2) / 3, cy);
    ctx.lineTo(cx + (cw * 2) / 3, cy + ch);
    // horizontal grid lines
    ctx.moveTo(cx, cy + ch / 3);
    ctx.lineTo(cx + cw, cy + ch / 3);
    ctx.moveTo(cx, cy + (ch * 2) / 3);
    ctx.lineTo(cx + cw, cy + (ch * 2) / 3);
    ctx.stroke();

    // 4. Handles: 4 corners + 4 edges
    const handles = [
      { id: 'nw', x: cx, y: cy },
      { id: 'ne', x: cx + cw, y: cy },
      { id: 'se', x: cx + cw, y: cy + ch },
      { id: 'sw', x: cx, y: cy + ch },
      { id: 'n', x: cx + cw / 2, y: cy },
      { id: 's', x: cx + cw / 2, y: cy + ch },
      { id: 'w', x: cx, y: cy + ch / 2 },
      { id: 'e', x: cx + cw, y: cy + ch / 2 },
    ];

    for (const h of handles) {
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, [isOpen, imgElement, crop]);

  // Pointer interactions for dragging handles or moving crop box
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}

    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const cx = crop.x * canvas.width;
    const cy = crop.y * canvas.height;
    const cw = crop.width * canvas.width;
    const ch = crop.height * canvas.height;

    // Check corner/edge handles (hit radius 24px for great touch hitability)
    const hitRadius = 24;
    const handles = [
      { id: 'nw', x: cx, y: cy },
      { id: 'ne', x: cx + cw, y: cy },
      { id: 'se', x: cx + cw, y: cy + ch },
      { id: 'sw', x: cx, y: cy + ch },
      { id: 'n', x: cx + cw / 2, y: cy },
      { id: 's', x: cx + cw / 2, y: cy + ch },
      { id: 'w', x: cx, y: cy + ch / 2 },
      { id: 'e', x: cx + cw, y: cy + ch / 2 },
    ];

    for (const h of handles) {
      if (Math.hypot(px - h.x, py - h.y) <= hitRadius) {
        setDraggingHandle(h.id);
        dragStartRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          initialCrop: { ...crop },
        };
        return;
      }
    }

    // Inside crop box -> move whole box
    if (px >= cx && px <= cx + cw && py >= cy && py <= cy + ch) {
      setDraggingHandle('move');
      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        initialCrop: { ...crop },
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingHandle || !dragStartRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - dragStartRef.current.clientX) / rect.width;
    const dy = (e.clientY - dragStartRef.current.clientY) / rect.height;

    const init = dragStartRef.current.initialCrop;
    const next = { ...init };

    if (draggingHandle === 'move') {
      next.x = Math.max(0, Math.min(1 - next.width, init.x + dx));
      next.y = Math.max(0, Math.min(1 - next.height, init.y + dy));
    } else if (draggingHandle === 'nw') {
      const newX = Math.max(0, Math.min(init.x + init.width - 0.05, init.x + dx));
      const newY = Math.max(0, Math.min(init.y + init.height - 0.05, init.y + dy));
      next.width = init.width + (init.x - newX);
      next.height = init.height + (init.y - newY);
      next.x = newX;
      next.y = newY;
    } else if (draggingHandle === 'ne') {
      const newY = Math.max(0, Math.min(init.y + init.height - 0.05, init.y + dy));
      next.width = Math.max(0.05, Math.min(1 - init.x, init.width + dx));
      next.height = init.height + (init.y - newY);
      next.y = newY;
    } else if (draggingHandle === 'se') {
      next.width = Math.max(0.05, Math.min(1 - init.x, init.width + dx));
      next.height = Math.max(0.05, Math.min(1 - init.y, init.height + dy));
    } else if (draggingHandle === 'sw') {
      const newX = Math.max(0, Math.min(init.x + init.width - 0.05, init.x + dx));
      next.width = init.width + (init.x - newX);
      next.height = Math.max(0.05, Math.min(1 - init.y, init.height + dy));
      next.x = newX;
    } else if (draggingHandle === 'n') {
      const newY = Math.max(0, Math.min(init.y + init.height - 0.05, init.y + dy));
      next.height = init.height + (init.y - newY);
      next.y = newY;
    } else if (draggingHandle === 's') {
      next.height = Math.max(0.05, Math.min(1 - init.y, init.height + dy));
    } else if (draggingHandle === 'w') {
      const newX = Math.max(0, Math.min(init.x + init.width - 0.05, init.x + dx));
      next.width = init.width + (init.x - newX);
      next.x = newX;
    } else if (draggingHandle === 'e') {
      next.width = Math.max(0.05, Math.min(1 - init.x, init.width + dx));
    }

    setCrop(next);
  };

  const handlePointerUp = () => {
    setDraggingHandle(null);
    dragStartRef.current = null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-stone-900 border border-stone-700/80 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col text-stone-100 overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-stone-800 bg-stone-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Plan-Vorlage zuschneiden</h2>
              <p className="text-[11px] text-stone-400">
                Ziehen Sie die Ecken und Kanten, um Planköpfe, Ränder oder Nachbarräume abzuschneiden.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Body */}
        <div className="flex-1 bg-stone-950 flex items-center justify-center p-4 overflow-auto relative select-none">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="max-h-[62vh] max-w-full object-contain rounded-lg shadow-xl border border-stone-800 cursor-crosshair touch-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => setCrop({ x: 0, y: 0, width: 1, height: 1 })}
            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Volles Bild (Zurücksetzen)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              onClick={() => {
                if (crop.width >= 0.99 && crop.height >= 0.99 && crop.x <= 0.01 && crop.y <= 0.01) {
                  onApplyCrop(undefined); // full image
                } else {
                  onApplyCrop(crop);
                }
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Zuschnitt übernehmen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

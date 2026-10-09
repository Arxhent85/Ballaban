/**
 * Architectural Image Ingestion, Pre-Processing & Calibration Engine
 * 
 * Supports:
 * - JPG, PNG, WebP, PDF (via pdfjs-dist)
 * - Draggable 4-corner perspective keystone correction
 * - Crop, Rotation, Brightness/Contrast, Skizzen-Modus
 * - Optimal downscaling for AI speed & clarity
 */

import { Point2D } from '../types/cad';
import { ImportImageItem } from '../types/aiImport';

/**
 * Loads an image file or PDF file and returns ImportImageItem.
 */
export async function loadImageFromFile(
  file: File,
  role: ImportImageItem['role'] = 'floorplan'
): Promise<ImportImageItem[]> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    return await renderPdfPages(file, role);
  }

  // Standard Image
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let finalDataUrl = dataUrl;
        let finalWidth = img.naturalWidth || img.width;
        let finalHeight = img.naturalHeight || img.height;

        // Downscale photos that exceed 2560px to preserve iPad browser memory & fast rendering
        const maxDim = 2560;
        if (finalWidth > maxDim || finalHeight > maxDim) {
          const factor = Math.min(maxDim / finalWidth, maxDim / finalHeight);
          const tw = Math.round(finalWidth * factor);
          const th = Math.round(finalHeight * factor);
          const canvas = document.createElement('canvas');
          canvas.width = tw;
          canvas.height = th;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, tw, th);
            finalDataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);
            finalWidth = tw;
            finalHeight = th;
          }
        }

        const item: ImportImageItem = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          role,
          dataUrl: finalDataUrl,
          mimeType: file.type || 'image/jpeg',
          width: finalWidth,
          height: finalHeight,
          rotationDeg: 0,
        };
        resolve([item]);
      };
      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Renders PDF pages to images using pdfjs-dist.
 */
export async function renderPdfPages(
  file: File,
  role: ImportImageItem['role'] = 'floorplan'
): Promise<ImportImageItem[]> {
  try {
    const pdfjs = await import('pdfjs-dist');
    // Set standard worker or disable if singlefile
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const items: ImportImageItem[] = [];

    // Render up to first 5 pages
    const maxPages = Math.min(pdf.numPages, 5);
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for crisp blueprints

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      items.push({
        id: `pdf_p${pageNum}_${Date.now()}`,
        name: `${file.name} (Seite ${pageNum})`,
        role: pageNum === 1 ? role : 'elevation',
        dataUrl,
        mimeType: 'image/jpeg',
        width: canvas.width,
        height: canvas.height,
        rotationDeg: 0,
      });
    }

    return items;
  } catch (err) {
    console.warn('PDF Rendering Fallback:', err);
    throw new Error('PDF konnte nicht gerendert werden. Bitte das Blatt als Bild (JPG/PNG) speichern und einfügen.');
  }
}

/**
 * Perspective un-warp: transforms 4 user-selected paper corners into a flat rectangle.
 */
export function applyPerspectiveWarp(
  sourceCanvas: HTMLCanvasElement,
  corners: {
    topLeft: Point2D;
    topRight: Point2D;
    bottomRight: Point2D;
    bottomLeft: Point2D;
  }
): HTMLCanvasElement {
  // Calculate destination dimensions from average lengths
  const topW = Math.hypot(corners.topRight.x - corners.topLeft.x, corners.topRight.y - corners.topLeft.y);
  const botW = Math.hypot(corners.bottomRight.x - corners.bottomLeft.x, corners.bottomRight.y - corners.bottomLeft.y);
  const leftH = Math.hypot(corners.bottomLeft.x - corners.topLeft.x, corners.bottomLeft.y - corners.topLeft.y);
  const rightH = Math.hypot(corners.bottomRight.x - corners.topRight.x, corners.bottomRight.y - corners.topRight.y);

  const destW = Math.round(Math.max(topW, botW));
  const destH = Math.round(Math.max(leftH, rightH));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = destW;
  outCanvas.height = destH;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  // Render using triangular affine subdivision (2 triangles for high-speed perspective warp)
  renderAffineTriangle(
    ctx,
    sourceCanvas,
    corners.topLeft,
    corners.topRight,
    corners.bottomLeft,
    { x: 0, y: 0 },
    { x: destW, y: 0 },
    { x: 0, y: destH }
  );

  renderAffineTriangle(
    ctx,
    sourceCanvas,
    corners.topRight,
    corners.bottomRight,
    corners.bottomLeft,
    { x: destW, y: 0 },
    { x: destW, y: destH },
    { x: 0, y: destH }
  );

  return outCanvas;
}

/**
 * Affine texture mapping for a single triangle.
 */
function renderAffineTriangle(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  s0: Point2D,
  s1: Point2D,
  s2: Point2D,
  d0: Point2D,
  d1: Point2D,
  d2: Point2D
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();

  // Denominator of affine mapping
  const denom = (s0.x * (s2.y - s1.y) - s1.x * s2.y + s2.x * s1.y + (s1.x - s2.x) * s0.y);
  if (Math.abs(denom) < 0.0001) {
    ctx.restore();
    return;
  }

  const m11 = - (s0.y * (d2.x - d1.x) - s1.y * d2.x + s2.y * d1.x + (s1.y - s2.y) * d0.x) / denom;
  const m12 = (s0.y * (d2.y - d1.y) - s1.y * d2.y + s2.y * d1.y + (s1.y - s2.y) * d0.y) / denom;
  const m21 = (s0.x * (d2.x - d1.x) - s1.x * d2.x + s2.x * d1.x + (s1.x - s2.x) * d0.x) / denom;
  const m22 = - (s0.x * (d2.y - d1.y) - s1.x * d2.y + s2.x * d1.y + (s1.x - s2.x) * d0.y) / denom;
  const dx = (s0.x * (s2.y * d1.x - s1.y * d2.x) + s0.y * (s1.x * d2.x - s2.x * d1.x) + (s2.x * s1.y - s1.x * s2.y) * d0.x) / denom;
  const dy = (s0.x * (s2.y * d1.y - s1.y * d2.y) + s0.y * (s1.x * d2.y - s2.x * d1.y) + (s2.x * s1.y - s1.x * s2.y) * d0.y) / denom;

  ctx.transform(m11, m12, m21, m22, dx, dy);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/**
 * Applies filters (Brightness, Contrast, Skizzen-Modus/Binarization), Rotation, Crop and Downscaling.
 */
export async function processImageToDataUrl(
  imageItem: ImportImageItem,
  maxDimension = 1440
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // 1. Initial Source Canvas
      let canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      let ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas-Kontext nicht verfügbar.'));
        return;
      }
      ctx.drawImage(img, 0, 0);

      // 2. Perspective warp if corners set
      if (imageItem.perspectiveCorners) {
        canvas = applyPerspectiveWarp(canvas, imageItem.perspectiveCorners);
        ctx = canvas.getContext('2d');
      }

      // 3. Crop if specified
      if (imageItem.cropRect && imageItem.cropRect.width > 20 && imageItem.cropRect.height > 20) {
        const crop = imageItem.cropRect;
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = crop.width;
        cropCanvas.height = crop.height;
        const cropCtx = cropCanvas.getContext('2d');
        if (cropCtx) {
          cropCtx.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
          canvas = cropCanvas;
          ctx = cropCanvas.getContext('2d');
        }
      }

      // 4. Rotation
      const rot = ((imageItem.rotationDeg % 360) + 360) % 360;
      if (rot !== 0) {
        const rotCanvas = document.createElement('canvas');
        if (rot === 90 || rot === 270) {
          rotCanvas.width = canvas.height;
          rotCanvas.height = canvas.width;
        } else {
          rotCanvas.width = canvas.width;
          rotCanvas.height = canvas.height;
        }
        const rotCtx = rotCanvas.getContext('2d');
        if (rotCtx) {
          rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
          rotCtx.rotate((rot * Math.PI) / 180);
          rotCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
          canvas = rotCanvas;
          ctx = rotCanvas.getContext('2d');
        }
      }

      // 5. Downscale if exceeding maxDimension
      let curW = canvas.width;
      let curH = canvas.height;
      if (curW > maxDimension || curH > maxDimension) {
        const factor = Math.min(maxDimension / curW, maxDimension / curH);
        const targetW = Math.round(curW * factor);
        const targetH = Math.round(curH * factor);
        const scaleCanvas = document.createElement('canvas');
        scaleCanvas.width = targetW;
        scaleCanvas.height = targetH;
        const scaleCtx = scaleCanvas.getContext('2d');
        if (scaleCtx) {
          scaleCtx.imageSmoothingEnabled = true;
          scaleCtx.imageSmoothingQuality = 'high';
          scaleCtx.drawImage(canvas, 0, 0, targetW, targetH);
          canvas = scaleCanvas;
          ctx = scaleCanvas.getContext('2d');
        }
      }

      // 6. Contrast, Brightness & Skizzen-Modus (Pixel manipulations)
      const filters = imageItem.filterSettings;
      if (filters && ctx) {
        const brightness = filters.brightness ?? 100;
        const contrast = filters.contrast ?? 100;
        const sketch = Boolean(filters.sketchMode);

        // Only manipulate pixels if non-default adjustments or sketch mode is requested
        if (brightness !== 100 || contrast !== 100 || sketch) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          const brightnessMul = brightness / 100;
          // Linear contrast factor: 100% is 1.0 (neutral), 120% is 1.2, 80% is 0.8
          const contrastFactor = contrast / 100;

          for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // 1. Contrast centered around middle gray (128)
            if (contrastFactor !== 1.0) {
              r = (r - 128) * contrastFactor + 128;
              g = (g - 128) * contrastFactor + 128;
              b = (b - 128) * contrastFactor + 128;
            }

            // 2. Brightness multiplier
            if (brightnessMul !== 1.0) {
              r *= brightnessMul;
              g *= brightnessMul;
              b *= brightnessMul;
            }

            // 3. Clean Black/White Sketch Mode (grayscale, zero color fringes)
            if (sketch) {
              const gray = 0.299 * r + 0.587 * g + 0.114 * b;
              const threshold = gray > 155 ? 255 : gray < 85 ? 15 : gray;
              r = threshold;
              g = threshold;
              b = threshold;
            }

            data[i] = Math.max(0, Math.min(255, Math.round(r)));
            data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
            data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
          }

          ctx.putImageData(imgData, 0, 0);
        }
      }

      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.85),
        width: canvas.width,
        height: canvas.height,
      });
    };
    img.onerror = () => reject(new Error('Fehler beim Rendern des Bildes.'));
    img.src = imageItem.dataUrl;
  });
}

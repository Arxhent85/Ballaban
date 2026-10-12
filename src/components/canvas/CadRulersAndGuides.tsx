/**
 * CadRulersAndGuides.tsx
 * 
 * High-Precision CAD Edge Rulers & Draggable Guides
 * Inspired by PhotoCraft & CADCraft (Storytold)
 * 
 * - Top & Left rulers synchronized with canvas zoom and pan
 * - Metric graduations (meters & subdivisions: 10m, 5m, 1m, 0.5m, 0.1m)
 * - Cursor position tracking notches on both axes
 * - Drag-from-ruler: Drag down from top ruler to create a horizontal guide line;
 *   drag right from left ruler to create a vertical guide line.
 * - Guide lines magnetic snapping & quick management
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GuideLine, Point2D } from '../../types/cad';
import { Trash2, Lock, Unlock, Eye, EyeOff, Plus } from 'lucide-react';

interface CadRulersAndGuidesProps {
  width: number;
  height: number;
  zoom: number;
  panOffset: Point2D;
  cursorPos?: Point2D | null;
  guideLines: GuideLine[];
  onAddGuideLine: (gl: GuideLine) => void;
  onRemoveGuideLine: (id: string) => void;
  onClearGuideLines: () => void;
  isDark?: boolean;
  enabled?: boolean;
  onToggleEnabled?: () => void;
}

const RULER_THICKNESS = 24; // Width/Height in px

export const CadRulersAndGuides: React.FC<CadRulersAndGuidesProps> = ({
  width,
  height,
  zoom,
  panOffset,
  cursorPos,
  guideLines,
  onAddGuideLine,
  onRemoveGuideLine,
  onClearGuideLines,
  isDark = false,
  enabled = true,
  onToggleEnabled,
}) => {
  const [dragGuide, setDragGuide] = useState<{
    orientation: 'horizontal' | 'vertical';
    currentPos: number; // in meters
  } | null>(null);

  const [hoveredGuideId, setHoveredGuideId] = useState<string | null>(null);

  // Conversion helpers
  const screenToWorld = useCallback(
    (screen: Point2D): Point2D => ({
      x: (screen.x - panOffset.x) / zoom,
      y: (screen.y - panOffset.y) / zoom,
    }),
    [zoom, panOffset]
  );

  const worldToScreen = useCallback(
    (world: Point2D): Point2D => ({
      x: world.x * zoom + panOffset.x,
      y: world.y * zoom + panOffset.y,
    }),
    [zoom, panOffset]
  );

  // Determine tick spacing based on zoom level
  const { majorStepM, minorStepM } = useMemo(() => {
    // We want major ticks every ~60 to 120 pixels on screen
    const targetM = 80 / zoom;
    if (targetM > 5) return { majorStepM: 10, minorStepM: 2 };
    if (targetM > 2) return { majorStepM: 5, minorStepM: 1 };
    if (targetM > 0.8) return { majorStepM: 2, minorStepM: 0.5 };
    if (targetM > 0.4) return { majorStepM: 1, minorStepM: 0.2 };
    if (targetM > 0.15) return { majorStepM: 0.5, minorStepM: 0.1 };
    return { majorStepM: 0.2, minorStepM: 0.05 };
  }, [zoom]);

  // Compute visible bounds in meters
  const minWorldX = (RULER_THICKNESS - panOffset.x) / zoom;
  const maxWorldX = (width - panOffset.x) / zoom;
  const minWorldY = (RULER_THICKNESS - panOffset.y) / zoom;
  const maxWorldY = (height - panOffset.y) / zoom;

  // Generate top ruler graduations
  const topTicks = useMemo(() => {
    const ticks: { x: number; label?: string; isMajor: boolean }[] = [];
    const firstMajor = Math.floor(minWorldX / majorStepM) * majorStepM;
    const lastMajor = Math.ceil(maxWorldX / majorStepM) * majorStepM;

    for (let m = firstMajor; m <= lastMajor; m += minorStepM) {
      const roundedM = Math.round(m * 1000) / 1000;
      const isMajor = Math.abs(roundedM % majorStepM) < 1e-4 || Math.abs(Math.abs(roundedM % majorStepM) - majorStepM) < 1e-4;
      const sx = roundedM * zoom + panOffset.x;
      if (sx >= RULER_THICKNESS && sx <= width) {
        ticks.push({
          x: sx,
          label: isMajor ? `${roundedM}m` : undefined,
          isMajor,
        });
      }
    }
    return ticks;
  }, [minWorldX, maxWorldX, majorStepM, minorStepM, zoom, panOffset.x, width]);

  // Generate left ruler graduations
  const leftTicks = useMemo(() => {
    const ticks: { y: number; label?: string; isMajor: boolean }[] = [];
    const firstMajor = Math.floor(minWorldY / majorStepM) * majorStepM;
    const lastMajor = Math.ceil(maxWorldY / majorStepM) * majorStepM;

    for (let m = firstMajor; m <= lastMajor; m += minorStepM) {
      const roundedM = Math.round(m * 1000) / 1000;
      const isMajor = Math.abs(roundedM % majorStepM) < 1e-4 || Math.abs(Math.abs(roundedM % majorStepM) - majorStepM) < 1e-4;
      const sy = roundedM * zoom + panOffset.y;
      if (sy >= RULER_THICKNESS && sy <= height) {
        ticks.push({
          y: sy,
          label: isMajor ? `${roundedM}m` : undefined,
          isMajor,
        });
      }
    }
    return ticks;
  }, [minWorldY, maxWorldY, majorStepM, minorStepM, zoom, panOffset.y, height]);

  // Handle dragging from rulers
  const handleTopRulerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startWorldY = (e.clientY - panOffset.y) / zoom;
    setDragGuide({
      orientation: 'horizontal',
      currentPos: Math.round(startWorldY * 20) / 20,
    });
  };

  const handleLeftRulerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startWorldX = (e.clientX - panOffset.x) / zoom;
    setDragGuide({
      orientation: 'vertical',
      currentPos: Math.round(startWorldX * 20) / 20,
    });
  };

  useEffect(() => {
    if (!dragGuide) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragGuide.orientation === 'horizontal') {
        const yM = (e.clientY - panOffset.y) / zoom;
        setDragGuide({
          orientation: 'horizontal',
          currentPos: Math.round(yM * 20) / 20,
        });
      } else {
        const xM = (e.clientX - panOffset.x) / zoom;
        setDragGuide({
          orientation: 'vertical',
          currentPos: Math.round(xM * 20) / 20,
        });
      }
    };

    const handleMouseUp = () => {
      if (dragGuide) {
        onAddGuideLine({
          id: `guide_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          orientation: dragGuide.orientation,
          position: dragGuide.currentPos,
        });
        setDragGuide(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragGuide, zoom, panOffset, onAddGuideLine]);

  if (!enabled) return null;

  const rulerBg = isDark ? '#18181b' : '#f8fafc';
  const rulerBorder = isDark ? '#27272a' : '#e2e8f0';
  const tickColor = isDark ? '#71717a' : '#94a3b8';
  const majorTickColor = isDark ? '#d4d4d8' : '#475569';
  const textColor = isDark ? '#a1a1aa' : '#64748b';
  const cursorIndicatorColor = '#f59e0b'; // amber-500

  const cursorScreenX = cursorPos ? cursorPos.x * zoom + panOffset.x : null;
  const cursorScreenY = cursorPos ? cursorPos.y * zoom + panOffset.y : null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 select-none overflow-hidden font-mono">
      {/* 1. TOP-LEFT CORNER (Origin Icon & Quick Reset) */}
      <div
        className="absolute top-0 left-0 flex items-center justify-center pointer-events-auto cursor-pointer border-r border-b text-[9px] font-bold transition-colors"
        style={{
          width: RULER_THICKNESS,
          height: RULER_THICKNESS,
          backgroundColor: rulerBg,
          borderColor: rulerBorder,
          color: textColor,
        }}
        title="CAD-Lineale & Hilfslinien (PhotoCraft / CADCraft)"
      >
        <span className="scale-75 tracking-tighter">0,0</span>
      </div>

      {/* 2. TOP RULER (X-Axis) */}
      <div
        onMouseDown={handleTopRulerMouseDown}
        className="absolute top-0 left-[24px] right-0 pointer-events-auto cursor-ns-resize border-b overflow-hidden"
        style={{
          height: RULER_THICKNESS,
          backgroundColor: rulerBg,
          borderColor: rulerBorder,
        }}
        title="Klicken & nach unten ziehen, um eine horizontale Hilfslinie zu erstellen"
      >
        <svg width="100%" height={RULER_THICKNESS} className="overflow-visible">
          {topTicks.map((t, idx) => {
            const relX = t.x - RULER_THICKNESS;
            return (
              <g key={`top_${idx}`}>
                <line
                  x1={relX}
                  y1={t.isMajor ? RULER_THICKNESS - 12 : RULER_THICKNESS - 6}
                  x2={relX}
                  y2={RULER_THICKNESS}
                  stroke={t.isMajor ? majorTickColor : tickColor}
                  strokeWidth="1"
                />
                {t.label && (
                  <text
                    x={relX + 3}
                    y={RULER_THICKNESS - 13}
                    fill={textColor}
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {t.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Cursor indicator tick on X axis */}
          {cursorScreenX !== null && cursorScreenX >= RULER_THICKNESS && (
            <g transform={`translate(${cursorScreenX - RULER_THICKNESS}, 0)`}>
              <polygon
                points="0,24 -3,17 3,17"
                fill={cursorIndicatorColor}
              />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="17"
                stroke={cursorIndicatorColor}
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>
      </div>

      {/* 3. LEFT RULER (Y-Axis) */}
      <div
        onMouseDown={handleLeftRulerMouseDown}
        className="absolute top-[24px] left-0 bottom-0 pointer-events-auto cursor-ew-resize border-r overflow-hidden"
        style={{
          width: RULER_THICKNESS,
          backgroundColor: rulerBg,
          borderColor: rulerBorder,
        }}
        title="Klicken & nach rechts ziehen, um eine vertikale Hilfslinie zu erstellen"
      >
        <svg width={RULER_THICKNESS} height="100%" className="overflow-visible">
          {leftTicks.map((t, idx) => {
            const relY = t.y - RULER_THICKNESS;
            return (
              <g key={`left_${idx}`}>
                <line
                  x1={t.isMajor ? RULER_THICKNESS - 12 : RULER_THICKNESS - 6}
                  y1={relY}
                  x2={RULER_THICKNESS}
                  y2={relY}
                  stroke={t.isMajor ? majorTickColor : tickColor}
                  strokeWidth="1"
                />
                {t.label && (
                  <text
                    x={RULER_THICKNESS - 13}
                    y={relY - 3}
                    fill={textColor}
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="end"
                    transform={`rotate(-90, ${RULER_THICKNESS - 13}, ${relY - 3})`}
                  >
                    {t.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Cursor indicator tick on Y axis */}
          {cursorScreenY !== null && cursorScreenY >= RULER_THICKNESS && (
            <g transform={`translate(0, ${cursorScreenY - RULER_THICKNESS})`}>
              <polygon
                points="24,0 17,-3 17,3"
                fill={cursorIndicatorColor}
              />
              <line
                x1="0"
                y1="0"
                x2="17"
                y2="0"
                stroke={cursorIndicatorColor}
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>
      </div>

      {/* 4. ACTIVE DRAGGED GUIDE LINE PREVIEW */}
      {dragGuide && (
        <div className="absolute inset-0 pointer-events-none">
          {dragGuide.orientation === 'horizontal' ? (
            <div
              className="absolute left-0 right-0 flex items-center"
              style={{
                top: `${dragGuide.currentPos * zoom + panOffset.y}px`,
                transform: 'translateY(-0.5px)',
              }}
            >
              <div className="w-full border-t-2 border-dashed border-cyan-400 opacity-90 shadow-sm" />
              <div className="absolute left-8 -top-3.5 px-2 py-0.5 rounded bg-cyan-600 text-white font-mono text-[10px] font-bold shadow-md">
                Y: {dragGuide.currentPos.toFixed(2)} m
              </div>
            </div>
          ) : (
            <div
              className="absolute top-0 bottom-0 flex flex-col justify-center"
              style={{
                left: `${dragGuide.currentPos * zoom + panOffset.x}px`,
                transform: 'translateX(-0.5px)',
              }}
            >
              <div className="h-full border-l-2 border-dashed border-cyan-400 opacity-90 shadow-sm" />
              <div className="absolute top-8 -left-3.5 px-2 py-0.5 rounded bg-cyan-600 text-white font-mono text-[10px] font-bold shadow-md">
                X: {dragGuide.currentPos.toFixed(2)} m
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. EXISTING STATIC GUIDELINES (with interactive delete on hover) */}
      {guideLines.map((gl) => {
        const isH = gl.orientation === 'horizontal';
        const scrPos = isH ? gl.position * zoom + panOffset.y : gl.position * zoom + panOffset.x;
        const isHovered = hoveredGuideId === gl.id;

        return (
          <div
            key={gl.id}
            onMouseEnter={() => setHoveredGuideId(gl.id)}
            onMouseLeave={() => setHoveredGuideId(null)}
            className="absolute pointer-events-auto group"
            style={
              isH
                ? {
                    left: RULER_THICKNESS,
                    right: 0,
                    top: `${scrPos - 5}px`,
                    height: '10px',
                    cursor: 'row-resize',
                  }
                : {
                    top: RULER_THICKNESS,
                    bottom: 0,
                    left: `${scrPos - 5}px`,
                    width: '10px',
                    cursor: 'col-resize',
                  }
            }
          >
            {/* Guide line visual */}
            <div
              className={`absolute transition-colors ${
                isH ? 'left-0 right-0 top-[5px] h-[1.5px]' : 'top-0 bottom-0 left-[5px] w-[1.5px]'
              } ${isHovered ? 'bg-cyan-400 ring-2 ring-cyan-400/40' : 'bg-cyan-500/70 border-dashed'}`}
              style={{
                borderTop: isH ? '1.5px dashed #06b6d4' : undefined,
                borderLeft: !isH ? '1.5px dashed #06b6d4' : undefined,
              }}
            />

            {/* Hover badge with delete option */}
            {isHovered && (
              <div
                className={`absolute px-2 py-0.5 rounded-md bg-stone-900/95 text-cyan-300 border border-cyan-500/60 shadow-xl text-[10px] font-bold flex items-center gap-1.5 z-30 transition-all ${
                  isH ? 'left-4 -top-6' : 'top-4 -left-6'
                }`}
              >
                <span>
                  {isH ? 'Y' : 'X'}: {gl.position.toFixed(2)} m
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveGuideLine(gl.id);
                  }}
                  className="p-0.5 hover:bg-rose-950/80 hover:text-rose-400 rounded transition-colors cursor-pointer text-stone-400"
                  title="Hilfslinie löschen"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* 6. COMPACT GUIDE CONTROLS PILL (if guides exist) */}
      {guideLines.length > 0 && (
        <div className="absolute bottom-3 left-10 pointer-events-auto bg-stone-900/90 backdrop-blur border border-cyan-500/50 rounded-xl px-2.5 py-1 text-xs text-stone-200 shadow-xl flex items-center gap-2 z-20">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>{guideLines.length} Hilfslinie{guideLines.length > 1 ? 'n' : ''}</span>
          </div>
          <button
            type="button"
            onClick={onClearGuideLines}
            className="p-1 hover:bg-rose-950/60 text-stone-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
            title="Alle Hilfslinien entfernen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

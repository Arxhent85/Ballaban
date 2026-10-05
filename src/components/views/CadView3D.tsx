/**
 * Interactive 3D Architectural Viewport using Three.js
 * Supports Orbit mode, Cutaway (Roof removed), First-person Walkthrough, and Sun/Shadow simulation
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CadProject,
  Floor,
  Wall,
  Door,
  Window,
  Furniture,
  Stair,
  Roof,
  Language,
} from '../../types/cad';
import { getT } from '../../i18n/translations';
import { distance, getWallPolygon } from '../../utils/cadMath';
import { exportProjectObj } from '../../utils/cadExport';
import {
  Rotate3d,
  Footprints,
  Scissors,
  Sun,
  Camera,
  Download,
  Info,
} from 'lucide-react';

interface CadView3DProps {
  project: CadProject;
  floor: Floor;
  language: Language;
}

export const CadView3D: React.FC<CadView3DProps> = ({ project, floor, language }) => {
  const t = getT(language);
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport modes
  const [navMode, setNavMode] = useState<'orbit' | 'firstPerson'>('orbit');
  const [cutawayRoof, setCutawayRoof] = useState(false);
  const [sunHour, setSunHour] = useState(14); // 14:00 default afternoon sun
  const [webglError, setWebglError] = useState<string | null>(null);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Orbit state
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const orbitAnglesRef = useRef({ theta: 0.8, phi: 0.9, radius: 18 });
  const cameraTargetRef = useRef(new THREE.Vector3(6, 1, 5));

  // Multi-touch gestures for tablets
  const touchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchInitialDistRef = useRef<number | null>(null);
  const pinchInitialRadiusRef = useRef<number>(18);

  // Walkthrough state
  const keysDownRef = useRef<{ [k: string]: boolean }>({});
  const fpPitchRef = useRef(0);
  const fpYawRef = useRef(0);
  const fpPosRef = useRef(new THREE.Vector3(5, 1.65, 5));

  // Build 3D Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch (e: any) {
      setWebglError('3D-Grafikbeschleunigung (WebGL) konnte nicht initialisiert werden. Bitte stelle sicher, dass Hardware-Beschleunigung im Browser aktiv ist.');
      return;
    }

    setWebglError(null);

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1120'); // deep sky dusk
    scene.fog = new THREE.FogExp2('#0b1120', 0.02);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;

    // 3. Renderer configuration
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setWebglError('Der WebGL-Grafikkontext ging vorübergehend verloren. Bitte wechsle die Ansicht oder lade neu.');
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lights
    const hemiLight = new THREE.HemisphereLight('#f1f5f9', '#334155', 0.6);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#fffbeb', 1.2);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    const d = 15;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // 5. Ground Terrain & Green Garden
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#1e3a1e', // lush dark lawn green
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper
    const grid = new THREE.GridHelper(40, 40, '#475569', '#1e293b');
    grid.position.y = -0.04;
    scene.add(grid);

    // 6. House Base Floor Slab & Property Plot Boundary
    if (project.plot?.enabled && project.plot.points && project.plot.points.length >= 3) {
      // Custom Polygon Plot
      const pts = project.plot.points;
      const plotShape = new THREE.Shape();
      plotShape.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        plotShape.lineTo(pts[i].x, pts[i].y);
      }
      plotShape.closePath();

      const pGeo = new THREE.ShapeGeometry(plotShape);
      pGeo.rotateX(-Math.PI / 2);
      const pMat = new THREE.MeshStandardMaterial({
        color: '#2d3748',
        roughness: 0.8,
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.y = -0.02;
      pMesh.receiveShadow = true;
      scene.add(pMesh);

      // Boundary line on ground
      const linePts = pts.map((p) => new THREE.Vector3(p.x, 0.01, p.y));
      linePts.push(new THREE.Vector3(pts[0].x, 0.01, pts[0].y));
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const lineMat = new THREE.LineBasicMaterial({ color: '#ea580c', linewidth: 2 });
      const lineMesh = new THREE.Line(lineGeo, lineMat);
      scene.add(lineMesh);

      // Boundary stones at vertices
      const stoneGeo = new THREE.BoxGeometry(0.3, 0.4, 0.3);
      const stoneMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 });
      pts.forEach((pt) => {
        const stone = new THREE.Mesh(stoneGeo, stoneMat);
        stone.position.set(pt.x, 0.2, pt.y);
        stone.castShadow = true;
        scene.add(stone);
      });
    } else {
      const plotW = project.plot?.enabled ? project.plot.width : 20;
      const plotD = project.plot?.enabled ? project.plot.depth : 16;
      const plotX = project.plot?.enabled ? project.plot.x + plotW / 2 : 6;
      const plotZ = project.plot?.enabled ? project.plot.y + plotD / 2 : 5;

      const slabGeo = new THREE.BoxGeometry(plotW, 0.2, plotD);
      const slabMat = new THREE.MeshStandardMaterial({
        color: '#e2e8f0', // oak / concrete finish
        roughness: 0.7,
      });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.set(plotX, -0.1, plotZ);
      slab.receiveShadow = true;
      scene.add(slab);
    }

    // 7. BUILD WALLS with 3D Openings & Sloped Wall Heights
    const wallMatExt = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.7,
      metalness: 0.1,
    });
    const wallMatInt = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.8,
    });

    floor.walls.forEach((w) => {
      const wLen = distance(w.start, w.end);
      if (wLen < 0.1) return;

      const angle = Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x);
      const midX = (w.start.x + w.end.x) / 2;
      const midZ = (w.start.y + w.end.y) / 2;
      const hStart = w.height || 2.50;
      const hEnd = w.endHeight ?? hStart;

      let wGeo: THREE.BufferGeometry;
      // Sloped wall: Anfangshöhe !== Endhöhe (Giebel / schräge Oberkante für hohe Räume)
      if (Math.abs(hEnd - hStart) > 0.02) {
        const shape = new THREE.Shape();
        shape.moveTo(-wLen / 2, 0);
        shape.lineTo(wLen / 2, 0);
        shape.lineTo(wLen / 2, hEnd);
        shape.lineTo(-wLen / 2, hStart);
        shape.closePath();

        const extrudeSettings = { depth: w.thickness, bevelEnabled: false };
        wGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        wGeo.translate(0, 0, -w.thickness / 2);
      } else {
        wGeo = new THREE.BoxGeometry(wLen, hStart, w.thickness);
        wGeo.translate(0, hStart / 2, 0);
      }

      const mesh = new THREE.Mesh(wGeo, w.isExterior ? wallMatExt : wallMatInt);
      mesh.position.set(midX, 0, midZ);
      mesh.rotation.y = -angle;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    // 8. 3D WINDOWS & DOORS
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#93c5fd',
      transmission: 0.8,
      opacity: 0.6,
      transparent: true,
      roughness: 0.1,
      metalness: 0.1,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: '#1e293b' });

    floor.windows.forEach((win) => {
      const wall = floor.walls.find((w) => w.id === win.wallId);
      if (!wall) return;
      const wLen = distance(wall.start, wall.end);
      const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);

      const posX = wall.start.x + (wall.end.x - wall.start.x) * win.position;
      const posZ = wall.start.y + (wall.end.y - wall.start.y) * win.position;
      const posY = win.parapetHeight + win.height / 2;

      // Window Frame & Glass
      const winGeo = new THREE.BoxGeometry(win.width, win.height, wall.thickness + 0.04);
      const winMesh = new THREE.Mesh(winGeo, glassMat);
      winMesh.position.set(posX, posY, posZ);
      winMesh.rotation.y = -angle;
      winMesh.castShadow = true;
      scene.add(winMesh);
    });

    // 9. 3D FURNITURE
    floor.furniture.forEach((f) => {
      const fMat = new THREE.MeshStandardMaterial({
        color: f.color || '#475569',
        roughness: 0.5,
      });
      const fGeo = new THREE.BoxGeometry(f.width, f.height, f.depth);
      const fMesh = new THREE.Mesh(fGeo, fMat);
      fMesh.position.set(f.x, f.height / 2, f.y);
      fMesh.rotation.y = (-f.rotation * Math.PI) / 180;
      fMesh.castShadow = true;
      fMesh.receiveShadow = true;
      scene.add(fMesh);
    });

    // 10. 3D ROOF (if not cutaway)
    if (!cutawayRoof && floor.roofs.length > 0) {
      const rf = floor.roofs[0];
      const roofMat = new THREE.MeshStandardMaterial({
        color: rf.material === 'slate' ? '#334155' : '#991b1b', // slate or terra-cotta red tiles
        roughness: 0.6,
      });

      // Simple Gable Roof prism
      const roofHeight = rf.height || 2.2;
      const roofWidth = 9.0;
      const roofDepth = 7.0;

      const roofShape = new THREE.Shape();
      roofShape.moveTo(-roofWidth / 2, 0);
      roofShape.lineTo(0, roofHeight);
      roofShape.lineTo(roofWidth / 2, 0);
      roofShape.closePath();

      const extrudeSettings = { depth: roofDepth, bevelEnabled: false };
      const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
      const roofMesh = new THREE.Mesh(roofGeo, roofMat);
      roofMesh.position.set(6, 2.6, 1.5);
      roofMesh.castShadow = true;
      scene.add(roofMesh);

      // Chimney
      if (rf.hasChimney) {
        const chimGeo = new THREE.BoxGeometry(0.8, 2.5, 0.8);
        const chimMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 });
        const chimMesh = new THREE.Mesh(chimGeo, chimMat);
        chimMesh.position.set(7.5, 3.8, 4.5);
        chimMesh.castShadow = true;
        scene.add(chimMesh);
      }
    }

    // Animation Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Update sun direction
      if (dirLightRef.current) {
        const sunAngle = ((sunHour - 6) / 12) * Math.PI; // 6:00 to 18:00
        const sunY = Math.max(0.5, Math.sin(sunAngle) * 16);
        const sunX = Math.cos(sunAngle) * 20;
        dirLightRef.current.position.set(sunX, sunY, 15);
      }

      // First-person navigation WASD
      if (navMode === 'firstPerson' && cameraRef.current) {
        const moveSpeed = 0.08;
        const forward = new THREE.Vector3(
          -Math.sin(fpYawRef.current),
          0,
          -Math.cos(fpYawRef.current)
        );
        const right = new THREE.Vector3(
          Math.cos(fpYawRef.current),
          0,
          -Math.sin(fpYawRef.current)
        );

        if (keysDownRef.current['KeyW'] || keysDownRef.current['ArrowUp']) {
          fpPosRef.current.addScaledVector(forward, moveSpeed);
        }
        if (keysDownRef.current['KeyS'] || keysDownRef.current['ArrowDown']) {
          fpPosRef.current.addScaledVector(forward, -moveSpeed);
        }
        if (keysDownRef.current['KeyA'] || keysDownRef.current['ArrowLeft']) {
          fpPosRef.current.addScaledVector(right, -moveSpeed);
        }
        if (keysDownRef.current['KeyD'] || keysDownRef.current['ArrowRight']) {
          fpPosRef.current.addScaledVector(right, moveSpeed);
        }

        cameraRef.current.position.copy(fpPosRef.current);
        const lookDir = new THREE.Vector3(
          -Math.sin(fpYawRef.current) * Math.cos(fpPitchRef.current),
          Math.sin(fpPitchRef.current),
          -Math.cos(fpYawRef.current) * Math.cos(fpPitchRef.current)
        );
        cameraRef.current.lookAt(fpPosRef.current.clone().add(lookDir));
      } else if (cameraRef.current) {
        // Orbit mode camera positioning
        const { theta, phi, radius } = orbitAnglesRef.current;
        const cx = cameraTargetRef.current.x + radius * Math.sin(phi) * Math.sin(theta);
        const cy = cameraTargetRef.current.y + radius * Math.cos(phi);
        const cz = cameraTargetRef.current.z + radius * Math.sin(phi) * Math.cos(theta);
        cameraRef.current.position.set(cx, cy, cz);
        cameraRef.current.lookAt(cameraTargetRef.current);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Handle Resize
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [floor, cutawayRoof, sunHour, navMode]);

  // Pointer drag for Orbit / Walkthrough look-around + Touch pinch-zoom
  const handlePointerDown = (e: React.PointerEvent) => {
    touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (touchPointersRef.current.size >= 2) {
      const pts = Array.from(touchPointersRef.current.values());
      pinchInitialDistRef.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchInitialRadiusRef.current = orbitAnglesRef.current.radius;
      isDraggingRef.current = false;
      return;
    }

    isDraggingRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (touchPointersRef.current.has(e.pointerId)) {
      touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Two-finger pinch-zoom on tablets
    if (touchPointersRef.current.size >= 2 && pinchInitialDistRef.current && navMode === 'orbit') {
      const pts = Array.from(touchPointersRef.current.values());
      const currentDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      if (currentDist > 5 && pinchInitialDistRef.current > 5) {
        const factor = pinchInitialDistRef.current / currentDist;
        orbitAnglesRef.current.radius = Math.max(3, Math.min(45, pinchInitialRadiusRef.current * factor));
      }
      return;
    }

    if (!isDraggingRef.current) return;
    const dx = e.clientX - prevMouseRef.current.x;
    const dy = e.clientY - prevMouseRef.current.y;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };

    if (navMode === 'orbit') {
      orbitAnglesRef.current.theta -= dx * 0.008;
      orbitAnglesRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, orbitAnglesRef.current.phi - dy * 0.008));
    } else {
      fpYawRef.current -= dx * 0.005;
      fpPitchRef.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, fpPitchRef.current - dy * 0.005));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    touchPointersRef.current.delete(e.pointerId);
    if (touchPointersRef.current.size < 2) {
      pinchInitialDistRef.current = null;
    }
    if (touchPointersRef.current.size === 0) {
      isDraggingRef.current = false;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (navMode === 'orbit') {
      orbitAnglesRef.current.radius = Math.max(3, Math.min(40, orbitAnglesRef.current.radius + e.deltaY * 0.02));
    }
  };

  // Keyboard events for Walkthrough
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Snapshot
  const takeSnapshot = () => {
    if (rendererRef.current) {
      const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${project.name.replace(/\s+/g, '_')}_3D_View.png`;
      a.click();
    }
  };

  return (
    <div className="relative w-full h-full flex-1 bg-slate-950 overflow-hidden select-none">
      {/* WebGL Error / Fallback State */}
      {webglError ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 z-20 bg-slate-950/95">
          <div className="max-w-md w-full bg-slate-900 border border-amber-600/60 rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
              <Rotate3d className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-white text-base mb-2">3D-Ansicht nicht verfügbar</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">{webglError}</p>
            <button
              onClick={() => {
                setWebglError(null);
                setNavMode('orbit');
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow transition-colors cursor-pointer"
            >
              Ansicht neu laden ⟳
            </button>
          </div>
        </div>
      ) : null}

      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Floating 3D Control HUD Bar */}
      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/80 shadow-2xl text-xs z-10">
        {/* Navigation Mode */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded border border-slate-800">
          <button
            onClick={() => setNavMode('orbit')}
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
              navMode === 'orbit' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rotate3d className="w-3.5 h-3.5" />
            <span>{t.view3dControls.orbit}</span>
          </button>

          <button
            onClick={() => setNavMode('firstPerson')}
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
              navMode === 'firstPerson' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>{t.view3dControls.firstPerson}</span>
          </button>
        </div>

        {/* Cutaway Roof */}
        <button
          onClick={() => setCutawayRoof(!cutawayRoof)}
          className={`px-2.5 py-1 rounded flex items-center gap-1 font-medium border transition-colors ${
            cutawayRoof
              ? 'bg-rose-950/80 text-rose-300 border-rose-800'
              : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
          }`}
        >
          <Scissors className="w-3.5 h-3.5 text-rose-400" />
          <span>{t.view3dControls.cutaway}</span>
        </button>

        {/* Sun Position Slider */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-950/60 rounded border border-slate-800">
          <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] text-slate-400 font-mono">{sunHour}:00 Uhr</span>
          <input
            type="range"
            min="6"
            max="20"
            value={sunHour}
            onChange={(e) => setSunHour(parseInt(e.target.value))}
            className="w-20 accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Snapshot & OBJ */}
        <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
          <button
            onClick={takeSnapshot}
            title={t.view3dControls.screenshot}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            onClick={() => exportProjectObj(project, floor)}
            title={t.view3dControls.exportObj}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 pointer-events-none flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-emerald-400" />
        <span>{t.view3dControls.controlsHelp}</span>
      </div>
    </div>
  );
};

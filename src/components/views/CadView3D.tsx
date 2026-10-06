/**
 * Professional Interactive 3D Architectural Viewport using Three.js
 * Features:
 * - 100% synchronized with 2D plan (zero phantom objects, zero ghost roofs)
 * - Automatic framing & camera fit to building bounds
 * - True 3D openings for doors & windows (including frame, glass, walkthrough)
 * - Sloped wall tops & custom heights
 * - Adaptable Roof Module (Gable, Shed, Hip, Flat, Tent)
 * - Interactive ViewCube & North compass
 * - Preset view buttons (Isometric, Top, Front, Back, Left, Right)
 * - First-Person Walkthrough (WASD / Arrows)
 * - Visibility filters (Roof, Ceilings, Furniture, Terrain, Transparent walls)
 * - Horizontal clipping plane (3D Floor Plan cutaway)
 * - Interactive 3D Raycasting selection synchronized with 2D
 * - High-res PNG & OBJ model export
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  SelectionState,
} from '../../types/cad';
import { getT } from '../../i18n/translations';
import { distance } from '../../utils/cadMath';
import { exportProjectObj } from '../../utils/cadExport';
import {
  Rotate3d,
  Footprints,
  Scissors,
  Sun,
  Camera,
  Download,
  Info,
  Layers,
  Eye,
  EyeOff,
  Home,
  Compass,
  Maximize2,
  Sliders,
  Check,
} from 'lucide-react';

interface CadView3DProps {
  project: CadProject;
  floor: Floor;
  language: Language;
  selection?: SelectionState;
  onSelect?: (sel: SelectionState) => void;
  isDark?: boolean;
  onOpenRoofModal?: () => void;
}

export const CadView3D: React.FC<CadView3DProps> = ({
  project,
  floor,
  language,
  selection,
  onSelect,
  isDark = false,
  onOpenRoofModal,
}) => {
  const t = getT(language);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewCubeRef = useRef<HTMLDivElement>(null);

  // Viewport states
  const [navMode, setNavMode] = useState<'orbit' | 'firstPerson'>('orbit');
  const [showRoof, setShowRoof] = useState(true);
  const [showCeilings, setShowCeilings] = useState(false);
  const [showFurniture, setShowFurniture] = useState(true);
  const [showPlotGround, setShowPlotGround] = useState(true);
  const [transparentWalls, setTransparentWalls] = useState(false);
  const [enableClip, setEnableClip] = useState(false);
  const [clipHeight, setClipHeight] = useState(1.40); // 1.4m default architectural cut
  const [sunHour, setSunHour] = useState(14); // 14:00 default sun
  const [eyeHeight, setEyeHeight] = useState(1.65);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const clipPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, -1, 0), 100));
  const interactiveMeshesRef = useRef<THREE.Mesh[]>([]);

  // Orbit state
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const orbitAnglesRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 18 });
  const cameraTargetRef = useRef(new THREE.Vector3(6, 1.5, 5));

  // Multi-touch gestures
  const touchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchInitialDistRef = useRef<number | null>(null);
  const pinchInitialRadiusRef = useRef<number>(18);

  // Walkthrough state
  const keysDownRef = useRef<{ [k: string]: boolean }>({});
  const fpPitchRef = useRef(0);
  const fpYawRef = useRef(0);
  const fpPosRef = useRef(new THREE.Vector3(5, 1.65, 5));

  // Building Bounding Box calculation
  const buildingBounds = useMemo(() => {
    const walls = floor.walls;
    if (walls.length === 0) {
      return {
        minX: 2,
        maxX: 10,
        minZ: 2,
        maxZ: 8,
        centerX: 6,
        centerZ: 5,
        maxH: 2.6,
        span: 10,
      };
    }
    const minX = Math.min(...walls.flatMap((w) => [w.start.x, w.end.x]));
    const maxX = Math.max(...walls.flatMap((w) => [w.start.x, w.end.x]));
    const minZ = Math.min(...walls.flatMap((w) => [w.start.y, w.end.y]));
    const maxZ = Math.max(...walls.flatMap((w) => [w.start.y, w.end.y]));
    const maxH = Math.max(
      ...walls.map((w) => Math.max(w.height || 2.5, w.endHeight ?? w.height ?? 2.5)),
      2.5
    );
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const span = Math.hypot(maxX - minX, maxZ - minZ) || 10;
    return { minX, maxX, minZ, maxZ, centerX, centerZ, maxH, span };
  }, [floor.walls]);

  // Center camera on building
  const fitCameraToBuilding = useCallback(() => {
    cameraTargetRef.current.set(buildingBounds.centerX, buildingBounds.maxH / 2, buildingBounds.centerZ);
    orbitAnglesRef.current.radius = Math.max(12, buildingBounds.span * 1.5);
    orbitAnglesRef.current.theta = Math.PI / 4;
    orbitAnglesRef.current.phi = Math.PI / 3;

    // Reset walkthrough position near entrance
    fpPosRef.current.set(buildingBounds.centerX, eyeHeight, buildingBounds.maxZ + 2);
    fpYawRef.current = 0;
    fpPitchRef.current = 0;
  }, [buildingBounds, eyeHeight]);

  // Preset Views (Isometric, Top, Front, Back, Left, Right)
  const setPresetView = (view: 'iso' | 'top' | 'front' | 'back' | 'left' | 'right') => {
    setNavMode('orbit');
    cameraTargetRef.current.set(buildingBounds.centerX, buildingBounds.maxH / 2, buildingBounds.centerZ);
    const rad = Math.max(12, buildingBounds.span * 1.5);
    orbitAnglesRef.current.radius = rad;

    switch (view) {
      case 'iso':
        orbitAnglesRef.current.theta = Math.PI / 4;
        orbitAnglesRef.current.phi = Math.PI / 3;
        break;
      case 'top':
        orbitAnglesRef.current.theta = 0;
        orbitAnglesRef.current.phi = 0.001; // directly from top looking down (+Y down)
        break;
      case 'front': // South elevation (facing North)
        orbitAnglesRef.current.theta = 0;
        orbitAnglesRef.current.phi = Math.PI / 2;
        break;
      case 'back': // North elevation (facing South)
        orbitAnglesRef.current.theta = Math.PI;
        orbitAnglesRef.current.phi = Math.PI / 2;
        break;
      case 'left': // West elevation (facing East)
        orbitAnglesRef.current.theta = -Math.PI / 2;
        orbitAnglesRef.current.phi = Math.PI / 2;
        break;
      case 'right': // East elevation (facing West)
        orbitAnglesRef.current.theta = Math.PI / 2;
        orbitAnglesRef.current.phi = Math.PI / 2;
        break;
    }
  };

  // Build Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    } catch {
      setWebglError('3D-Grafikbeschleunigung (WebGL) konnte nicht initialisiert werden.');
      return;
    }

    setWebglError(null);

    // 1. Scene & Lighting Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Theme color palette
    const skyColor = isDark ? '#0b1120' : '#f0f9ff';
    const groundColor = isDark ? '#142114' : '#275227';
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.FogExp2(skyColor, 0.015);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 150);
    cameraRef.current = camera;

    // 3. Renderer configuration
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Initial camera placement on building
    cameraTargetRef.current.set(buildingBounds.centerX, buildingBounds.maxH / 2, buildingBounds.centerZ);
    orbitAnglesRef.current.radius = Math.max(12, buildingBounds.span * 1.5);

    // 4. Lights
    const hemiLight = new THREE.HemisphereLight(
      isDark ? '#e2e8f0' : '#ffffff',
      isDark ? '#1e293b' : '#64748b',
      isDark ? 0.6 : 0.85
    );
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#fffbeb', isDark ? 1.0 : 1.4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    const d = Math.max(15, buildingBounds.span);
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // 5. Ground Plane & Terrain (flush at y = -0.01)
    if (showPlotGround) {
      const terrainGeo = new THREE.PlaneGeometry(120, 120);
      const terrainMat = new THREE.MeshStandardMaterial({
        color: groundColor,
        roughness: 0.95,
      });
      const terrain = new THREE.Mesh(terrainGeo, terrainMat);
      terrain.rotation.x = -Math.PI / 2;
      terrain.position.y = -0.01;
      terrain.receiveShadow = true;
      scene.add(terrain);

      // Subtle architectural grid around origin/building
      const grid = new THREE.GridHelper(60, 60, isDark ? '#334155' : '#94a3b8', isDark ? '#1e293b' : '#e2e8f0');
      grid.position.y = -0.005;
      scene.add(grid);

      // Property Plot boundary if enabled
      if (project.plot?.enabled) {
        if (project.plot.points && project.plot.points.length >= 3) {
          const pts = project.plot.points;
          const plotShape = new THREE.Shape();
          plotShape.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) plotShape.lineTo(pts[i].x, pts[i].y);
          plotShape.closePath();

          const pGeo = new THREE.ShapeGeometry(plotShape);
          pGeo.rotateX(-Math.PI / 2);
          const pMat = new THREE.MeshStandardMaterial({
            color: isDark ? '#1e293b' : '#e2e8f0',
            roughness: 0.8,
          });
          const pMesh = new THREE.Mesh(pGeo, pMat);
          pMesh.position.y = 0.002;
          pMesh.receiveShadow = true;
          scene.add(pMesh);

          // Orange plot perimeter line
          const linePts = pts.map((p) => new THREE.Vector3(p.x, 0.02, p.y));
          linePts.push(new THREE.Vector3(pts[0].x, 0.02, pts[0].y));
          const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
          const lineMat = new THREE.LineBasicMaterial({ color: '#ea580c', linewidth: 2 });
          scene.add(new THREE.Line(lineGeo, lineMat));

          // Boundary corner stones
          const stoneGeo = new THREE.BoxGeometry(0.25, 0.35, 0.25);
          const stoneMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4 });
          pts.forEach((pt) => {
            const stone = new THREE.Mesh(stoneGeo, stoneMat);
            stone.position.set(pt.x, 0.15, pt.y);
            stone.castShadow = true;
            scene.add(stone);
          });
        } else {
          // Rectangular plot
          const pw = project.plot.width;
          const pd = project.plot.depth;
          const px = project.plot.x + pw / 2;
          const pz = project.plot.y + pd / 2;

          const pGeo = new THREE.PlaneGeometry(pw, pd);
          const pMat = new THREE.MeshStandardMaterial({
            color: isDark ? '#1e293b' : '#e2e8f0',
            roughness: 0.8,
          });
          const pMesh = new THREE.Mesh(pGeo, pMat);
          pMesh.rotation.x = -Math.PI / 2;
          pMesh.position.set(px, 0.002, pz);
          pMesh.receiveShadow = true;
          scene.add(pMesh);

          // Boundary line
          const rectPts = [
            new THREE.Vector3(project.plot.x, 0.02, project.plot.y),
            new THREE.Vector3(project.plot.x + pw, 0.02, project.plot.y),
            new THREE.Vector3(project.plot.x + pw, 0.02, project.plot.y + pd),
            new THREE.Vector3(project.plot.x, 0.02, project.plot.y + pd),
            new THREE.Vector3(project.plot.x, 0.02, project.plot.y),
          ];
          const lineGeo = new THREE.BufferGeometry().setFromPoints(rectPts);
          const lineMat = new THREE.LineBasicMaterial({ color: '#ea580c', linewidth: 2 });
          scene.add(new THREE.Line(lineGeo, lineMat));
        }
      }
    }

    // Interactive meshes for click selection
    interactiveMeshesRef.current = [];

    // Horizontal clipping plane for 3D floor plan cutaway
    clipPlaneRef.current.set(new THREE.Vector3(0, -1, 0), enableClip ? clipHeight : 100);

    // 6. House Foundation Slab (directly beneath building footprint at y = -0.15 to 0.00)
    if (floor.walls.length > 0) {
      const slabW = buildingBounds.maxX - buildingBounds.minX + 0.3;
      const slabD = buildingBounds.maxZ - buildingBounds.minZ + 0.3;
      const slabGeo = new THREE.BoxGeometry(slabW, 0.15, slabD);
      const slabMat = new THREE.MeshStandardMaterial({
        color: isDark ? '#334155' : '#cbd5e1',
        roughness: 0.8,
      });
      const slabMesh = new THREE.Mesh(slabGeo, slabMat);
      slabMesh.position.set(buildingBounds.centerX, -0.075, buildingBounds.centerZ);
      slabMesh.receiveShadow = true;
      scene.add(slabMesh);
    }

    // 7. Rooms & Floor Finishes (Flush at y = 0.005)
    floor.rooms.forEach((rm) => {
      if (rm.polygon.length < 3) return;
      const shape = new THREE.Shape();
      shape.moveTo(rm.polygon[0].x, rm.polygon[0].y);
      for (let i = 1; i < rm.polygon.length; i++) {
        shape.lineTo(rm.polygon[i].x, rm.polygon[i].y);
      }
      shape.closePath();

      const rGeo = new THREE.ShapeGeometry(shape);
      rGeo.rotateX(-Math.PI / 2);

      let finishColor = '#e2e8f0';
      let roughness = 0.7;
      if (rm.floorFinish === 'parquet') {
        finishColor = '#b45309'; // warm wood parquet
        roughness = 0.5;
      } else if (rm.floorFinish === 'tiles') {
        finishColor = '#f1f5f9'; // porcelain tile
        roughness = 0.3;
      } else if (rm.floorFinish === 'concrete') {
        finishColor = '#94a3b8';
        roughness = 0.8;
      } else if (rm.floorFinish === 'terrace_stone') {
        finishColor = '#78716c';
      } else if (rm.floorFinish === 'carpet') {
        finishColor = '#64748b';
      }

      const rMat = new THREE.MeshStandardMaterial({
        color: finishColor,
        roughness,
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.position.y = 0.005;
      rMesh.receiveShadow = true;
      rMesh.userData = { type: 'room', id: rm.id };
      scene.add(rMesh);
      interactiveMeshesRef.current.push(rMesh);

      // Optional Ceilings
      if (showCeilings) {
        const cMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.8 });
        const cMesh = new THREE.Mesh(rGeo, cMat);
        cMesh.position.y = rm.height || 2.50;
        cMesh.castShadow = true;
        scene.add(cMesh);
      }
    });

    // 8. Walls with TRUE 3D Openings for Doors and Windows
    const extWallMat = new THREE.MeshStandardMaterial({
      color: isDark ? '#64748b' : '#94a3b8',
      roughness: 0.7,
      transparent: transparentWalls,
      opacity: transparentWalls ? 0.4 : 1.0,
      clippingPlanes: enableClip ? [clipPlaneRef.current] : [],
    });

    const intWallMat = new THREE.MeshStandardMaterial({
      color: isDark ? '#94a3b8' : '#f8fafc',
      roughness: 0.8,
      transparent: transparentWalls,
      opacity: transparentWalls ? 0.4 : 1.0,
      clippingPlanes: enableClip ? [clipPlaneRef.current] : [],
    });

    const selectedWallMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b', // amber selected highlight
      roughness: 0.5,
      clippingPlanes: enableClip ? [clipPlaneRef.current] : [],
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#93c5fd',
      transmission: 0.85,
      opacity: 0.65,
      transparent: true,
      roughness: 0.1,
      metalness: 0.1,
      clippingPlanes: enableClip ? [clipPlaneRef.current] : [],
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: isDark ? '#0f172a' : '#1e293b',
      roughness: 0.4,
      clippingPlanes: enableClip ? [clipPlaneRef.current] : [],
    });

    const doorLeafMat = new THREE.MeshStandardMaterial({
      color: '#78350f', // timber door finish
      roughness: 0.5,
      clippingPlanes: enableClip ? [clipPlaneRef.current] : [],
    });

    floor.walls.forEach((w) => {
      const wLen = distance(w.start, w.end);
      if (wLen < 0.1) return;

      const angle = Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x);
      const isSelected = selection?.ids.includes(w.id);
      const currentWallMat = isSelected ? selectedWallMat : w.isExterior ? extWallMat : intWallMat;

      // Find openings on this wall
      const wallDoors = floor.doors.filter((d) => d.wallId === w.id);
      const wallWins = floor.windows.filter((win) => win.wallId === w.id);

      // Collect openings sorted along wall (from 0 to wLen)
      interface OpeningInfo {
        type: 'door' | 'window';
        id: string;
        startDist: number;
        endDist: number;
        width: number;
        height: number;
        sillY: number; // parapet height (0 for door)
        obj: Door | Window;
      }

      const openings: OpeningInfo[] = [];

      wallDoors.forEach((d) => {
        const centerM = d.position * wLen;
        const halfW = d.width / 2;
        openings.push({
          type: 'door',
          id: d.id,
          startDist: Math.max(0, centerM - halfW),
          endDist: Math.min(wLen, centerM + halfW),
          width: d.width,
          height: d.height,
          sillY: 0,
          obj: d,
        });
      });

      wallWins.forEach((win) => {
        const centerM = win.position * wLen;
        const halfW = win.width / 2;
        openings.push({
          type: 'window',
          id: win.id,
          startDist: Math.max(0, centerM - halfW),
          endDist: Math.min(wLen, centerM + halfW),
          width: win.width,
          height: win.height,
          sillY: win.parapetHeight,
          obj: win,
        });
      });

      openings.sort((a, b) => a.startDist - b.startDist);

      // Wall group placed at wall start point, rotated by -angle
      const wallGroup = new THREE.Group();
      wallGroup.position.set(w.start.x, 0, w.start.y);
      wallGroup.rotation.y = -angle;

      const hStart = w.height || 2.50;
      const hEnd = w.endHeight ?? hStart;

      // Helper function to calculate wall height at distance x along wall
      const getWallHeightAt = (xDist: number) => {
        const t = Math.max(0, Math.min(1, xDist / wLen));
        return hStart + t * (hEnd - hStart);
      };

      // Helper to add a 3D block to the wall group
      const addWallBlock = (x1: number, x2: number, y1: number, y2: number) => {
        const blkLen = x2 - x1;
        const blkHeight = y2 - y1;
        if (blkLen <= 0.01 || blkHeight <= 0.01) return;

        const geo = new THREE.BoxGeometry(blkLen, blkHeight, w.thickness);
        geo.translate(x1 + blkLen / 2, y1 + blkHeight / 2, 0);

        const mesh = new THREE.Mesh(geo, currentWallMat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { type: 'wall', id: w.id };
        wallGroup.add(mesh);
        interactiveMeshesRef.current.push(mesh);
      };

      // Construct segmented wall with openings
      let currentX = 0;
      openings.forEach((op) => {
        // Full height wall before opening
        if (op.startDist > currentX) {
          const avgTopH = (getWallHeightAt(currentX) + getWallHeightAt(op.startDist)) / 2;
          addWallBlock(currentX, op.startDist, 0, avgTopH);
        }

        // Parapet block under window
        if (op.type === 'window' && op.sillY > 0) {
          addWallBlock(op.startDist, op.endDist, 0, op.sillY);
        }

        // Lintel block above opening
        const openingTopY = op.sillY + op.height;
        const wallTopY = (getWallHeightAt(op.startDist) + getWallHeightAt(op.endDist)) / 2;
        if (wallTopY > openingTopY) {
          addWallBlock(op.startDist, op.endDist, openingTopY, wallTopY);
        }

        // Render detailed Window inside opening
        if (op.type === 'window') {
          const win = op.obj as Window;
          const isWinSelected = selection?.ids.includes(win.id);
          const winGroup = new THREE.Group();
          const winCenterDist = (op.startDist + op.endDist) / 2;
          winGroup.position.set(winCenterDist, op.sillY + win.height / 2, 0);

          // Window Frame
          const fThick = 0.06;
          const frameGeo = new THREE.BoxGeometry(win.width, win.height, w.thickness + 0.02);
          const fMesh = new THREE.Mesh(frameGeo, isWinSelected ? selectedWallMat : frameMat);
          fMesh.castShadow = true;
          fMesh.userData = { type: 'window', id: win.id };
          winGroup.add(fMesh);
          interactiveMeshesRef.current.push(fMesh);

          // Transparent reflective Glass Pane
          const gGeo = new THREE.BoxGeometry(
            Math.max(0.1, win.width - fThick * 2),
            Math.max(0.1, win.height - fThick * 2),
            0.02
          );
          const gMesh = new THREE.Mesh(gGeo, glassMat);
          gMesh.userData = { type: 'window', id: win.id };
          winGroup.add(gMesh);

          // Window Sill
          const sillGeo = new THREE.BoxGeometry(win.width + 0.1, 0.04, w.thickness + 0.12);
          const sillMat = new THREE.MeshStandardMaterial({ color: isDark ? '#475569' : '#e2e8f0', roughness: 0.3 });
          const sillMesh = new THREE.Mesh(sillGeo, sillMat);
          sillMesh.position.set(0, -win.height / 2 - 0.02, 0);
          sillMesh.castShadow = true;
          winGroup.add(sillMesh);

          wallGroup.add(winGroup);
        }

        // Render detailed Door inside opening
        if (op.type === 'door') {
          const door = op.obj as Door;
          const isDoorSelected = selection?.ids.includes(door.id);
          const doorGroup = new THREE.Group();
          const doorCenterDist = (op.startDist + op.endDist) / 2;
          doorGroup.position.set(doorCenterDist, door.height / 2, 0);

          // Door Frame
          const dFrameGeo = new THREE.BoxGeometry(door.width, door.height, w.thickness + 0.02);
          const dFrameMesh = new THREE.Mesh(dFrameGeo, isDoorSelected ? selectedWallMat : frameMat);
          dFrameMesh.castShadow = true;
          dFrameMesh.userData = { type: 'door', id: door.id };
          doorGroup.add(dFrameMesh);
          interactiveMeshesRef.current.push(dFrameMesh);

          // Door Leaf (slightly ajar 15° for architectural elegance)
          const leafW = door.width - 0.08;
          const leafGeo = new THREE.BoxGeometry(leafW, door.height - 0.06, 0.04);
          leafGeo.translate(leafW / 2, 0, 0); // pivot on hinge
          const leafMesh = new THREE.Mesh(leafGeo, isDoorSelected ? selectedWallMat : doorLeafMat);
          leafMesh.position.set(-door.width / 2 + 0.04, 0, 0);
          leafMesh.rotation.y = (door.swingDirection === 'left' ? -1 : 1) * 0.25; // 15° open
          leafMesh.castShadow = true;
          leafMesh.userData = { type: 'door', id: door.id };
          doorGroup.add(leafMesh);

          // Metal Door Handle
          const handleGeo = new THREE.BoxGeometry(0.12, 0.03, 0.08);
          const handleMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.8, roughness: 0.2 });
          const handleMesh = new THREE.Mesh(handleGeo, handleMat);
          handleMesh.position.set(leafW * 0.85, 0, 0.04);
          leafMesh.add(handleMesh);

          wallGroup.add(doorGroup);
        }

        currentX = op.endDist;
      });

      // Remaining wall segment to wall end
      if (currentX < wLen) {
        const avgTopH = (getWallHeightAt(currentX) + getWallHeightAt(wLen)) / 2;
        addWallBlock(currentX, wLen, 0, avgTopH);
      }

      scene.add(wallGroup);
    });

    // 9. Furniture Objects
    if (showFurniture) {
      floor.furniture.forEach((f) => {
        const isFurnSelected = selection?.ids.includes(f.id);
        const fMat = new THREE.MeshStandardMaterial({
          color: isFurnSelected ? '#f59e0b' : f.color || '#475569',
          roughness: 0.5,
          clippingPlanes: enableClip ? [clipPlaneRef.current] : [],
        });
        const fGeo = new THREE.BoxGeometry(f.width, f.height, f.depth);
        const fMesh = new THREE.Mesh(fGeo, fMat);
        fMesh.position.set(f.x, f.height / 2, f.y);
        fMesh.rotation.y = (-f.rotation * Math.PI) / 180;
        fMesh.castShadow = true;
        fMesh.receiveShadow = true;
        fMesh.userData = { type: 'furniture', id: f.id };
        scene.add(fMesh);
        interactiveMeshesRef.current.push(fMesh);
      });
    }

    // 10. Architectural ROOF MODULE (Adapts to actual building exterior bounds)
    if (showRoof && floor.roofs.length > 0) {
      const rf = floor.roofs[0];
      const isRoofSelected = selection?.ids.includes(rf.id);

      let roofTileColor = '#1e293b'; // anthracite
      if (rf.material === 'tiles_red') roofTileColor = '#991b1b'; // terra cotta red
      else if (rf.material === 'slate') roofTileColor = '#334155'; // natural slate
      else if (rf.material === 'metal_sheet') roofTileColor = '#64748b'; // zinc sheet
      else if (rf.material === 'green_roof') roofTileColor = '#166534'; // green roof

      const roofMat = new THREE.MeshStandardMaterial({
        color: isRoofSelected ? '#f59e0b' : roofTileColor,
        roughness: 0.6,
        metalness: rf.material === 'metal_sheet' ? 0.4 : 0.05,
        clippingPlanes: enableClip ? [clipPlaneRef.current] : [],
      });

      const overhang = rf.overhang ?? 0.40;
      const bMinX = rf.customBounds?.minX ?? buildingBounds.minX;
      const bMaxX = rf.customBounds?.maxX ?? buildingBounds.maxX;
      const bMinZ = rf.customBounds?.minY ?? buildingBounds.minZ;
      const bMaxZ = rf.customBounds?.maxY ?? buildingBounds.maxZ;

      const rMinX = bMinX - overhang;
      const rMaxX = bMaxX + overhang;
      const rMinZ = bMinZ - overhang;
      const rMaxZ = bMaxZ + overhang;

      const rW = rMaxX - rMinX;
      const rD = rMaxZ - rMinZ;
      const rCenterX = (rMinX + rMaxX) / 2;
      const rCenterZ = (rMinZ + rMaxZ) / 2;
      const rBaseY = rf.baseHeight ?? buildingBounds.maxH;
      const rHeight = rf.height ?? 2.20;

      // 10a. SATTELDACH (Gable Roof)
      if (rf.type === 'gable') {
        const isHoriz = rf.ridgeDirection === 'horizontal';
        const span = isHoriz ? rD : rW;
        const length = isHoriz ? rW : rD;

        const roofShape = new THREE.Shape();
        roofShape.moveTo(-span / 2, 0);
        roofShape.lineTo(0, rHeight);
        roofShape.lineTo(span / 2, 0);
        roofShape.closePath();

        const extrudeSettings = { depth: length, bevelEnabled: false };
        const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);

        if (isHoriz) {
          roofGeo.rotateY(Math.PI / 2);
          roofGeo.translate(rCenterX - length / 2, rBaseY, rCenterZ);
        } else {
          roofGeo.translate(rCenterX, rBaseY, rCenterZ - length / 2);
        }

        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        roofMesh.userData = { type: 'roof', id: rf.id };
        scene.add(roofMesh);
        interactiveMeshesRef.current.push(roofMesh);
      }
      // 10b. PULTDACH (Shed / Monopitch)
      else if (rf.type === 'shed') {
        const roofShape = new THREE.Shape();
        roofShape.moveTo(-rD / 2, 0);
        roofShape.lineTo(rD / 2, rHeight);
        roofShape.lineTo(rD / 2, rHeight - 0.15);
        roofShape.lineTo(-rD / 2, -0.15);
        roofShape.closePath();

        const extrudeSettings = { depth: rW, bevelEnabled: false };
        const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
        roofGeo.rotateY(Math.PI / 2);
        roofGeo.translate(rCenterX - rW / 2, rBaseY, rCenterZ);

        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        roofMesh.userData = { type: 'roof', id: rf.id };
        scene.add(roofMesh);
        interactiveMeshesRef.current.push(roofMesh);
      }
      // 10c. FLACHDACH (Flat with Attika)
      else if (rf.type === 'flat') {
        const slabGeo = new THREE.BoxGeometry(rW, 0.25, rD);
        const slabMesh = new THREE.Mesh(slabGeo, roofMat);
        slabMesh.position.set(rCenterX, rBaseY + 0.12, rCenterZ);
        slabMesh.castShadow = true;
        slabMesh.userData = { type: 'roof', id: rf.id };
        scene.add(slabMesh);
        interactiveMeshesRef.current.push(slabMesh);

        // Attika border around perimeter
        const attikaGeo = new THREE.BoxGeometry(rW, 0.40, 0.20);
        const attikaNorth = new THREE.Mesh(attikaGeo, extWallMat);
        attikaNorth.position.set(rCenterX, rBaseY + 0.35, rMinZ + 0.1);
        scene.add(attikaNorth);

        const attikaSouth = new THREE.Mesh(attikaGeo, extWallMat);
        attikaSouth.position.set(rCenterX, rBaseY + 0.35, rMaxZ - 0.1);
        scene.add(attikaSouth);
      }
      // 10d. WALMDACH (Hip Roof / Pyramid)
      else {
        const coneGeo = new THREE.ConeGeometry(Math.max(rW, rD) * 0.7, rHeight, 4);
        coneGeo.rotateY(Math.PI / 4);
        const hipMesh = new THREE.Mesh(coneGeo, roofMat);
        hipMesh.position.set(rCenterX, rBaseY + rHeight / 2, rCenterZ);
        hipMesh.castShadow = true;
        hipMesh.userData = { type: 'roof', id: rf.id };
        scene.add(hipMesh);
        interactiveMeshesRef.current.push(hipMesh);
      }

      // Chimney
      if (rf.hasChimney) {
        const chimGeo = new THREE.BoxGeometry(0.7, 2.6, 0.7);
        const chimMat = new THREE.MeshStandardMaterial({
          color: isDark ? '#78350f' : '#b45309',
          roughness: 0.9,
          clippingPlanes: enableClip ? [clipPlaneRef.current] : [],
        });
        const chimMesh = new THREE.Mesh(chimGeo, chimMat);
        const cx = rf.chimneyPosition?.x ?? rCenterX + rW * 0.2;
        const cz = rf.chimneyPosition?.y ?? rCenterZ;
        chimMesh.position.set(cx, rBaseY + rHeight * 0.85, cz);
        chimMesh.castShadow = true;
        scene.add(chimMesh);
      }
    }

    // 11. Animation Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Sun simulation
      if (dirLightRef.current) {
        const sunAngle = ((sunHour - 6) / 12) * Math.PI; // 6:00 to 18:00
        const sunY = Math.max(1.0, Math.sin(sunAngle) * 22);
        const sunX = Math.cos(sunAngle) * 25 + buildingBounds.centerX;
        const sunZ = buildingBounds.centerZ + 15;
        dirLightRef.current.position.set(sunX, sunY, sunZ);
        dirLightRef.current.target.position.set(buildingBounds.centerX, 0, buildingBounds.centerZ);
        dirLightRef.current.target.updateMatrixWorld();
      }

      // First-person walkthrough WASD
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

        fpPosRef.current.y = eyeHeight;
        cameraRef.current.position.copy(fpPosRef.current);

        const lookDir = new THREE.Vector3(
          -Math.sin(fpYawRef.current) * Math.cos(fpPitchRef.current),
          Math.sin(fpPitchRef.current),
          -Math.cos(fpYawRef.current) * Math.cos(fpPitchRef.current)
        );
        cameraRef.current.lookAt(fpPosRef.current.clone().add(lookDir));
      } else if (cameraRef.current) {
        // Orbit Navigation
        const { theta, phi, radius } = orbitAnglesRef.current;
        const x = cameraTargetRef.current.x + radius * Math.sin(phi) * Math.sin(theta);
        const y = cameraTargetRef.current.y + radius * Math.cos(phi);
        const z = cameraTargetRef.current.z + radius * Math.sin(phi) * Math.cos(theta);

        cameraRef.current.position.set(x, y, z);
        cameraRef.current.lookAt(cameraTargetRef.current);
      }

      renderer.render(scene, camera);

      // Update ViewCube 3D rotation matrix
      if (viewCubeRef.current && cameraRef.current) {
        const theta = orbitAnglesRef.current.theta;
        const phi = orbitAnglesRef.current.phi;
        // Transform ViewCube in CSS 3D
        viewCubeRef.current.style.transform = `rotateX(${Math.round((phi - Math.PI / 2) * (180 / Math.PI))}deg) rotateY(${Math.round(-theta * (180 / Math.PI))}deg)`;
      }
    };

    animate();

    // Resize handler
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
  }, [
    floor,
    project.plot,
    showRoof,
    showCeilings,
    showFurniture,
    showPlotGround,
    transparentWalls,
    enableClip,
    clipHeight,
    isDark,
    selection,
    buildingBounds,
    eyeHeight,
  ]);

  // Pointer & Touch Events (Orbit, Pan, Zoom, and 3D Raycasting click)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let dragDistance = 0;

    const handlePointerDown = (e: PointerEvent) => {
      dragDistance = 0;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
      if (e.button === 2 || e.shiftKey || e.button === 1) {
        isPanningRef.current = true;
      } else {
        isDraggingRef.current = true;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current && !isPanningRef.current) return;

      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
      dragDistance += Math.hypot(dx, dy);

      if (navMode === 'firstPerson') {
        fpYawRef.current -= dx * 0.003;
        fpPitchRef.current = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, fpPitchRef.current - dy * 0.003));
      } else if (isPanningRef.current) {
        // Pan camera target
        const factor = orbitAnglesRef.current.radius * 0.0015;
        const forward = new THREE.Vector3(-Math.sin(orbitAnglesRef.current.theta), 0, -Math.cos(orbitAnglesRef.current.theta));
        const right = new THREE.Vector3(Math.cos(orbitAnglesRef.current.theta), 0, -Math.sin(orbitAnglesRef.current.theta));
        cameraTargetRef.current.addScaledVector(right, -dx * factor);
        cameraTargetRef.current.y += dy * factor;
      } else {
        // Orbit rotation
        orbitAnglesRef.current.theta -= dx * 0.005;
        orbitAnglesRef.current.phi = Math.max(0.01, Math.min(Math.PI / 2 - 0.02, orbitAnglesRef.current.phi - dy * 0.005));
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const wasClick = dragDistance < 5;
      isDraggingRef.current = false;
      isPanningRef.current = false;

      // 3D Raycasting Click Selection
      if (wasClick && onSelect && cameraRef.current && sceneRef.current) {
        const rect = container.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);
        const hits = raycaster.intersectObjects(interactiveMeshesRef.current, true);

        if (hits.length > 0) {
          const hit = hits[0].object;
          if (hit.userData && hit.userData.id && hit.userData.type) {
            onSelect({
              type: hit.userData.type,
              ids: [hit.userData.id],
            });
            return;
          }
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.02;
      orbitAnglesRef.current.radius = Math.max(3, Math.min(60, orbitAnglesRef.current.radius + zoomDelta));
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('contextmenu', handleContextMenu);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [navMode, onSelect]);

  // Keyboard navigation for First-Person Walkthrough
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

  // PNG Screenshot
  const handleScreenshot = () => {
    if (!rendererRef.current) return;
    const url = rendererRef.current.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Hausplaner_3D_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = url;
    link.click();
  };

  // OBJ 3D Model Export
  const handleExportObj = () => {
    exportProjectObj(project, floor);
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none bg-slate-900">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing outline-none" />

      {/* TOP FLOATING CONTROLS: Views, Navigation & Camera Fit */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg text-xs">
        {/* Navigation Mode */}
        <button
          onClick={() => {
            setNavMode('orbit');
            fitCameraToBuilding();
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
            navMode === 'orbit'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Orbit / Freie Drehung (Maus ziehen, Shift+Maus zum Verschieben)"
        >
          <Rotate3d className="w-3.5 h-3.5" />
          <span>Orbit</span>
        </button>

        <button
          onClick={() => {
            setNavMode('firstPerson');
            fpPosRef.current.set(buildingBounds.centerX, eyeHeight, buildingBounds.maxZ + 1.5);
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
            navMode === 'firstPerson'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Ich-Perspektive / Rundgang (WASD / Pfeiltasten, Maus zum Umschauen)"
        >
          <Footprints className="w-3.5 h-3.5" />
          <span>Rundgang</span>
        </button>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

        {/* Preset Views */}
        <div className="flex items-center gap-1 font-semibold text-[11px]">
          <button
            onClick={() => setPresetView('iso')}
            className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Isometrische 3D-Ansicht"
          >
            3D
          </button>
          <button
            onClick={() => setPresetView('top')}
            className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Draufsicht von oben (Grundriss)"
          >
            Oben
          </button>
          <button
            onClick={() => setPresetView('front')}
            className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Süd-Fassade von vorne"
          >
            Süd
          </button>
          <button
            onClick={() => setPresetView('back')}
            className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Nord-Fassade von hinten"
          >
            Nord
          </button>
          <button
            onClick={() => setPresetView('left')}
            className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            title="West-Fassade von links"
          >
            West
          </button>
          <button
            onClick={() => setPresetView('right')}
            className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Ost-Fassade von rechts"
          >
            Ost
          </button>
        </div>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

        {/* Fit / Alles anzeigen */}
        <button
          onClick={fitCameraToBuilding}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          title="Haus zentrieren & einpassen (Alles anzeigen)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* TOP RIGHT: VIEWCUBE (Orientierungswürfel) & NORTH COMPASS */}
      <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-2 pointer-events-auto">
        {/* 3D ViewCube */}
        <div className="relative w-20 h-20 perspective-[600px] flex items-center justify-center p-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
          <div
            ref={viewCubeRef}
            className="w-12 h-12 relative transform-style-3d transition-transform duration-75"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Top */}
            <div
              onClick={() => setPresetView('top')}
              className="absolute inset-0 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-white cursor-pointer select-none"
              style={{ transform: 'rotateX(90deg) translateZ(24px)' }}
            >
              OBEN
            </div>
            {/* Front (Süd) */}
            <div
              onClick={() => setPresetView('front')}
              className="absolute inset-0 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-white cursor-pointer select-none"
              style={{ transform: 'translateZ(24px)' }}
            >
              SÜD
            </div>
            {/* Back (Nord) */}
            <div
              onClick={() => setPresetView('back')}
              className="absolute inset-0 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-white cursor-pointer select-none"
              style={{ transform: 'rotateY(180deg) translateZ(24px)' }}
            >
              NORD
            </div>
            {/* Right (Ost) */}
            <div
              onClick={() => setPresetView('right')}
              className="absolute inset-0 bg-slate-300 dark:bg-slate-600 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-white cursor-pointer select-none"
              style={{ transform: 'rotateY(90deg) translateZ(24px)' }}
            >
              OST
            </div>
            {/* Left (West) */}
            <div
              onClick={() => setPresetView('left')}
              className="absolute inset-0 bg-slate-300 dark:bg-slate-600 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-white cursor-pointer select-none"
              style={{ transform: 'rotateY(-90deg) translateZ(24px)' }}
            >
              WEST
            </div>
            {/* Bottom */}
            <div
              className="absolute inset-0 bg-slate-400 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[9px] font-bold text-slate-400 select-none"
              style={{ transform: 'rotateX(-90deg) translateZ(24px)' }}
            >
              UNTEN
            </div>
          </div>
        </div>

        {/* North Arrow / Compass Indicator */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-md text-[10px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          onClick={() => setPresetView('front')}
          title="Nordrichtung (Klick richtet Blick nach Norden aus)"
        >
          <div
            className="w-3.5 h-3.5 text-red-500 flex items-center justify-center font-bold"
            style={{ transform: `rotate(${-orbitAnglesRef.current.theta * (180 / Math.PI)}deg)` }}
          >
            ▲
          </div>
          <span>NORD</span>
        </div>
      </div>

      {/* BOTTOM FLOATING CONTROLS: Visibility Filters, Cutting Plane & Sun */}
      <div className="absolute bottom-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Visibility Toggles */}
        <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg text-xs pointer-events-auto">
          {/* Dach ein/aus */}
          <button
            onClick={() => setShowRoof(!showRoof)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              showRoof
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title="Dach ein-/ausblenden"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Dach</span>
          </button>

          {/* Dach-Modul Dialog Button */}
          {onOpenRoofModal && (
            <button
              onClick={onOpenRoofModal}
              className="px-2 py-1 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-[11px] flex items-center gap-1 cursor-pointer"
              title="Dach-Modul öffnen (Form, Neigung, Überstand)"
            >
              <Sliders className="w-3 h-3" />
              <span>Dach-Modul</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

          {/* Möbel ein/aus */}
          <button
            onClick={() => setShowFurniture(!showFurniture)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              showFurniture
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-bold'
                : 'text-slate-400'
            }`}
            title="Möbel ein-/ausblenden"
          >
            <span>Möbel</span>
          </button>

          {/* Grundstück & Gelände ein/aus */}
          <button
            onClick={() => setShowPlotGround(!showPlotGround)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              showPlotGround
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-bold'
                : 'text-slate-400'
            }`}
            title="Grundstück & Gelände ein-/ausblenden"
          >
            <span>Gelände</span>
          </button>

          {/* Wände transparent */}
          <button
            onClick={() => setTransparentWalls(!transparentWalls)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              transparentWalls
                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title="Wände halbtransparent (Röntgen-/Glasmodus)"
          >
            <span>Röntgen</span>
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

          {/* 3D-Schnittebene (Clipping Plane) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setEnableClip(!enableClip)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                enableClip
                  ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Horizontale Schnittebene aktivieren (3D-Grundriss-Schnitt)"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Schnitt</span>
            </button>

            {enableClip && (
              <div className="flex items-center gap-1 font-mono text-[11px] animate-in fade-in duration-150">
                <input
                  type="range"
                  min="0.4"
                  max="4.0"
                  step="0.1"
                  value={clipHeight}
                  onChange={(e) => setClipHeight(parseFloat(e.target.value))}
                  className="w-18 accent-red-500 cursor-pointer"
                />
                <span className="w-10 text-right font-bold text-red-600 dark:text-red-400">
                  {clipHeight.toFixed(1)}m
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sunlight & Export */}
        <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg text-xs pointer-events-auto">
          {/* Sun time slider */}
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 px-1 font-mono text-[11px]">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <input
              type="range"
              min="6"
              max="20"
              step="1"
              value={sunHour}
              onChange={(e) => setSunHour(parseInt(e.target.value, 10))}
              className="w-16 accent-amber-500 cursor-pointer"
              title="Sonnenstand / Tageszeit anpassen"
            />
            <span className="w-9 font-bold">{sunHour}:00</span>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

          {/* Screenshot PNG */}
          <button
            onClick={handleScreenshot}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="3D-Ansicht als hochauflösendes PNG-Bild speichern"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* OBJ Export */}
          <button
            onClick={handleExportObj}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="3D-Modell als .OBJ-Datei herunterladen (für Blender / 3ds Max / SketchUp)"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* WebGL Error fallback message */}
      {webglError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6 text-center text-slate-200">
          <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3">
            <Info className="w-8 h-8 text-amber-500" />
            <h3 className="font-bold text-sm text-white">3D-Ansicht nicht verfügbar</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{webglError}</p>
          </div>
        </div>
      )}
    </div>
  );
};

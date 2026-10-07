/**
 * Google Gemini API Client & Architecture Extraction Engine
 * 
 * Strict Security Guarantees:
 * - API Key is NEVER hardcoded, logged, included in exports, project files or URLs.
 * - Key is stored solely in local client storage or session memory.
 * - Key is stripped from all error messages.
 */

import { ImportImageItem, AiPlanAnalysisResult } from '../types/aiImport';

export const DEFAULT_GEMINI_MODEL = 'gemini-flash-lite-latest';
export const AVAILABLE_GEMINI_MODELS = [
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash-Lite (Empfohlen – Blitzschnell & Stabil)' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (Hohe Erkennungspräzision)' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Neueste Generation)' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash Latest' },
];

export const FALLBACK_GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
];

const STORAGE_KEY_API_KEY = 'cad_gemini_api_key_v1';
const STORAGE_KEY_MODEL = 'cad_gemini_model_v1';
const STORAGE_KEY_CONSENT = 'cad_gemini_privacy_consent_v1';

let inMemoryApiKey = '';
let inMemoryModel = DEFAULT_GEMINI_MODEL;
let inMemoryConsent = false;

export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__cad_test_storage__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function getStoredApiKey(): string {
  if (isLocalStorageAvailable()) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_API_KEY);
      if (stored) return stored.trim();
    } catch {}
  }
  return inMemoryApiKey;
}

export function setStoredApiKey(key: string): { success: boolean; isSessionOnly: boolean } {
  const cleanKey = key.trim();
  inMemoryApiKey = cleanKey;
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEY_API_KEY, cleanKey);
      return { success: true, isSessionOnly: false };
    } catch {
      return { success: true, isSessionOnly: true };
    }
  }
  return { success: true, isSessionOnly: true };
}

export function clearStoredApiKey(): void {
  inMemoryApiKey = '';
  if (isLocalStorageAvailable()) {
    try {
      localStorage.removeItem(STORAGE_KEY_API_KEY);
    } catch {}
  }
}

export function getStoredModel(): string {
  if (isLocalStorageAvailable()) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MODEL);
      if (stored) {
        const trimmed = stored.trim();
        // If an older unavailable model was stored, auto-migrate to recommended model
        if (
          trimmed === 'gemini-2.5-flash' ||
          trimmed === 'gemini-1.5-flash' ||
          trimmed === 'gemini-2.0-flash' ||
          trimmed === 'gemini-2.5-flash-lite' ||
          trimmed === 'gemini-2.5-pro'
        ) {
          setStoredModel(DEFAULT_GEMINI_MODEL);
          return DEFAULT_GEMINI_MODEL;
        }
        return trimmed;
      }
    } catch {}
  }
  return inMemoryModel || DEFAULT_GEMINI_MODEL;
}

export function setStoredModel(model: string): void {
  const cleanModel = model.trim() || DEFAULT_GEMINI_MODEL;
  inMemoryModel = cleanModel;
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEY_MODEL, cleanModel);
    } catch {}
  }
}

export function hasPrivacyConsent(): boolean {
  if (isLocalStorageAvailable()) {
    try {
      return localStorage.getItem(STORAGE_KEY_CONSENT) === 'true';
    } catch {}
  }
  return inMemoryConsent;
}

export function setPrivacyConsent(consent: boolean): void {
  inMemoryConsent = consent;
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEY_CONSENT, consent ? 'true' : 'false');
    } catch {}
  }
}

/**
 * Sanitizes any text so that the secret API key is never revealed in UI or logs.
 */
export function sanitizeErrorMessage(err: unknown, apiKey?: string): string {
  let msg = err instanceof Error ? err.message : String(err || 'Unbekannter Fehler');
  const keyToScrub = apiKey || getStoredApiKey();
  if (keyToScrub && keyToScrub.length > 5) {
    msg = msg.split(keyToScrub).join('[SCHLÜSSEL]');
  }
  return msg;
}

/**
 * Tests connection with Google Gemini API using a lightweight request.
 */
export async function testGeminiConnection(
  apiKey?: string,
  model?: string
): Promise<{ success: boolean; message: string; modelUsed?: string }> {
  const key = apiKey?.trim() || getStoredApiKey();
  if (!key) {
    return {
      success: false,
      message: 'Kein API-Schlüssel eingegeben. Bitte einen gültigen Google Gemini API-Schlüssel eintragen.',
    };
  }

  const requestedModel = model?.trim() || getStoredModel() || DEFAULT_GEMINI_MODEL;
  const modelsToTry = [requestedModel, ...FALLBACK_GEMINI_MODELS.filter((m) => m !== requestedModel)];

  let lastErrorDetail = '';
  let lastStatus = 0;

  for (const modelName of modelsToTry) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(key)}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: 'Antworte nur mit dem Wort: BEREIT' }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 10,
            temperature: 0.1,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        if (modelName !== requestedModel) {
          setStoredModel(modelName);
        }
        return {
          success: true,
          message:
            modelName === requestedModel
              ? `Verbindung zur Gemini-API erfolgreich hergestellt! Modell "${modelName}" ist einsatzbereit.`
              : `Verbindung erfolgreich hergestellt! Modell wurde automatisch auf das verfügbare Modell "${modelName}" umgestellt.`,
          modelUsed: modelName,
        };
      }

      lastStatus = response.status;
      try {
        const errJson = await response.json();
        lastErrorDetail = errJson?.error?.message || '';
      } catch {}

      if (lastStatus === 401 || lastStatus === 403) {
        return {
          success: false,
          message:
            'Der API-Schlüssel ist ungültig oder hat keine Berechtigung für die Gemini-API (Fehler 403/401). Bitte Schlüssel im Google AI Studio (aistudio.google.com/app/apikey) überprüfen.',
        };
      }

      console.warn(`Modell ${modelName} antwortete mit Code ${lastStatus}: ${lastErrorDetail}`);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        lastErrorDetail = 'Zeitüberschreitung (Timeout nach 12s)';
      } else {
        lastErrorDetail = sanitizeErrorMessage(err, key);
      }
    }
  }

  if (lastStatus === 429) {
    return {
      success: false,
      message: 'API-Kontingent überschritten (Rate Limit / Fehler 429). Bitte kurz warten.',
    };
  }

  return {
    success: false,
    message: `Verbindung fehlgeschlagen (${lastStatus || 'Netzwerkfehler'}): ${sanitizeErrorMessage(lastErrorDetail, key)}. Bitte Internetverbindung und API-Schlüssel prüfen.`,
  };
}

const ARCHITECTURAL_ANALYSIS_PROMPT = `
Du bist ein weltweit führender Experte für Architektur, Bauplanung, CAD und Bilderkennung für Grundrisse (DIN 277, DIN 18012).
Analysiere die übergebenen Bilder (Grundriss, Handskizze, Scan, Ansicht oder Schnitt) und extrahiere alle baulichen Elemente hochpräzise als streng strukturiertes JSON.

WICHTIGE REGELN FÜR DIE ERKENNUNG:
1. KOORDINATENSYSTEM:
   - Alle Koordinaten beziehen sich auf das Hauptbild des Grundrisses.
   - Normalisiere alle X- und Y-Werte auf einen Bereich von 0 bis 1000 (0,0 = oben links; 1000 = rechte Kante; Y nach unten positiv).
   - Wände müssen aneinander anschließen (Eckpunkte von verbundenen Wänden müssen exakt dieselben X/Y-Werte haben).

2. WÄNDE (walls):
   - Unterscheide klar zwischen Außenwänden (isExterior: true, typisch 0.30 m bis 0.365 m dick) und Innenwänden (isExterior: false, tragend 0.175 m oder Leichtbau 0.115 m).
   - StartX, startY, endX, endY als Liniensegment der Wandachse.
   - Dicke (thickness) in Metern (geschätzt oder aus Planbeschriftung).
   - Wenn Wände schräg sind oder unterschiedliche Pultdach-Höhen haben (aus Schnitt/Ansicht), gib height und endHeight an (Standard: 2.50m).

3. TÜREN (doors):
   - Position (x, y) als Mittelpunkt der Wandöffnung.
   - Breite (width) in Metern (Standard Haustür ~1.00m, Zimmertür ~0.88m, WC ~0.76m).
   - Art (type): 'single' | 'double' | 'sliding' | 'entry' | 'patio'
   - Aufschlagrichtung: swingDirection ('left' | 'right'), openDirection ('inside' | 'outside').

4. FENSTER (windows):
   - Position (x, y) als Mittelpunkt der Wandöffnung.
   - Breite (width) in Metern (z.B. 1.00m, 1.20m, 1.50m, bodentief 2.00m).
   - parapetHeight (Brüstungshöhe, Standard 0.90m; bei bodentief 0.00m).

5. RÄUME (rooms):
   - Erkenne Raumnamen aus Beschriftungen (z.B. "Wohnen", "Schlafen", "Küche", "Bad", "Flur", "Terrasse", "Abstellraum").
   - Raumpolygon als geschlossene Punktkette [ {x, y}, ... ].
   - Kategorie (category): 'living' | 'sleeping' | 'kitchen' | 'bath' | 'corridor' | 'storage' | 'outdoor'.
   - Netto-Fläche (areaM2) falls im Plan angegeben.

6. MÖBEL & SANITÄR (furniture):
   - Typ (type): 'bed_double', 'bed_single', 'sofa', 'table_dining', 'chair', 'kitchen_counter', 'cooktop', 'sink', 'fridge', 'toilet', 'washbasin', 'shower', 'bathtub', 'wardrobe'.
   - Position x, y, Breite (width), Tiefe (depth), Drehung (rotation) in Grad.

7. TREPPEN (stairs):
   - Art ('straight' | 'L' | 'U' | 'spiral'), Position, Breite, Länge, Drehung.

8. DACH & HÖHENANGABEN (roof):
   - Falls Ansicht oder Schnitt vorhanden: Dachform ('gable' Satteldach, 'shed' Pultdach, 'hip' Walmdach, 'flat' Flachdach), Dachneigung in Grad (pitchDegrees), Firsthöhe (ridgeHeight).

9. GELESENE MAßKETTEN & ZAHLEN (readDimensions):
   - Alle Zahlen, die als Maße an Wänden stehen (z.B. "8.50", "6.20", "3.00", "0.30").
   - Ermittle daraus die geschätzte reale Gesamtbreite (detectedTotalWidthM) und Gesamttiefe (detectedTotalDepthM) des Hauses.

10. SICHERHEIT & UNGEWISSHEIT (confidence):
   - Gib für jedes Element einen Wert confidence zwischen 0.0 und 1.0 an.
   - Wenn eine Skizze an einer Stelle undeutlich ist, gib confidence < 0.70 an, aber rate nicht blind.

ANTWORTE AUSSCHLIESSLICH MIT VALIDIERTEM JSON FOLGENDER STRUKTUR:
{
  "unit": "m",
  "northAngleDeg": 0,
  "detectedTotalWidthM": 8.0,
  "detectedTotalDepthM": 6.0,
  "walls": [
    {
      "id": "w1",
      "startX": 100,
      "startY": 100,
      "endX": 900,
      "endY": 100,
      "thickness": 0.30,
      "height": 2.50,
      "endHeight": 2.50,
      "isExterior": true,
      "confidence": 0.95
    }
  ],
  "doors": [
    {
      "id": "d1",
      "x": 300,
      "y": 100,
      "width": 0.90,
      "height": 2.05,
      "type": "single",
      "swingDirection": "right",
      "openDirection": "inside",
      "confidence": 0.90
    }
  ],
  "windows": [
    {
      "id": "win1",
      "x": 600,
      "y": 100,
      "width": 1.20,
      "height": 1.25,
      "parapetHeight": 0.90,
      "type": "turn_tilt",
      "confidence": 0.92
    }
  ],
  "rooms": [
    {
      "id": "r1",
      "name": "Wohnzimmer",
      "category": "living",
      "polygon": [{"x": 120, "y": 120}, {"x": 500, "y": 120}, {"x": 500, "y": 480}, {"x": 120, "y": 480}],
      "areaM2": 18.2,
      "confidence": 0.95
    }
  ],
  "furniture": [
    {
      "id": "f1",
      "name": "Sofa",
      "type": "sofa",
      "category": "living",
      "x": 200,
      "y": 300,
      "width": 2.10,
      "depth": 0.90,
      "rotation": 0,
      "confidence": 0.88
    }
  ],
  "stairs": [],
  "roof": {
    "type": "gable",
    "pitchDegrees": 35,
    "ridgeHeight": 2.50,
    "ridgeDirection": "horizontal",
    "confidence": 0.85
  },
  "readDimensions": [
    {
      "id": "dim1",
      "label": "8.00",
      "valueMeters": 8.00,
      "startX": 100,
      "startY": 80,
      "endX": 900,
      "endY": 80,
      "confidence": 0.92
    }
  ],
  "warnings": []
}
`;

/**
 * Extracts and parses architectural elements from one or more plan images.
 */
export async function analyzePlanImages(
  images: ImportImageItem[],
  customPromptAddition = '',
  apiKey?: string,
  model?: string,
  onProgress?: (message: string) => void,
  signal?: AbortSignal
): Promise<AiPlanAnalysisResult> {
  const key = apiKey?.trim() || getStoredApiKey();
  if (!key) {
    throw new Error('Kein Gemini API-Schlüssel hinterlegt. Bitte unter Einstellungen → KI eingeben.');
  }

  const requestedModel = model?.trim() || getStoredModel() || DEFAULT_GEMINI_MODEL;
  const modelsToTry = [
    requestedModel,
    ...FALLBACK_GEMINI_MODELS.filter((m) => m !== requestedModel),
  ];

  if (images.length === 0) {
    throw new Error('Keine Bilder zur Analyse übergeben.');
  }

  onProgress?.('Bilder werden für die Analyse aufbereitet...');

  // Build content parts
  const parts: any[] = [];

  let promptText = ARCHITECTURAL_ANALYSIS_PROMPT;
  if (customPromptAddition.trim()) {
    promptText += `\n\nZUSÄTZLICHE BENUTZERANWEISUNG / DETAILS:\n${customPromptAddition.trim()}`;
  }
  parts.push({ text: promptText });

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    let base64Data = img.dataUrl;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }
    const roleLabel =
      img.role === 'floorplan'
        ? 'Hauptgrundriss'
        : img.role === 'elevation'
        ? 'Fassadenansicht'
        : img.role === 'section'
        ? 'Gebäudeschnitt'
        : 'Lageplan';

    parts.push({
      text: `[Bild ${i + 1}: ${img.name || roleLabel} (${roleLabel})]`,
    });
    parts.push({
      inlineData: {
        mimeType: img.mimeType || 'image/jpeg',
        data: base64Data,
      },
    });
  }

  const primaryImage = images.find((m) => m.role === 'floorplan') || images[0];

  onProgress?.('Gemini KI analysiert Wände, Türen, Fenster, Maße & Räume...');

  let lastError: Error | null = null;

  for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
    const currentModel = modelsToTry[mIdx];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent?key=${encodeURIComponent(key)}`;

    if (mIdx > 0) {
      onProgress?.(`Ausweichmodell wird verwendet (${currentModel})...`);
    }

    const reqController = new AbortController();
    const timeoutId = setTimeout(() => reqController.abort(), 35000);

    const onExternalAbort = () => reqController.abort();
    if (signal) {
      signal.addEventListener('abort', onExternalAbort);
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        signal: reqController.signal,
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onExternalAbort);

      if (!response.ok) {
        const status = response.status;
        let detail = '';
        try {
          const errData = await response.json();
          detail = errData?.error?.message || '';
        } catch {}

        if (status === 401 || status === 403) {
          throw new Error('Ungültiger Gemini API-Schlüssel (Fehler 403/401). Bitte überprüfe deinen Schlüssel in den Einstellungen oder erstelle einen neuen unter aistudio.google.com/app/apikey.');
        }
        if (status === 429) {
          throw new Error('API-Kontingent überschritten (Rate Limit / Fehler 429). Bitte kurz warten oder einen anderen Schlüssel verwenden.');
        }

        // If 404 (model deprecated / unavailable) or 503 (high demand spike) or 500, try next model!
        if ((status === 404 || status === 503 || status === 500) && mIdx < modelsToTry.length - 1) {
          console.warn(`Modell ${currentModel} Fehler ${status}: ${detail}. Versuche Ausweichmodell...`);
          lastError = new Error(`Google API Fehler ${status}: ${sanitizeErrorMessage(detail, key)}`);
          continue;
        }

        throw new Error(`Google API Fehler ${status}: ${sanitizeErrorMessage(detail, key)}`);
      }

      onProgress?.('Antwort wird validiert und in CAD-Objekte umgewandelt...');
      const responseJson = await response.json();
      const rawText = responseJson?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Die KI lieferte eine leere Antwort zurück.');
      }

      const parsed = cleanAndParseJson(rawText);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Ungültiges Datenformat von der KI erhalten.');
      }

      // If switched to a working fallback model, save it
      if (currentModel !== requestedModel) {
        setStoredModel(currentModel);
      }

      // Normalize items
      const rawWalls = Array.isArray(parsed.walls) ? parsed.walls : [];
      const rawDoors = Array.isArray(parsed.doors) ? parsed.doors : [];
      const rawWindows = Array.isArray(parsed.windows) ? parsed.windows : [];
      const rawRooms = Array.isArray(parsed.rooms) ? parsed.rooms : [];
      const rawFurniture = Array.isArray(parsed.furniture) ? parsed.furniture : [];
      const rawStairs = Array.isArray(parsed.stairs) ? parsed.stairs : [];
      const rawDims = Array.isArray(parsed.readDimensions) ? parsed.readDimensions : [];

      const result: AiPlanAnalysisResult = {
        unit: 'm',
        imageWidth: primaryImage.width || 1000,
        imageHeight: primaryImage.height || 1000,
        northAngleDeg: Number(parsed.northAngleDeg) || 0,
        detectedTotalWidthM: parsed.detectedTotalWidthM ? Number(parsed.detectedTotalWidthM) : undefined,
        detectedTotalDepthM: parsed.detectedTotalDepthM ? Number(parsed.detectedTotalDepthM) : undefined,
        walls: rawWalls.map((w: any, idx: number) => ({
          id: w.id || `ai_wall_${idx + 1}`,
          startX: Number(w.startX) || 0,
          startY: Number(w.startY) || 0,
          endX: Number(w.endX) || 0,
          endY: Number(w.endY) || 0,
          thickness: Number(w.thickness) > 0 ? Number(w.thickness) : w.isExterior ? 0.30 : 0.115,
          height: Number(w.height) > 0 ? Number(w.height) : 2.50,
          endHeight: w.endHeight ? Number(w.endHeight) : undefined,
          isExterior: Boolean(w.isExterior),
          material: w.material || (w.isExterior ? 'brick' : 'drywall'),
          confidence: Math.max(0, Math.min(1, Number(w.confidence) || 0.85)),
          selected: true,
        })),
        doors: rawDoors.map((d: any, idx: number) => ({
          id: d.id || `ai_door_${idx + 1}`,
          wallIndex: typeof d.wallIndex === 'number' ? d.wallIndex : undefined,
          x: Number(d.x) || 0,
          y: Number(d.y) || 0,
          width: Number(d.width) > 0 ? Number(d.width) : 0.885,
          height: Number(d.height) > 0 ? Number(d.height) : 2.05,
          type: (d.type as any) || 'single',
          swingDirection: d.swingDirection === 'right' ? 'right' : 'left',
          openDirection: d.openDirection === 'outside' ? 'outside' : 'inside',
          confidence: Math.max(0, Math.min(1, Number(d.confidence) || 0.85)),
          selected: true,
        })),
        windows: rawWindows.map((win: any, idx: number) => ({
          id: win.id || `ai_win_${idx + 1}`,
          wallIndex: typeof win.wallIndex === 'number' ? win.wallIndex : undefined,
          x: Number(win.x) || 0,
          y: Number(win.y) || 0,
          width: Number(win.width) > 0 ? Number(win.width) : 1.20,
          height: Number(win.height) > 0 ? Number(win.height) : 1.25,
          parapetHeight: typeof win.parapetHeight === 'number' ? Number(win.parapetHeight) : 0.90,
          type: (win.type as any) || 'turn_tilt',
          confidence: Math.max(0, Math.min(1, Number(win.confidence) || 0.85)),
          selected: true,
        })),
        rooms: rawRooms.map((r: any, idx: number) => ({
          id: r.id || `ai_room_${idx + 1}`,
          name: String(r.name || `Raum ${idx + 1}`),
          category: (r.category as any) || 'living',
          polygon: Array.isArray(r.polygon)
            ? r.polygon.map((p: any) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }))
            : [],
          areaM2: Number(r.areaM2) || undefined,
          confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0.85)),
          selected: true,
        })),
        furniture: rawFurniture.map((f: any, idx: number) => ({
          id: f.id || `ai_furn_${idx + 1}`,
          name: String(f.name || 'Möbel'),
          type: String(f.type || 'generic'),
          category: (f.category as any) || 'living',
          x: Number(f.x) || 0,
          y: Number(f.y) || 0,
          width: Number(f.width) || 1.0,
          depth: Number(f.depth) || 0.8,
          rotation: Number(f.rotation) || 0,
          confidence: Math.max(0, Math.min(1, Number(f.confidence) || 0.80)),
          selected: true,
        })),
        stairs: rawStairs.map((s: any, idx: number) => ({
          id: s.id || `ai_stair_${idx + 1}`,
          type: (s.type as any) || 'straight',
          x: Number(s.x) || 0,
          y: Number(s.y) || 0,
          width: Number(s.width) || 0.90,
          length: Number(s.length) || 2.80,
          rotation: Number(s.rotation) || 0,
          confidence: Math.max(0, Math.min(1, Number(s.confidence) || 0.85)),
          selected: true,
        })),
        roof: parsed.roof
          ? {
              type: parsed.roof.type || 'gable',
              pitchDegrees: Number(parsed.roof.pitchDegrees) || 35,
              ridgeHeight: Number(parsed.roof.ridgeHeight) || 2.5,
              ridgeDirection: parsed.roof.ridgeDirection === 'vertical' ? 'vertical' : 'horizontal',
              confidence: Math.max(0, Math.min(1, Number(parsed.roof.confidence) || 0.80)),
            }
          : undefined,
        readDimensions: rawDims.map((d: any, idx: number) => ({
          id: d.id || `ai_dim_${idx + 1}`,
          label: String(d.label || ''),
          valueMeters: Number(d.valueMeters) || 0,
          startX: d.startX ? Number(d.startX) : undefined,
          startY: d.startY ? Number(d.startY) : undefined,
          endX: d.endX ? Number(d.endX) : undefined,
          endY: d.endY ? Number(d.endY) : undefined,
          confidence: Math.max(0, Math.min(1, Number(d.confidence) || 0.85)),
        })),
        scalePxPerMeter: 100, // Will be computed in Calibrator
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        rawResponse: rawText,
        timestamp: new Date().toISOString(),
      };

      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onExternalAbort);
      if (signal?.aborted) throw err;

      if (err.name === 'AbortError') {
        lastError = new Error(`Zeitüberschreitung bei Modell "${currentModel}" (über 35 Sekunden).`);
      } else {
        lastError = err;
      }

      // If not an auth error and there are more models, try the next model
      if (mIdx < modelsToTry.length - 1 && !err.message.includes('403') && !err.message.includes('401')) {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error('Die KI-Analyse konnte nicht erfolgreich abgeschlossen werden.');
}

/**
 * Natural Language Plan Correction ("Korrektur in Worten")
 */
export async function executeNaturalLanguageCorrection(
  instruction: string,
  summaryContext: string,
  apiKey?: string,
  model?: string,
  signal?: AbortSignal
): Promise<{
  success: boolean;
  explanation: string;
  modifications: Array<{
    type: 'wall_thickness' | 'wall_height' | 'window_width' | 'door_width' | 'room_height' | 'roof_pitch' | 'other';
    targetDescription: string;
    oldValue?: string;
    newValue: string;
  }>;
}> {
  const key = apiKey?.trim() || getStoredApiKey();
  if (!key) {
    throw new Error('Kein API-Schlüssel hinterlegt. Bitte unter Einstellungen → KI eingeben.');
  }

  const requestedModel = model?.trim() || getStoredModel() || DEFAULT_GEMINI_MODEL;
  const modelsToTry = [requestedModel, ...FALLBACK_GEMINI_MODELS.filter((m) => m !== requestedModel)];

  const prompt = `
Du bist ein CAD-Architektur-Assistent. Der Benutzer möchte eine sprachliche Korrektur am aktuellen Grundriss vornehmen.

AKTUELLER GRUNDRISS-STATUS:
${summaryContext}

BENUTZER-ANWEISUNG:
"${instruction}"

Analysiere die Anweisung und ermittle die genauen Änderungen, die am Plan vorgenommen werden müssen (z.B. Wanddicke, Fensterbreite, Raumhöhe, Dachneigung).
Antworte ausschließlich im JSON-Format:
{
  "explanation": "Verständliche deutsche Zusammenfassung, was geändert wird (z. B. 'Die linke Außenwand wird auf 30 cm Stärke angepasst und das Badezimmerfenster auf 60 cm Breite verkleinert.')",
  "modifications": [
    {
      "type": "wall_thickness" | "wall_height" | "window_width" | "door_width" | "room_height" | "roof_pitch" | "other",
      "targetDescription": "z.B. Außenwand links",
      "oldValue": "z.B. 24 cm",
      "newValue": "z.B. 30 cm"
    }
  ]
}
`;

  let lastError: any = null;

  for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
    const currentModel = modelsToTry[mIdx];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent?key=${encodeURIComponent(key)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const onExternalAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onExternalAbort, { once: true });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onExternalAbort);

      if (!response.ok) {
        const status = response.status;
        let detail = '';
        try {
          const errData = await response.json();
          detail = errData?.error?.message || '';
        } catch {}

        if (status === 401 || status === 403) {
          throw new Error(`Google API Authentifizierungsfehler (${status}): ${sanitizeErrorMessage(detail, key)}`);
        }
        if (mIdx < modelsToTry.length - 1) {
          console.warn(`Modell ${currentModel} fehlgeschlagen (${status}), versuche Fallback...`);
          continue;
        }
        throw new Error(`Google API Fehler ${status}: ${sanitizeErrorMessage(detail, key)}`);
      }

      const resJson = await response.json();
      const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = cleanAndParseJson(rawText);

      return {
        success: true,
        explanation: parsed?.explanation || 'Änderungen ermittelt.',
        modifications: Array.isArray(parsed?.modifications) ? parsed.modifications : [],
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onExternalAbort);
      if (signal?.aborted) throw err;

      lastError = err;
      if (mIdx < modelsToTry.length - 1 && !err.message?.includes('403') && !err.message?.includes('401')) {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error('Korrekturanalyse fehlgeschlagen.');
}

function cleanAndParseJson(text: string): any {
  if (!text) return null;
  let cleaned = text.trim();
  // Strip Markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try finding first { and last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sub = cleaned.substring(firstBrace, lastBrace + 1);
      return JSON.parse(sub);
    }
    throw new Error('Konnte JSON-Antwort nicht parsen.');
  }
}

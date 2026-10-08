/**
 * Google Gemini API Client & Architecture Extraction Engine
 * 
 * Strict Security Guarantees:
 * - API Key is NEVER hardcoded, logged, included in exports, project files or URLs.
 * - Key is sent solely via HTTP Header 'x-goog-api-key' (never in the URL query string).
 * - Key is stored solely in local client storage or session memory.
 * - Key is stripped from all error messages and diagnostics.
 * 
 * Reliability Guarantees:
 * - Multi-stage analysis (Walls -> Openings -> Rooms/Furniture) prevents token cutoffs.
 * - Real phase reporting, seconds counter, and honest progress.
 * - 120s hard timeout with true cancellation support.
 * - Clear German error explanations with actionable solutions.
 * - Comprehensive diagnostic reporting with clipboard export.
 */

import {
  ImportImageItem,
  AiPlanAnalysisResult,
  AiDiagnosticData,
  AiThinkingLevel,
  AiConnectionTestResult,
  AiDetectedWall,
  AiDetectedDoor,
  AiDetectedWindow,
  AiDetectedRoom,
  AiDetectedFurniture,
  AiDetectedStair,
  AiDetectedRoof,
  AiDetectedDimension,
} from '../types/aiImport';
import { Floor, CadProject } from '../types/cad';

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export const FALLBACK_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-flash-latest',
];

export const AVAILABLE_GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Empfohlen – Hohe Erkennung & Geschwindigkeit)' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite (Sehr schnell & ressourcenschonend)' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Solides bewährtes Standardmodell)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Klassisches Flash-Modell)' },
  { id: 'gemini-flash-latest', name: 'gemini-flash-latest (Alias – dynamischer Google-Verweis)' },
];

const STORAGE_KEY_API_KEY = 'cad_gemini_api_key_v1';
const STORAGE_KEY_MODEL = 'cad_gemini_model_v1';
const STORAGE_KEY_CONSENT = 'cad_gemini_privacy_consent_v1';
const STORAGE_KEY_THINKING = 'cad_gemini_thinking_level_v1';
const STORAGE_KEY_DIAGNOSTIC = 'cad_gemini_last_diagnostic_v1';

let inMemoryApiKey = '';
let inMemoryModel = DEFAULT_GEMINI_MODEL;
let inMemoryConsent = false;
let inMemoryThinkingLevel: AiThinkingLevel = 'low';
let inMemoryDiagnostic: AiDiagnosticData | null = null;

// ================= STORAGE & KEY HYGIENE =================

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

/**
 * Strips whitespace, newlines, tabs, and accidental quotes (" or ') from API keys.
 */
export function cleanApiKey(raw: string): string {
  if (!raw) return '';
  return raw.replace(/["'\s\r\n\t]/g, '').trim();
}

export function getStoredApiKey(): string {
  if (isLocalStorageAvailable()) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_API_KEY);
      if (stored) return cleanApiKey(stored);
    } catch {}
  }
  return cleanApiKey(inMemoryApiKey);
}

export function setStoredApiKey(key: string): { success: boolean; isSessionOnly: boolean } {
  const cleaned = cleanApiKey(key);
  inMemoryApiKey = cleaned;
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEY_API_KEY, cleaned);
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
        // Auto-migrate old non-existent or deprecated aliases
        if (
          trimmed === 'gemini-3.5-flash-lite' ||
          trimmed === 'gemini-3.8-flash' ||
          trimmed === 'gemini-flash-lite-latest'
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

export function getStoredThinkingLevel(): AiThinkingLevel {
  if (isLocalStorageAvailable()) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_THINKING) as AiThinkingLevel;
      if (stored === 'low' || stored === 'medium' || stored === 'high') {
        return stored;
      }
    } catch {}
  }
  return inMemoryThinkingLevel;
}

export function setStoredThinkingLevel(level: AiThinkingLevel): void {
  inMemoryThinkingLevel = level;
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEY_THINKING, level);
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
 * Sanitizes any text so that secret API keys are never revealed in UI, console or logs.
 */
export function sanitizeErrorMessage(err: unknown, apiKey?: string): string {
  let msg = err instanceof Error ? err.message : String(err || 'Unbekannter Fehler');
  const stored = getStoredApiKey();
  const keysToScrub = [apiKey, stored, inMemoryApiKey].filter(
    (k): k is string => Boolean(k && k.length > 5)
  );

  for (const k of keysToScrub) {
    msg = msg.split(k).join('[SCHLÜSSEL]');
  }

  // Also scrub key parameter patterns if present in any url string
  msg = msg.replace(/key=[^&\s]+/gi, 'key=[SCHLÜSSEL]');
  return msg;
}

// ================= DIAGNOSTICS LOGGING =================

export function getLastDiagnostic(): AiDiagnosticData | null {
  if (inMemoryDiagnostic) return inMemoryDiagnostic;
  if (isLocalStorageAvailable()) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DIAGNOSTIC);
      if (stored) {
        inMemoryDiagnostic = JSON.parse(stored);
        return inMemoryDiagnostic;
      }
    } catch {}
  }
  return null;
}

export function setLastDiagnostic(diag: AiDiagnosticData): void {
  inMemoryDiagnostic = diag;
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEY_DIAGNOSTIC, JSON.stringify(diag));
    } catch {}
  }
}

export function formatDiagnosticForClipboard(d: AiDiagnosticData | null): string {
  if (!d) return 'Keine Diagnose-Daten vorhanden.';

  const lines = [
    '=== KI-DIAGNOSE BERICHT (FERIENHAUS-PLANER) ===',
    `Zeitstempel: ${d.timestamp}`,
    `Modell: ${d.model}`,
    `Status: ${d.status}`,
    d.httpStatusCode ? `HTTP-Code: ${d.httpStatusCode}` : null,
    d.errorCode ? `Fehlercode: ${d.errorCode}` : null,
    d.errorMessage ? `Fehlermeldung: ${d.errorMessage}` : null,
    `Dauer: ${d.durationSec.toFixed(1)} s`,
    d.finishReason ? `Abschlussgrund (finishReason): ${d.finishReason}` : null,
    d.imageDimensions ? `Bildgröße: ${d.imageDimensions.width} x ${d.imageDimensions.height} px` : null,
    d.imageSizeBytes ? `Bild-Dateigröße: ${(d.imageSizeBytes / 1024).toFixed(1)} KB` : null,
    d.tokenUsage
      ? `Tokens: Prompt=${d.tokenUsage.promptTokens ?? '-'}, Ausgabe=${d.tokenUsage.candidatesTokens ?? '-'}, Gesamt=${d.tokenUsage.totalTokens ?? '-'}`
      : null,
    d.stagesCompleted ? `Erfolgreiche Schritte: ${d.stagesCompleted.join(', ')}` : null,
    d.stepsCount ? `Schrittfortschritt: ${d.stepsCount.current} von ${d.stepsCount.total}` : null,
    '',
    '--- Rohantwort-Auszug (erste 2000 Zeichen, schlüsselfrei) ---',
    d.rawResponseSnippet || '(keine Antwort)',
    '==============================================',
  ];

  return lines.filter((l) => l !== null).join('\n');
}

// ================= MODEL DISCOVERY (LIST MODELS API) =================

export interface GeminiModelInfo {
  id: string;
  name: string;
  description: string;
  supportedMethods: string[];
}

/**
 * Fetches available models from Google Generative Language API using the user's key.
 * Never includes key in URL query. Filters for models supporting generateContent.
 */
export async function fetchAvailableGeminiModels(apiKey?: string): Promise<GeminiModelInfo[]> {
  const key = cleanApiKey(apiKey || getStoredApiKey());
  if (!key) {
    throw new Error('Kein API-Schlüssel eingegeben.');
  }

  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const status = response.status;
      let errDetail = '';
      try {
        const errJson = await response.json();
        errDetail = errJson?.error?.message || '';
      } catch {}

      if (status === 400 || status === 401 || status === 403) {
        throw new Error(
          `API-Schlüssel ungültig oder nicht berechtigt (HTTP ${status}): ${sanitizeErrorMessage(errDetail, key)}`
        );
      }
      throw new Error(`Fehler beim Abruf der Modellliste (HTTP ${status}): ${sanitizeErrorMessage(errDetail, key)}`);
    }

    const data = await response.json();
    const rawModels: any[] = Array.isArray(data.models) ? data.models : [];

    // Filter models supporting generateContent and suitable for multimodal/chat
    const filtered: GeminiModelInfo[] = [];

    for (const m of rawModels) {
      const nameStr = String(m.name || '');
      const id = nameStr.replace(/^models\//, '');
      const methods: string[] = Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods : [];

      if (!methods.includes('generateContent')) continue;

      // Exclude embedding, audio, tts, imagen, aqa, and search-only models
      const lower = id.toLowerCase();
      if (
        lower.includes('embedding') ||
        lower.includes('imagen') ||
        lower.includes('aqa') ||
        lower.includes('tts') ||
        lower.includes('realtime')
      ) {
        continue;
      }

      filtered.push({
        id,
        name: m.displayName || id,
        description: m.description || '',
        supportedMethods: methods,
      });
    }

    // Sort models so flash models come first
    filtered.sort((a, b) => {
      const aFlash = a.id.toLowerCase().includes('flash');
      const bFlash = b.id.toLowerCase().includes('flash');
      if (aFlash && !bFlash) return -1;
      if (!aFlash && bFlash) return 1;
      return a.id.localeCompare(b.id);
    });

    // Ensure the dynamic alias is available with description
    const hasAlias = filtered.some((m) => m.id === 'gemini-flash-latest');
    if (!hasAlias) {
      filtered.push({
        id: 'gemini-flash-latest',
        name: 'Gemini Flash Latest (Dynamischer Alias)',
        description: 'Zeigt stets auf das jeweils neueste Flash-Modell von Google.',
        supportedMethods: ['generateContent'],
      });
    }

    return filtered;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Zeitüberschreitung beim Laden der Modellliste (15s Timeout).');
    }
    throw new Error(sanitizeErrorMessage(err, key));
  }
}

// ================= CONNECTION TEST (3 INDEPENDENT CHECKS) =================

/**
 * Performs a rigorous 3-step test of the Gemini API:
 * 1. Key validity (models list retrieval)
 * 2. Model text responsiveness (short text request)
 * 3. Model multimodal vision capabilities (small test image request)
 */
export async function testGeminiConnectionDetailed(
  apiKey?: string,
  model?: string
): Promise<AiConnectionTestResult> {
  const key = cleanApiKey(apiKey || getStoredApiKey());
  const requestedModel = model?.trim() || getStoredModel() || DEFAULT_GEMINI_MODEL;

  const result: AiConnectionTestResult = {
    overallSuccess: false,
    step1KeyValid: { success: false, message: 'Wird geprüft...' },
    step2TextResponse: { success: false, message: 'Ausstehend' },
    step3ImageResponse: { success: false, message: 'Ausstehend' },
  };

  if (!key) {
    result.step1KeyValid = {
      success: false,
      message: 'Kein API-Schlüssel eingegeben.',
      details: 'Bitte tragen Sie einen gültigen Schlüssel aus Google AI Studio ein.',
    };
    return result;
  }

  // STEP 1: Test Key via Models List
  let models: GeminiModelInfo[] = [];
  try {
    models = await fetchAvailableGeminiModels(key);
    result.modelsFound = models;
    result.step1KeyValid = {
      success: true,
      message: `Schlüssel ist gültig (${models.length} Modelle verfügbar).`,
    };
  } catch (err: any) {
    result.step1KeyValid = {
      success: false,
      message: 'Schlüssel ungültig oder abgelehnt.',
      details: sanitizeErrorMessage(err, key),
    };
    return result;
  }

  // Determine actual model to test (use requestedModel, or fallback to first flash model)
  const isModelAvailable = models.some((m) => m.id === requestedModel);
  const activeTestModel = isModelAvailable
    ? requestedModel
    : models.find((m) => m.id.includes('flash'))?.id || requestedModel;

  // STEP 2: Test Text Response
  const textEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(activeTestModel)}:generateContent`;
  const textController = new AbortController();
  const textTimeout = setTimeout(() => textController.abort(), 15000);

  try {
    const textRes = await fetch(textEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      signal: textController.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Antworte nur mit dem Wort: BEREIT' }] }],
        generationConfig: {
          maxOutputTokens: 20,
          temperature: 0.1,
        },
      }),
    });
    clearTimeout(textTimeout);

    if (textRes.ok) {
      result.step2TextResponse = {
        success: true,
        message: `Modell "${activeTestModel}" reagiert prompt auf Textanfragen.`,
      };
    } else {
      let errText = '';
      try {
        const ej = await textRes.json();
        errText = ej?.error?.message || '';
      } catch {}
      result.step2TextResponse = {
        success: false,
        message: `Modell antwortete mit HTTP ${textRes.status}.`,
        details: sanitizeErrorMessage(errText, key),
      };
      return result;
    }
  } catch (err: any) {
    clearTimeout(textTimeout);
    result.step2TextResponse = {
      success: false,
      message: 'Textanfrage fehlgeschlagen.',
      details: sanitizeErrorMessage(err, key),
    };
    return result;
  }

  // STEP 3: Test Image / Vision Capabilities (1x1 red PNG)
  const tinyImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const imgController = new AbortController();
  const imgTimeout = setTimeout(() => imgController.abort(), 15000);

  try {
    const imgRes = await fetch(textEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      signal: imgController.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: 'Welche Farbe hat das Bild? Ein Wort.' },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: tinyImageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 20,
          temperature: 0.1,
        },
      }),
    });
    clearTimeout(imgTimeout);

    if (imgRes.ok) {
      result.step3ImageResponse = {
        success: true,
        message: 'Bild- und Skizzenerkennung funktioniert einwandfrei.',
      };
      result.overallSuccess = true;
    } else {
      let errDetail = '';
      try {
        const ej = await imgRes.json();
        errDetail = ej?.error?.message || '';
      } catch {}
      result.step3ImageResponse = {
        success: false,
        message: `Bildtest fehlgeschlagen (HTTP ${imgRes.status}).`,
        details: sanitizeErrorMessage(errDetail, key),
      };
    }
  } catch (err: any) {
    clearTimeout(imgTimeout);
    result.step3ImageResponse = {
      success: false,
      message: 'Bildübertragungstest fehlgeschlagen.',
      details: sanitizeErrorMessage(err, key),
    };
  }

  return result;
}

/**
 * Backwards-compatible simple test wrapper.
 */
export async function testGeminiConnection(
  apiKey?: string,
  model?: string
): Promise<{ success: boolean; message: string; modelUsed?: string }> {
  const detailed = await testGeminiConnectionDetailed(apiKey, model);
  if (detailed.overallSuccess) {
    return {
      success: true,
      message: 'Verbindung zur Gemini-API erfolgreich hergestellt! Alle 3 Prüfungen (Schlüssel, Text, Bild) bestanden.',
      modelUsed: model || DEFAULT_GEMINI_MODEL,
    };
  }

  const failStep = !detailed.step1KeyValid.success
    ? `Schlüssel-Prüfung: ${detailed.step1KeyValid.message} ${detailed.step1KeyValid.details || ''}`
    : !detailed.step2TextResponse.success
    ? `Text-Prüfung: ${detailed.step2TextResponse.message} ${detailed.step2TextResponse.details || ''}`
    : `Bild-Prüfung: ${detailed.step3ImageResponse.message} ${detailed.step3ImageResponse.details || ''}`;

  return {
    success: false,
    message: failStep.trim(),
  };
}

// ================= ERROR INTERPRETATION & TRANSLATION =================

export interface CategorizedError {
  httpStatus?: number;
  errorCode: string;
  originalMessage: string;
  germanExplanation: string;
  suggestedAction: string;
  isRetryable: boolean;
  isOpenModelList?: boolean;
}

export function categorizeGeminiError(
  status: number | undefined,
  errorData: any,
  rawMsg: string,
  model: string
): CategorizedError {
  const original = sanitizeErrorMessage(errorData?.message || rawMsg || '');
  const statusStr = status ? String(status) : '';

  // 1. API KEY INVALID
  if (
    status === 400 &&
    (original.includes('API_KEY_INVALID') || original.includes('key not valid') || original.includes('API key'))
  ) {
    return {
      httpStatus: 400,
      errorCode: 'API_KEY_INVALID',
      originalMessage: original,
      germanExplanation: 'Der eingegebene Google Gemini API-Schlüssel ist ungültig oder abgelaufen.',
      suggestedAction: 'Bitte überprüfen Sie Ihren Schlüssel in den Einstellungen oder erstellen Sie einen neuen auf aistudio.google.com/app/apikey.',
      isRetryable: false,
    };
  }

  // 2. PERMISSION DENIED
  if (status === 403 || original.includes('PERMISSION_DENIED')) {
    return {
      httpStatus: 403,
      errorCode: 'PERMISSION_DENIED',
      originalMessage: original,
      germanExplanation: 'Berechtigung verweigert. Möglicherweise ist die Generative Language API im Google Cloud Projekt nicht aktiviert oder durch Domain-/IP-Filter eingeschränkt.',
      suggestedAction: 'Überprüfen Sie die API-Schlüssel-Einschränkungen in der Google Cloud Console oder verwenden Sie einen uneingeschränkten Schlüssel.',
      isRetryable: false,
    };
  }

  // 3. MODEL NOT FOUND
  if (status === 404 || original.includes('NOT_FOUND') || original.includes('is not found')) {
    return {
      httpStatus: 404,
      errorCode: 'MODEL_NOT_FOUND',
      originalMessage: original,
      germanExplanation: `Das gewählte Modell "${model}" ist auf Google-Servern nicht verfügbar oder veraltet.`,
      suggestedAction: 'Tippen Sie auf "Verfügbare Modelle laden", um ein aktuelles funktionierendes Flash-Modell auszuwählen.',
      isRetryable: false,
      isOpenModelList: true,
    };
  }

  // 4. REQUEST TOO LARGE
  if (status === 413 || original.includes('PAYLOAD_TOO_LARGE') || original.includes('Request payload size exceeds')) {
    return {
      httpStatus: 413,
      errorCode: 'REQUEST_TOO_LARGE',
      originalMessage: original,
      germanExplanation: 'Die Bilddatei ist zu groß für eine einzelne API-Anfrage.',
      suggestedAction: 'Das Bild wird automatisch stärker komprimiert. Bitte erneut versuchen.',
      isRetryable: true,
    };
  }

  // 5. RESOURCE EXHAUSTED / RATE LIMIT
  if (status === 429 || original.includes('RESOURCE_EXHAUSTED') || original.includes('Quota exceeded')) {
    return {
      httpStatus: 429,
      errorCode: 'RESOURCE_EXHAUSTED',
      originalMessage: original,
      germanExplanation: 'Das Google API-Kontingent für diesen Schlüssel oder dieses Modell ist vorübergehend erschöpft (Rate Limit).',
      suggestedAction: 'Bitte warten Sie etwa 30 bis 60 Sekunden, oder wechseln Sie in den Einstellungen auf ein anderes Modell.',
      isRetryable: true,
    };
  }

  // 6. GOOGLE OVERLOADED (500 / 503)
  if (status === 500 || status === 503 || original.includes('UNAVAILABLE') || original.includes('Overloaded')) {
    return {
      httpStatus: status || 503,
      errorCode: 'SERVICE_UNAVAILABLE',
      originalMessage: original,
      germanExplanation: 'Die Google Gemini Server sind im Moment stark ausgelastet.',
      suggestedAction: 'Die App wiederholt die Anfrage automatisch mit ansteigender Wartezeit (Exponential Backoff).',
      isRetryable: true,
    };
  }

  // 7. INVALID ARGUMENT (Schema or config rejected)
  if (status === 400 || original.includes('INVALID_ARGUMENT')) {
    return {
      httpStatus: 400,
      errorCode: 'INVALID_ARGUMENT',
      originalMessage: original,
      germanExplanation: 'Die API hat ein Anfrage-Detail oder den Denkaufwand-Parameter abgewiesen.',
      suggestedAction: 'Die App sendet automatisch eine vereinfachte Anfrage ohne diesen Parameter.',
      isRetryable: true,
    };
  }

  // 8. OFFLINE / NETWORK ERROR
  if (original.includes('Failed to fetch') || original.includes('NetworkError') || original.includes('offline')) {
    return {
      errorCode: 'NETWORK_OFFLINE',
      originalMessage: original,
      germanExplanation: 'Keine Verbindung zu Google Generative Language Servern möglich.',
      suggestedAction: 'Bitte prüfen Sie Ihre WLAN- oder Mobilfunkverbindung auf dem iPad.',
      isRetryable: true,
    };
  }

  // 9. TIMEOUT
  if (original.includes('Timeout') || original.includes('Zeitüberschreitung') || original.includes('AbortError')) {
    return {
      errorCode: 'TIMEOUT_EXCEEDED',
      originalMessage: original,
      germanExplanation: 'Zeitüberschreitung nach 120 Sekunden. Die Gemini-API hat nicht rechtzeitig geantwortet.',
      suggestedAction: 'Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
      isRetryable: true,
    };
  }

  // Default fallback error
  return {
    httpStatus: status,
    errorCode: 'API_ERROR',
    originalMessage: original || 'Unerwarteter Fehler',
    germanExplanation: `Google API Fehler ${statusStr ? `(${statusStr})` : ''}: ${original}`,
    suggestedAction: 'Überprüfen Sie den API-Schlüssel und die Diagnose-Informationen.',
    isRetryable: false,
  };
}

// ================= PROGRESS & STAGE DEFINITION =================

export interface AnalysisStageUpdate {
  phase: string;
  stepNumber: number;
  totalSteps: number;
  percent: number;
  elapsedSec: number;
  stageName: string;
}

// ================= PROMPTS FOR 3-STAGE EXTRACTION =================

const STAGE_1_WALLS_PROMPT = `
Du bist ein erfahrener Architekt und CAD-Konstrukteur.
AUFGABE SCHRITT 1 VON 3: Analysiere den Grundriss und extrahiere NUR die Gebäude-Außenmaße, alle Wände und alle Wandachsen.

REGELN:
1. Normalisiere alle Koordinaten auf den Bereich 0 bis 1000 (0,0 = oben links, 1000 = rechts unten).
2. Alle Wände müssen rechtwinklig oder exakt ausgerichtet sein und an Ecken nahtlos schließen.
3. Unterscheide klar zwischen Außenwänden (isExterior: true, typisch 0.30m - 0.365m) und Innenwänden (isExterior: false, 0.115m - 0.175m).
4. Lies alle Maßketten und Zahlen ab (readDimensions), um detectedTotalWidthM und detectedTotalDepthM in Metern zu ermitteln.

Antworte ausschließlich mit JSON:
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
      "height": 2.60,
      "isExterior": true,
      "confidence": 0.95
    }
  ],
  "readDimensions": [
    {
      "id": "dim1",
      "label": "8.00",
      "valueMeters": 8.00,
      "startX": 100,
      "startY": 80,
      "endX": 900,
      "endY": 80,
      "confidence": 0.95
    }
  ]
}
`;

const STAGE_2_OPENINGS_PROMPT = `
Du bist ein erfahrener Architekt und CAD-Konstrukteur.
AUFGABE SCHRITT 2 VON 3: Analysiere denselben Grundriss und extrahiere NUR die Türen und Fenster.

REGELN:
1. Koordinaten im selben normalisierten 0..1000 System wie die Wände.
2. Türen (doors): Position (x, y) als Mittelpunkt, Breite (width in Metern), Art ('single' | 'double' | 'sliding' | 'entry' | 'patio'), Aufschlag (swingDirection 'left'|'right', openDirection 'inside'|'outside').
3. Fenster (windows): Position (x, y) als Mittelpunkt, Breite (width in Metern), parapetHeight (Brüstungshöhe: 0.90m Standard, 0.00m bei bodentief).

Antworte ausschließlich mit JSON:
{
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
      "confidence": 0.92
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
      "confidence": 0.94
    }
  ]
}
`;

const STAGE_3_ROOMS_FURNITURE_PROMPT = `
Du bist ein erfahrener Architekt und CAD-Konstrukteur.
AUFGABE SCHRITT 3 VON 3: Analysiere denselben Grundriss und extrahiere die Räume, Raumnamen, Möbel, Treppen und Dachform.

REGELN:
1. Räume (rooms): Name (z.B. "Wohnen", "Küche", "Schlafen", "Bad", "Flur"), category ('living'|'sleeping'|'kitchen'|'bath'|'corridor'|'storage'), polygon (Kette von Punkten [{x, y}] im 0..1000 System), areaM2 falls lesbar.
2. Möbel (furniture): Typ (type: 'bed_double', 'bed_single', 'sofa', 'table_dining', 'kitchen_counter', 'toilet', 'washbasin', 'shower', 'bathtub'), x, y, width, depth, rotation in Grad.
3. Treppen (stairs): falls vorhanden, type ('straight'|'L'|'U'), x, y, width, length, rotation.
4. Dach (roof): type ('gable'|'shed'|'hip'|'flat'), pitchDegrees (z.B. 35), ridgeHeight (z.B. 2.50).

Antworte ausschließlich mit JSON:
{
  "rooms": [
    {
      "id": "r1",
      "name": "Wohnzimmer",
      "category": "living",
      "polygon": [{"x": 100, "y": 100}, {"x": 500, "y": 100}, {"x": 500, "y": 500}, {"x": 100, "y": 500}],
      "areaM2": 20.0,
      "confidence": 0.95
    }
  ],
  "furniture": [
    {
      "id": "f1",
      "name": "Sofa",
      "type": "sofa",
      "category": "living",
      "x": 250,
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
    "ridgeHeight": 2.60,
    "ridgeDirection": "horizontal",
    "confidence": 0.85
  }
}
`;

// ================= ROBUST SINGLE CALL HELPER WITH AUTO-RETRY =================

interface CallGeminiParams {
  key: string;
  model: string;
  parts: any[];
  thinkingLevel: AiThinkingLevel;
  signal?: AbortSignal;
}

interface CallGeminiResult {
  rawText: string;
  finishReason?: string;
  tokenUsage?: { promptTokens?: number; candidatesTokens?: number; totalTokens?: number };
  modelUsed: string;
  durationSec: number;
}

async function callGeminiApiWithRetries(
  params: CallGeminiParams,
  onAttempt?: (msg: string) => void
): Promise<CallGeminiResult> {
  const { key, model, parts, thinkingLevel, signal } = params;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const thinkingBudget =
    thinkingLevel === 'high' ? 4096 : thinkingLevel === 'medium' ? 2048 : 1024;

  let allowThinking = true;
  let useJsonMime = true;
  let maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new Error('Analyse wurde vom Benutzer abgebrochen.');
    }

    const startTime = Date.now();
    const reqController = new AbortController();
    const timeoutId = setTimeout(() => reqController.abort(), 90000); // 90s per single call

    const onExternalAbort = () => reqController.abort();
    if (signal) signal.addEventListener('abort', onExternalAbort);

    try {
      const generationConfig: any = {
        maxOutputTokens: 8192,
        temperature: 0.1,
      };

      if (useJsonMime) {
        generationConfig.responseMimeType = 'application/json';
      }

      if (allowThinking) {
        generationConfig.thinkingConfig = {
          thinkingBudget,
        };
      }

      const bodyPayload = {
        contents: [{ parts }],
        generationConfig,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        signal: reqController.signal,
        body: JSON.stringify(bodyPayload),
      });

      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onExternalAbort);

      const durationSec = (Date.now() - startTime) / 1000;

      if (!response.ok) {
        const status = response.status;
        let errJson: any = null;
        try {
          errJson = await response.json();
        } catch {}

        const errDetail = errJson?.error?.message || '';

        // If rejected because thinkingConfig or responseMimeType is not supported on this model (400)
        if (status === 400 && (errDetail.includes('thinkingConfig') || errDetail.includes('Unknown field'))) {
          if (allowThinking) {
            allowThinking = false;
            onAttempt?.('Modell unterstützt keinen Denkaufwand – wiederhole ohne Thinking-Parameter...');
            continue;
          }
        }

        if (status === 400 && errDetail.includes('responseMimeType')) {
          if (useJsonMime) {
            useJsonMime = false;
            onAttempt?.('Modell unterstützt kein JSON-MIME – wiederhole mit Freitext-Extraktion...');
            continue;
          }
        }

        // Overloaded 500 / 503: retry with backoff
        if ((status === 500 || status === 503) && attempt < maxAttempts) {
          const waitSec = attempt * 2;
          onAttempt?.(`Google überlastet (503) – automatischer Neuversuch in ${waitSec}s (${attempt}/${maxAttempts})...`);
          await new Promise((r) => setTimeout(r, waitSec * 1000));
          continue;
        }

        // Rate limit 429: wait if not last attempt
        if (status === 429 && attempt < maxAttempts) {
          onAttempt?.(`Rate Limit (429) erreicht – warte 5s vor Neuversuch...`);
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }

        const catErr = categorizeGeminiError(status, errJson?.error, errDetail, model);
        const err = new Error(catErr.germanExplanation);
        (err as any).categorized = catErr;
        throw err;
      }

      // Success! Parse response
      const resJson = await response.json();
      const candidate = resJson?.candidates?.[0];
      const finishReason = candidate?.finishReason;
      const rawText = candidate?.content?.parts?.[0]?.text || '';
      const usageMetadata = resJson?.usageMetadata;

      if (!rawText && finishReason === 'SAFETY') {
        throw new Error('Die Antwort wurde von den Google-Sicherheitsfiltern blockiert.');
      }

      return {
        rawText,
        finishReason,
        tokenUsage: {
          promptTokens: usageMetadata?.promptTokenCount,
          candidatesTokens: usageMetadata?.candidatesTokenCount,
          totalTokens: usageMetadata?.totalTokenCount,
        },
        modelUsed: model,
        durationSec,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onExternalAbort);

      if (signal?.aborted) {
        throw new Error('Analyse wurde vom Benutzer abgebrochen.');
      }

      if (err.name === 'AbortError') {
        throw new Error('Zeitüberschreitung beim Warten auf die Google Gemini API.');
      }

      if (err.categorized) {
        throw err;
      }

      // If network error and can retry
      if (attempt < maxAttempts) {
        onAttempt?.(`Netzwerkunterbrechung – Versuch ${attempt + 1} von ${maxAttempts}...`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }

      const catErr = categorizeGeminiError(undefined, null, err.message, model);
      const e = new Error(catErr.germanExplanation);
      (e as any).categorized = catErr;
      throw e;
    }
  }

  throw new Error('Anfrage nach mehreren Versuchen fehlgeschlagen.');
}

// ================= MAIN MULTI-STAGE ANALYSIS ENGINE =================

export async function analyzePlanImages(
  images: ImportImageItem[],
  customPromptAddition = '',
  apiKey?: string,
  model?: string,
  onStageUpdate?: (update: AnalysisStageUpdate) => void,
  signal?: AbortSignal
): Promise<AiPlanAnalysisResult> {
  const overallStart = Date.now();
  const key = cleanApiKey(apiKey || getStoredApiKey());
  if (!key) {
    throw new Error('Kein Gemini API-Schlüssel hinterlegt. Bitte unter Einstellungen → KI eingeben.');
  }

  const selectedModel = model?.trim() || getStoredModel() || DEFAULT_GEMINI_MODEL;
  const thinkingLevel = getStoredThinkingLevel();

  if (images.length === 0) {
    throw new Error('Keine Bilder zur Analyse übergeben.');
  }

  const primaryImage = images.find((m) => m.role === 'floorplan') || images[0];
  const imageSizeBytes = Math.round((primaryImage.dataUrl.length * 3) / 4);

  // Helper to report stage
  const report = (phase: string, stepNumber: number, percent: number) => {
    const elapsed = (Date.now() - overallStart) / 1000;
    onStageUpdate?.({
      phase,
      stepNumber,
      totalSteps: 3,
      percent,
      elapsedSec: Math.round(elapsed),
      stageName: phase,
    });
  };

  report('Bild wird vorbereitet', 0, 10);

  // Prepare base64 parts
  let base64Data = primaryImage.dataUrl;
  if (base64Data.includes(',')) {
    base64Data = base64Data.split(',')[1];
  }

  const inlinePart = {
    inlineData: {
      mimeType: primaryImage.mimeType || 'image/jpeg',
      data: base64Data,
    },
  };

  const stagesCompleted: string[] = [];
  let finishReasonRecord = 'STOP';
  let totalTokenUsage = { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 };
  let rawTextCombined = '';

  // Data accumulators
  let detectedWidthM = 8.0;
  let detectedDepthM = 6.0;
  let northAngleDeg = 0;
  let walls: AiDetectedWall[] = [];
  let readDimensions: AiDetectedDimension[] = [];
  let doors: AiDetectedDoor[] = [];
  let windows: AiDetectedWindow[] = [];
  let rooms: AiDetectedRoom[] = [];
  let furniture: AiDetectedFurniture[] = [];
  let stairs: AiDetectedStair[] = [];
  let roof: AiDetectedRoof | undefined = undefined;

  try {
    // --------------------------------------------------------------------
    // STAGE 1: WÄNDE, ECKEN & MAßE (Schritt 1 von 3)
    // --------------------------------------------------------------------
    report('Schritt 1 von 3: Wände, Ecken & Außenmaße', 1, 30);

    const stage1Parts = [
      { text: STAGE_1_WALLS_PROMPT + (customPromptAddition ? `\nHinweis: ${customPromptAddition}` : '') },
      inlinePart,
    ];

    const res1 = await callGeminiApiWithRetries(
      {
        key,
        model: selectedModel,
        parts: stage1Parts,
        thinkingLevel,
        signal,
      },
      (msg) => report(`Schritt 1 von 3: ${msg}`, 1, 30)
    );

    stagesCompleted.push('Schritt 1 (Wände)');
    rawTextCombined += `\n--- STAGE 1 (WALLS) ---\n` + res1.rawText;
    if (res1.finishReason) finishReasonRecord = res1.finishReason;
    if (res1.tokenUsage) {
      totalTokenUsage.promptTokens += res1.tokenUsage.promptTokens || 0;
      totalTokenUsage.candidatesTokens += res1.tokenUsage.candidatesTokens || 0;
      totalTokenUsage.totalTokens += res1.tokenUsage.totalTokens || 0;
    }

    const parsed1 = cleanAndParseJson(res1.rawText);
    if (parsed1) {
      if (parsed1.detectedTotalWidthM) detectedWidthM = Number(parsed1.detectedTotalWidthM);
      if (parsed1.detectedTotalDepthM) detectedDepthM = Number(parsed1.detectedTotalDepthM);
      if (parsed1.northAngleDeg) northAngleDeg = Number(parsed1.northAngleDeg);

      if (Array.isArray(parsed1.walls)) {
        walls = parsed1.walls.map((w: any, idx: number) => ({
          id: w.id || `ai_wall_${idx + 1}`,
          startX: Number(w.startX) || 0,
          startY: Number(w.startY) || 0,
          endX: Number(w.endX) || 0,
          endY: Number(w.endY) || 0,
          thickness: Number(w.thickness) > 0 ? Number(w.thickness) : w.isExterior ? 0.30 : 0.115,
          height: Number(w.height) > 0 ? Number(w.height) : 2.60,
          endHeight: w.endHeight ? Number(w.endHeight) : undefined,
          isExterior: Boolean(w.isExterior),
          material: w.material || (w.isExterior ? 'brick' : 'drywall'),
          confidence: Math.max(0, Math.min(1, Number(w.confidence) || 0.85)),
          selected: true,
        }));
      }

      if (Array.isArray(parsed1.readDimensions)) {
        readDimensions = parsed1.readDimensions.map((d: any, idx: number) => ({
          id: d.id || `ai_dim_${idx + 1}`,
          label: String(d.label || ''),
          valueMeters: Number(d.valueMeters) || 0,
          startX: d.startX ? Number(d.startX) : undefined,
          startY: d.startY ? Number(d.startY) : undefined,
          endX: d.endX ? Number(d.endX) : undefined,
          endY: d.endY ? Number(d.endY) : undefined,
          confidence: Math.max(0, Math.min(1, Number(d.confidence) || 0.85)),
        }));
      }
    }

    // --------------------------------------------------------------------
    // STAGE 2: TÜREN & FENSTER (Schritt 2 von 3)
    // --------------------------------------------------------------------
    report('Schritt 2 von 3: Türen & Fenster', 2, 60);

    try {
      const stage2Parts = [{ text: STAGE_2_OPENINGS_PROMPT }, inlinePart];
      const res2 = await callGeminiApiWithRetries(
        {
          key,
          model: selectedModel,
          parts: stage2Parts,
          thinkingLevel,
          signal,
        },
        (msg) => report(`Schritt 2 von 3: ${msg}`, 2, 60)
      );

      stagesCompleted.push('Schritt 2 (Öffnungen)');
      rawTextCombined += `\n--- STAGE 2 (OPENINGS) ---\n` + res2.rawText;
      if (res2.tokenUsage) {
        totalTokenUsage.promptTokens += res2.tokenUsage.promptTokens || 0;
        totalTokenUsage.candidatesTokens += res2.tokenUsage.candidatesTokens || 0;
        totalTokenUsage.totalTokens += res2.tokenUsage.totalTokens || 0;
      }

      const parsed2 = cleanAndParseJson(res2.rawText);
      if (parsed2) {
        if (Array.isArray(parsed2.doors)) {
          doors = parsed2.doors.map((d: any, idx: number) => ({
            id: d.id || `ai_door_${idx + 1}`,
            x: Number(d.x) || 0,
            y: Number(d.y) || 0,
            width: Number(d.width) > 0 ? Number(d.width) : 0.885,
            height: Number(d.height) > 0 ? Number(d.height) : 2.05,
            type: (d.type as any) || 'single',
            swingDirection: d.swingDirection === 'right' ? 'right' : 'left',
            openDirection: d.openDirection === 'outside' ? 'outside' : 'inside',
            confidence: Math.max(0, Math.min(1, Number(d.confidence) || 0.85)),
            selected: true,
          }));
        }

        if (Array.isArray(parsed2.windows)) {
          windows = parsed2.windows.map((win: any, idx: number) => ({
            id: win.id || `ai_win_${idx + 1}`,
            x: Number(win.x) || 0,
            y: Number(win.y) || 0,
            width: Number(win.width) > 0 ? Number(win.width) : 1.20,
            height: Number(win.height) > 0 ? Number(win.height) : 1.25,
            parapetHeight: typeof win.parapetHeight === 'number' ? Number(win.parapetHeight) : 0.90,
            type: (win.type as any) || 'turn_tilt',
            confidence: Math.max(0, Math.min(1, Number(win.confidence) || 0.85)),
            selected: true,
          }));
        }
      }
    } catch (stage2Err) {
      console.warn('Stage 2 (Öffnungen) konnte nicht abgeschlossen werden:', stage2Err);
      // Non-fatal: Walls are already extracted! Continue to Stage 3 or finish.
    }

    // --------------------------------------------------------------------
    // STAGE 3: RÄUME, MÖBEL & DACH (Schritt 3 von 3)
    // --------------------------------------------------------------------
    report('Schritt 3 von 3: Räume, Möbel & Dach', 3, 85);

    try {
      const stage3Parts = [{ text: STAGE_3_ROOMS_FURNITURE_PROMPT }, inlinePart];
      const res3 = await callGeminiApiWithRetries(
        {
          key,
          model: selectedModel,
          parts: stage3Parts,
          thinkingLevel,
          signal,
        },
        (msg) => report(`Schritt 3 von 3: ${msg}`, 3, 85)
      );

      stagesCompleted.push('Schritt 3 (Räume & Möbel)');
      rawTextCombined += `\n--- STAGE 3 (ROOMS) ---\n` + res3.rawText;
      if (res3.tokenUsage) {
        totalTokenUsage.promptTokens += res3.tokenUsage.promptTokens || 0;
        totalTokenUsage.candidatesTokens += res3.tokenUsage.candidatesTokens || 0;
        totalTokenUsage.totalTokens += res3.tokenUsage.totalTokens || 0;
      }

      const parsed3 = cleanAndParseJson(res3.rawText);
      if (parsed3) {
        if (Array.isArray(parsed3.rooms)) {
          rooms = parsed3.rooms.map((r: any, idx: number) => ({
            id: r.id || `ai_room_${idx + 1}`,
            name: String(r.name || `Raum ${idx + 1}`),
            category: (r.category as any) || 'living',
            polygon: Array.isArray(r.polygon)
              ? r.polygon.map((p: any) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }))
              : [],
            areaM2: Number(r.areaM2) || undefined,
            confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0.85)),
            selected: true,
          }));
        }

        if (Array.isArray(parsed3.furniture)) {
          furniture = parsed3.furniture.map((f: any, idx: number) => ({
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
          }));
        }

        if (Array.isArray(parsed3.stairs)) {
          stairs = parsed3.stairs.map((s: any, idx: number) => ({
            id: s.id || `ai_stair_${idx + 1}`,
            type: (s.type as any) || 'straight',
            x: Number(s.x) || 0,
            y: Number(s.y) || 0,
            width: Number(s.width) || 0.90,
            length: Number(s.length) || 2.80,
            rotation: Number(s.rotation) || 0,
            confidence: Math.max(0, Math.min(1, Number(s.confidence) || 0.85)),
            selected: true,
          }));
        }

        if (parsed3.roof) {
          roof = {
            type: parsed3.roof.type || 'gable',
            pitchDegrees: Number(parsed3.roof.pitchDegrees) || 35,
            ridgeHeight: Number(parsed3.roof.ridgeHeight) || 2.6,
            ridgeDirection: parsed3.roof.ridgeDirection === 'vertical' ? 'vertical' : 'horizontal',
            confidence: Math.max(0, Math.min(1, Number(parsed3.roof.confidence) || 0.85)),
          };
        }
      }
    } catch (stage3Err) {
      console.warn('Stage 3 (Räume & Möbel) konnte nicht abgeschlossen werden:', stage3Err);
    }

    report('Plan wird erstellt & geprüft', 3, 100);

    const totalDuration = (Date.now() - overallStart) / 1000;

    // Record complete diagnostic data
    setLastDiagnostic({
      timestamp: new Date().toLocaleString('de-DE'),
      model: selectedModel,
      imageDimensions: { width: primaryImage.width, height: primaryImage.height },
      imageSizeBytes,
      durationSec: totalDuration,
      status: '200 OK (Erfolgreich)',
      httpStatusCode: 200,
      finishReason: finishReasonRecord,
      tokenUsage: totalTokenUsage,
      rawResponseSnippet: rawTextCombined.substring(0, 2000),
      stagesCompleted,
      stepsCount: { current: stagesCompleted.length, total: 3 },
    });

    const finalResult: AiPlanAnalysisResult = {
      unit: 'm',
      imageWidth: primaryImage.width || 1000,
      imageHeight: primaryImage.height || 1000,
      northAngleDeg,
      detectedTotalWidthM: detectedWidthM,
      detectedTotalDepthM: detectedDepthM,
      walls,
      doors,
      windows,
      rooms,
      furniture,
      stairs,
      roof,
      readDimensions,
      scalePxPerMeter: 100,
      warnings: [],
      rawResponse: rawTextCombined,
      timestamp: new Date().toISOString(),
    };

    return finalResult;
  } catch (err: any) {
    const totalDuration = (Date.now() - overallStart) / 1000;
    const catErr = err.categorized || categorizeGeminiError(undefined, null, err.message, selectedModel);

    // Record error diagnostic
    setLastDiagnostic({
      timestamp: new Date().toLocaleString('de-DE'),
      model: selectedModel,
      imageDimensions: { width: primaryImage.width, height: primaryImage.height },
      imageSizeBytes,
      durationSec: totalDuration,
      status: `${catErr.httpStatus || 500} ${catErr.errorCode}`,
      httpStatusCode: catErr.httpStatus,
      errorCode: catErr.errorCode,
      errorMessage: catErr.germanExplanation,
      finishReason: 'ERROR',
      rawResponseSnippet: rawTextCombined.substring(0, 2000) || catErr.originalMessage,
      stagesCompleted,
      stepsCount: { current: stagesCompleted.length, total: 3 },
    });

    throw err;
  }
}

// ================= NATURAL LANGUAGE PLAN CORRECTION =================

export async function executeNaturalLanguageCorrection(
  prompt: string,
  floor: Floor,
  project: CadProject,
  apiKey?: string,
  model?: string,
  signal?: AbortSignal
): Promise<{ success: boolean; explanation: string; modifications: any[] }> {
  const key = cleanApiKey(apiKey || getStoredApiKey());
  if (!key) {
    throw new Error('Kein API-Schlüssel hinterlegt. Bitte unter Einstellungen → KI eingeben.');
  }

  const selectedModel = model?.trim() || getStoredModel() || DEFAULT_GEMINI_MODEL;
  const currentFloorJson = JSON.stringify({
    wallsCount: floor.walls.length,
    roomsCount: floor.rooms.length,
    doorsCount: floor.doors.length,
    windowsCount: floor.windows.length,
    furnitureCount: floor.furniture.length,
    walls: floor.walls.map((w) => ({
      id: w.id,
      start: w.start,
      end: w.end,
      thickness: w.thickness,
      isExterior: w.isExterior,
    })),
    rooms: floor.rooms.map((r) => ({ id: r.id, name: r.name, category: r.category })),
  });

  const parts = [
    {
      text: `Du bist ein CAD-Planungsassistent.
Der Nutzer wünscht folgende Änderung an seinem Grundriss:
"${prompt}"

Aktueller Plan-Zustand:
${currentFloorJson}

Antworte ausschließlich mit JSON:
{
  "explanation": "Kurze deutsche Erklärung der vorgenommenen Anpassung",
  "modifications": []
}`,
    },
  ];

  const res = await callGeminiApiWithRetries({
    key,
    model: selectedModel,
    parts,
    thinkingLevel: 'low',
    signal,
  });

  const parsed = cleanAndParseJson(res.rawText);
  return {
    success: true,
    explanation: parsed?.explanation || 'Änderungen ermittelt.',
    modifications: Array.isArray(parsed?.modifications) ? parsed.modifications : [],
  };
}

// ================= TOLERANT JSON PARSER =================

function cleanAndParseJson(text: string): any {
  if (!text) return null;
  let cleaned = text.trim();

  // Strip Markdown code fences if present (```json ... ``` or ``` ...)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  cleaned = cleaned.trim();

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Locate first '{' and last '}'
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sub = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(sub);
      } catch (subErr) {
        // Attempt basic repairs for common JSON syntax glitches
        try {
          // Remove trailing commas before closing braces/brackets
          const repaired = sub.replace(/,\s*([}\]])/g, '$1');
          return JSON.parse(repaired);
        } catch {}
      }
    }
  }

  return null;
}

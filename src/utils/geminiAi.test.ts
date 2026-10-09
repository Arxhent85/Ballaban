import { describe, it, expect } from 'bun:test';
import {
  cleanApiKey,
  sanitizeErrorMessage,
  categorizeGeminiError,
  formatDiagnosticForClipboard,
} from './geminiAi';
import { getDemoHolidayHousePlan } from './demoPlanData';
import { convertAiPlanToCadObjects } from './aiPlanToCad';

describe('Gemini AI Import, Diagnostics & Demo Plan Tests', () => {
  it('1. Test cleanApiKey removes whitespace, quotes, linebreaks and tabs', () => {
    const raw = '  "AIzaSyD-12345ABCDE" \n\t ';
    const cleaned = cleanApiKey(raw);
    expect(cleaned).toBe('AIzaSyD-12345ABCDE');

    const singleQuoted = " 'AIzaSyD-TEST-KEY' ";
    expect(cleanApiKey(singleQuoted)).toBe('AIzaSyD-TEST-KEY');
  });

  it('2. Test sanitizeErrorMessage strips API key patterns so keys never leak', () => {
    const errorWithKey = 'Error 400: Request with key AIzaSyD-SECRET-KEY-123 failed due to invalid argument';
    const sanitized = sanitizeErrorMessage(errorWithKey, 'AIzaSyD-SECRET-KEY-123');
    expect(sanitized).not.toContain('AIzaSyD-SECRET-KEY-123');
    expect(sanitized).toContain('[SCHLÜSSEL]');
  });

  it('3. Test categorizeGeminiError returns clear German explanation and suggested action for various errors', () => {
    // 400 Invalid Key
    const err400Key = categorizeGeminiError(400, { message: 'API_KEY_INVALID' }, '', 'gemini-2.5-flash');
    expect(err400Key.errorCode).toBe('API_KEY_INVALID');
    expect(err400Key.germanExplanation).toContain('Google Gemini API-Schlüssel ist ungültig');
    expect(err400Key.suggestedAction).toContain('Einstellungen');

    // 404 Model Not Found
    const err404 = categorizeGeminiError(404, { message: 'models/gemini-3.5-flash is not found' }, '', 'gemini-3.5-flash');
    expect(err404.errorCode).toBe('MODEL_NOT_FOUND');
    expect(err404.isOpenModelList).toBe(true);
    expect(err404.germanExplanation).toContain('nicht verfügbar oder veraltet');

    // 429 Rate Limit (Transient)
    const err429 = categorizeGeminiError(429, { message: 'RESOURCE_EXHAUSTED' }, '', 'gemini-2.5-flash');
    expect(err429.errorCode).toBe('RESOURCE_EXHAUSTED');
    expect(err429.germanExplanation).toContain('Kontingent');

    // 429 Daily Free Tier Quota Exhaustion (20 requests/day on preview model)
    const err429Daily = categorizeGeminiError(
      429,
      {
        message:
          'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.8-flash. Please retry in 10h34m44s.',
      },
      '',
      'gemini-flash-latest'
    );
    expect(err429Daily.errorCode).toBe('RESOURCE_EXHAUSTED_DAILY');
    expect(err429Daily.isDailyQuotaExhausted).toBe(true);
    expect(err429Daily.isRetryable).toBe(false);
    expect(err429Daily.germanExplanation).toContain('20 Anfragen pro Tag');
    expect(err429Daily.suggestedAlternativeModels).toContain('gemini-2.5-flash');

    // 503 Overloaded
    const err503 = categorizeGeminiError(503, { message: 'The model is overloaded' }, '', 'gemini-2.5-flash');
    expect(err503.errorCode).toBe('SERVICE_UNAVAILABLE');
    expect(err503.isRetryable).toBe(true);

    // Timeout
    const errTimeout = categorizeGeminiError(408, null, 'Timeout: Zeitüberschreitung nach 120 Sekunden.', 'gemini-2.5-flash');
    expect(errTimeout.errorCode).toBe('TIMEOUT_EXCEEDED');
    expect(errTimeout.germanExplanation).toContain('Zeitüberschreitung nach 120 Sekunden');
  });

  it('4. Test getDemoHolidayHousePlan returns complete holiday home plan', () => {
    const demo = getDemoHolidayHousePlan();
    expect(demo.walls.length).toBeGreaterThanOrEqual(7);
    expect(demo.doors.length).toBeGreaterThanOrEqual(4);
    expect(demo.windows.length).toBeGreaterThanOrEqual(4);
    expect(demo.rooms.length).toBeGreaterThanOrEqual(4);
    expect(demo.furniture.length).toBeGreaterThanOrEqual(6);
    expect(demo.roof).toBeDefined();
    expect(demo.roof?.type).toBe('gable');
    expect(demo.detectedTotalWidthM).toBe(7.2);
    expect(demo.detectedTotalDepthM).toBe(9.0);

    // Verify it converts successfully to real CAD objects
    const cadObjects = convertAiPlanToCadObjects(demo, {
      autoStraightenWalls: true,
      roundDimensions: '5cm',
      replaceWithLibraryFurniture: true,
      useDefaultWallThickness: true,
      keepUnderlayInProject: false,
      targetDestination: 'new_project',
    });

    expect(cadObjects.walls.length).toBeGreaterThan(0);
    expect(cadObjects.rooms.length).toBeGreaterThan(0);
    expect(cadObjects.doors.length).toBeGreaterThan(0);
    expect(cadObjects.windows.length).toBeGreaterThan(0);
    expect(cadObjects.roof).toBeDefined();
  });

  it('5. Test formatDiagnosticForClipboard serializes diagnostics cleanly without keys', () => {
    const formatted = formatDiagnosticForClipboard({
      timestamp: '2026-10-08T10:00:00Z',
      model: 'gemini-2.5-flash',
      durationSec: 14,
      status: '200 OK',
      httpStatusCode: 200,
      finishReason: 'STOP',
      tokenUsage: { promptTokens: 1200, candidatesTokens: 850, totalTokens: 2050 },
      stagesCompleted: ['Schritt 1 (Wände)', 'Schritt 2 (Öffnungen)', 'Schritt 3 (Räume)'],
      rawResponseSnippet: '{"walls": []}',
    });

    expect(formatted).toContain('KI-DIAGNOSE BERICHT');
    expect(formatted).toContain('Modell: gemini-2.5-flash');
    expect(formatted).toContain('Status: 200 OK');
    expect(formatted).toContain('Dauer: 14.0 s');
    expect(formatted).toContain('Prompt=1200');
    expect(formatted).not.toContain('AIzaSy');
  });
});

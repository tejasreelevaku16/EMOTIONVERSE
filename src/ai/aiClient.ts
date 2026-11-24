// Pure TypeScript AI Client with Timeout, Single Retry & Guaranteed Fallback
// HR-1 & HR-2: Pure TypeScript, presentation-only enrichment, never modifies story state.

import type { Emotion } from '../story/storyState';
import { validateAiResponse, type AiDialogueResponse } from './responseValidator';
import { getFallbackResponse } from './fallbackResponses';

export interface DialogueRequestPayload {
  nodeId: string;
  emotion: Emotion;
  act: 1 | 2 | 3;
  speaker: 'narrator' | 'clock' | 'book' | 'crystal';
  recentContext?: string;
  availableChoiceLabels?: string[];
  hintTier?: 0 | 1 | 2;
}

export interface AiClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Performs an HTTP POST request with a timeout via AbortController.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Sends a dialogue enrichment request to `/api/dialogue`.
 * Includes:
 * - 5-second client-side timeout.
 * - Exactly one retry on network/fetch failure.
 * - Strict schema validation on success.
 * - Seamless fallback to hand-written story dialogue on any failure.
 *
 * Guarantees that it NEVER throws an error to the caller (offline-safe).
 */
export async function requestDialogue(
  payload: DialogueRequestPayload,
  config?: AiClientConfig
): Promise<AiDialogueResponse> {
  const baseUrl = config?.baseUrl ?? (typeof process !== 'undefined' && process.env?.VITE_API_BASE ? process.env.VITE_API_BASE : '');
  const url = `${baseUrl}/api/dialogue`;
  const timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const requestOptions: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nodeId: payload.nodeId,
      emotion: payload.emotion,
      act: payload.act,
      speaker: payload.speaker,
      recentContext: payload.recentContext,
      availableChoiceLabels: payload.availableChoiceLabels,
    }),
  };

  let response: Response | null = null;
  let networkError: unknown = null;

  // First attempt
  try {
    response = await fetchWithTimeout(url, requestOptions, timeoutMs);
  } catch (err) {
    networkError = err;
  }

  // Single retry on network failure only (e.g. temporary disconnect)
  if (!response && networkError) {
    try {
      response = await fetchWithTimeout(url, requestOptions, timeoutMs);
    } catch {
      // Second attempt also failed; proceed directly to fallback
      return getFallbackResponse(payload.nodeId, payload.emotion, payload.hintTier ?? 0);
    }
  }

  // If HTTP status is not ok (e.g., 502, 503, 404, 500), fall back seamlessly
  if (!response || !response.ok) {
    return getFallbackResponse(payload.nodeId, payload.emotion, payload.hintTier ?? 0);
  }

  // Attempt to parse JSON and validate schema
  try {
    const rawData = await response.json();
    const validation = validateAiResponse(rawData);

    if (validation.success) {
      return validation.data;
    } else {
      // Validation failed (schema violation or malformed content) -> fall back without crashing
      return getFallbackResponse(payload.nodeId, payload.emotion, payload.hintTier ?? 0);
    }
  } catch {
    // Malformed JSON parsing failure -> fall back seamlessly
    return getFallbackResponse(payload.nodeId, payload.emotion, payload.hintTier ?? 0);
  }
}

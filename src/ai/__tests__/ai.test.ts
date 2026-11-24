import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateAiResponse,
  parseAndValidateAiResponse,
  sanitizeText,
} from '../responseValidator';
import {
  getFallbackDialogue,
  getFallbackHint,
  getFallbackResponse,
} from '../fallbackResponses';
import { requestDialogue } from '../aiClient';
import type { DialogueRequestPayload } from '../aiClient';
import { createInitialStoryState } from '../../story/storyState';

describe('AI Response Validator (Property 7)', () => {
  it('accepts a valid JSON response matching the contract', () => {
    const valid = {
      dialogue: 'The golden warmth of dawn caresses the ancient stones.',
      hint: 'Approach the clock on the altar.',
      mood: 'hope',
    };

    const result = validateAiResponse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dialogue).toBe(valid.dialogue);
      expect(result.data.hint).toBe(valid.hint);
      expect(result.data.mood).toBe('hope');
    }
  });

  it('sanitizes control characters from text fields', () => {
    const raw = 'Text with\x00 null bytes and \x07 bell';
    expect(sanitizeText(raw)).toBe('Text with null bytes and  bell');
  });

  it('rejects responses with missing or non-string fields', () => {
    expect(validateAiResponse(null).success).toBe(false);
    expect(validateAiResponse('not an object').success).toBe(false);
    expect(validateAiResponse({ dialogue: 123, hint: 'ok', mood: 'hope' }).success).toBe(false);
    expect(validateAiResponse({ dialogue: 'ok', hint: null, mood: 'hope' }).success).toBe(false);
    expect(validateAiResponse({ dialogue: 'ok', hint: 'ok' }).success).toBe(false); // missing mood
  });

  it('rejects responses where dialogue exceeds 600 characters', () => {
    const longDialogue = 'A'.repeat(601);
    const result = validateAiResponse({
      dialogue: longDialogue,
      hint: 'Valid hint',
      mood: 'curiosity',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('exceeds max length');
    }
  });

  it('rejects responses where hint exceeds 200 characters', () => {
    const longHint = 'B'.repeat(201);
    const result = validateAiResponse({
      dialogue: 'Valid dialogue',
      hint: longHint,
      mood: 'curiosity',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('exceeds max length');
    }
  });

  it('rejects responses with an invalid mood not in the whitelist', () => {
    const result = validateAiResponse({
      dialogue: 'The sky darkens.',
      hint: 'Seek shelter.',
      mood: 'super_angry',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('not in allowed moods');
    }
  });

  it('parseAndValidateAiResponse parses valid JSON strings and catches syntax errors', () => {
    const validStr = JSON.stringify({
      dialogue: 'A mysterious light shines.',
      hint: 'Inspect the crystal.',
      mood: 'curiosity',
    });
    expect(parseAndValidateAiResponse(validStr).success).toBe(true);

    const malformed = '{ dialogue: "unclosed string...';
    const badResult = parseAndValidateAiResponse(malformed);
    expect(badResult.success).toBe(false);
  });
});

describe('Fallback Responses & Offline Continuity', () => {
  it('returns valid fallback dialogue for all acts', () => {
    const introDialogue = getFallbackDialogue('n_intro');
    expect(introDialogue.length).toBeGreaterThan(0);
    expect(introDialogue[0]).toContain('twilight');

    const clockDialogue = getFallbackDialogue('n_clock');
    expect(clockDialogue.length).toBeGreaterThan(0);

    const bookDialogue = getFallbackDialogue('n_book');
    expect(bookDialogue.length).toBeGreaterThan(0);

    const crystalDialogue = getFallbackDialogue('n_crystal');
    expect(crystalDialogue.length).toBeGreaterThan(0);
  });

  it('returns fallback hints across all 3 tiers', () => {
    const tier0 = getFallbackHint('n_clock', 0); // nudge
    const tier1 = getFallbackHint('n_clock', 1); // strong
    const tier2 = getFallbackHint('n_clock', 2); // explicit

    expect(tier0.length).toBeGreaterThan(0);
    expect(tier1.length).toBeGreaterThan(0);
    expect(tier2.length).toBeGreaterThan(0);
    expect(tier0).not.toEqual(tier2);
  });

  it('never crashes on invalid or missing node ID, providing safe generic fallback', () => {
    const fallback = getFallbackResponse('invalid_node_id', 'fear');
    expect(fallback.dialogue).toBeDefined();
    expect(fallback.hint).toBeDefined();
    expect(fallback.mood).toBe('fear');
  });
});

describe('AI Client (aiClient.ts) Request Handling & Resilience', () => {
  const samplePayload: DialogueRequestPayload = {
    nodeId: 'n_clock',
    emotion: 'hope',
    act: 1,
    speaker: 'clock',
    hintTier: 0,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns validated AI response on successful HTTP 200', async () => {
    const mockResponseData = {
      dialogue: 'Tick, tock. Time awaits your touch.',
      hint: 'Wind the spring gently.',
      mood: 'hope',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponseData,
    } as Response);

    const response = await requestDialogue(samplePayload);
    expect(response.dialogue).toBe(mockResponseData.dialogue);
    expect(response.hint).toBe(mockResponseData.hint);
    expect(response.mood).toBe('hope');
  });

  it('gracefully falls back on HTTP 502 / server error without throwing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
    } as Response);

    const response = await requestDialogue(samplePayload);
    // Should return hand-written fallback dialogue
    expect(response.dialogue).toContain('Forgotten Clock');
    expect(response.mood).toBe('hope');
  });

  it('retries once on network failure then falls back seamlessly', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network connection failed'));
    global.fetch = fetchMock;

    const response = await requestDialogue(samplePayload);
    // Proves it attempted request and retried (called twice)
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Returned guaranteed fallback
    expect(response.dialogue).toContain('Forgotten Clock');
    expect(response.mood).toBe('hope');
  });

  it('falls back on malformed or invalid schema response from server', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ invalid_key: 'not adhering to schema' }),
    } as Response);

    const response = await requestDialogue(samplePayload);
    expect(response.dialogue).toContain('Forgotten Clock');
    expect(response.mood).toBe('hope');
  });

  it('Property 7 / HR-2: Story state is strictly immune to AI output', async () => {
    // Proves that calling requestDialogue never modifies story state or variables
    const initialStory = createInitialStoryState('hope');
    const snapshotVars = { ...initialStory.vars };
    const snapshotFlags = { ...initialStory.flags };

    await requestDialogue(samplePayload);

    expect(initialStory.vars).toEqual(snapshotVars);
    expect(initialStory.flags).toEqual(snapshotFlags);
    expect(initialStory.node).toBe('n_intro');
  });
});

// Pure TypeScript AI Response Validator (HR-1: No React, Three.js, or DOM dependencies)

export interface AiDialogueResponse {
  dialogue: string;
  hint: string;
  mood: string;
}

export type ValidationResult =
  | { success: true; data: AiDialogueResponse }
  | { success: false; error: string };

export const ALLOWED_MOODS = [
  'hope',
  'sadness',
  'curiosity',
  'fear',
  'neutral',
  'dark',
  'warm',
] as const;

export type AllowedMood = (typeof ALLOWED_MOODS)[number];

const MAX_DIALOGUE_LENGTH = 600;
const MAX_HINT_LENGTH = 200;

/**
 * Sanitizes text by stripping harmful non-printable control characters,
 * while preserving standard whitespace and punctuation.
 */
export function sanitizeText(text: string): string {
  let clean = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Keep printable chars (>= 32, except DEL 127) and whitespace (tab 9, newline 10, CR 13)
    if ((code >= 32 && code !== 127) || code === 9 || code === 10 || code === 13) {
      clean += text[i];
    }
  }
  return clean.trim();
}

/**
 * Validates and sanitizes a raw response from the AI endpoint.
 * Enforces exact required keys, string types, allowed moods, and length caps.
 */
export function validateAiResponse(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { success: false, error: 'Response is not a valid JSON object.' };
  }

  const obj = raw as Record<string, unknown>;

  // Check required keys: exactly dialogue, hint, mood
  if (typeof obj.dialogue !== 'string') {
    return { success: false, error: "Field 'dialogue' must be a string." };
  }
  if (typeof obj.hint !== 'string') {
    return { success: false, error: "Field 'hint' must be a string." };
  }
  if (typeof obj.mood !== 'string') {
    return { success: false, error: "Field 'mood' must be a string." };
  }

  const sanitizedDialogue = sanitizeText(obj.dialogue);
  const sanitizedHint = sanitizeText(obj.hint);
  const normalizedMood = obj.mood.toLowerCase().trim();

  // Validate lengths
  if (sanitizedDialogue.length === 0) {
    return { success: false, error: "Field 'dialogue' cannot be empty." };
  }
  if (sanitizedDialogue.length > MAX_DIALOGUE_LENGTH) {
    return {
      success: false,
      error: `Field 'dialogue' exceeds max length of ${MAX_DIALOGUE_LENGTH} chars.`,
    };
  }

  if (sanitizedHint.length === 0) {
    return { success: false, error: "Field 'hint' cannot be empty." };
  }
  if (sanitizedHint.length > MAX_HINT_LENGTH) {
    return {
      success: false,
      error: `Field 'hint' exceeds max length of ${MAX_HINT_LENGTH} chars.`,
    };
  }

  // Validate mood whitelist
  if (!ALLOWED_MOODS.includes(normalizedMood as AllowedMood)) {
    return {
      success: false,
      error: `Mood '${normalizedMood}' is not in allowed moods: ${ALLOWED_MOODS.join(', ')}.`,
    };
  }

  return {
    success: true,
    data: {
      dialogue: sanitizedDialogue,
      hint: sanitizedHint,
      mood: normalizedMood,
    },
  };
}

/**
 * Parses raw JSON string and validates its structure.
 */
export function parseAndValidateAiResponse(rawJson: string): ValidationResult {
  try {
    const parsed = JSON.parse(rawJson);
    return validateAiResponse(parsed);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON string';
    return { success: false, error: `JSON parse failure: ${msg}` };
  }
}

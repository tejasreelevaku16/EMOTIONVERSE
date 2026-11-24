# Phase 2: AI Dialogue & Validation Layer

## Overview
Phase 2 implements the optional AI enrichment and dialogue layer as specified in Kiro's `requirements.md` (FR-7) and `design.md`.

## Core Architectural Guarantees
1. **Immunity of the Story Engine (HR-2 & FR-7.6):**
   - The Story Engine alone manages story progression, variable updates, gating, and endings.
   - AI outputs are presentation-only text enrichment; they never touch story variables, flags, or nodes.
2. **Server-Side Security (FR-7.2 & FR-13.9):**
   - The LLM API key lives exclusively on the server in environment variables (`LLM_API_KEY`).
   - The client never receives, transmits, or bundles any secret credentials. Verified with zero bundle matches.
3. **Resilience & 100% Offline Gameplay (FR-7.4 & FR-7.5):**
   - Client timeout: 5000 ms.
   - Retry: Exactly 1 retry on network failures.
   - Fallback: On any timeout, network error, HTTP 5xx, or schema mismatch, `aiClient` transparently returns hand-written dialogue and hint ladders from `storyData.ts`. Zero user-visible errors.

## Files Created / Implemented
1. `api/dialogue.ts`
   - Node.js runtime Vercel serverless function proxying LLM generation with 8s server-side `AbortController` timeout.
   - Strictly validates request parameters and returns `{ dialogue, hint, mood }`.
2. `src/ai/responseValidator.ts`
   - Strict shape check: `{ dialogue: string, hint: string, mood: string }`.
   - Length caps: `dialogue <= 600`, `hint <= 200`.
   - Mood whitelist: `hope | sadness | curiosity | fear | neutral | dark | warm`.
   - Text sanitizer stripping harmful non-printable control characters.
3. `src/ai/fallbackResponses.ts`
   - Accessors for node dialogue and 3-tier hint ladders directly from `storyData.ts`.
4. `src/ai/aiClient.ts`
   - Resilient client with timeout, single retry, and automatic fallback integration.
5. `src/ai/__tests__/ai.test.ts`
   - 15 unit and property tests verifying schema validation, sanitize, fallback coverage, and story immunity.

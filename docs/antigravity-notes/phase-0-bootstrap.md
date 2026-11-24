# Phase 0: Project Bootstrap & Toolchain Setup

## Overview
Phase 0 establishes the bedrock for the **EMOTIONVERSE: THE LAST LIGHT** MVP according to the Kiro specifications in `.kiro/specs/emotionverse-mvp/`.

## Created Configuration & Architecture Guardrails
1. **Toolchain & Strict Types:**
   - Vite 5.4.8 + React 18.3.1 + TypeScript 5.6.2 (strict mode enabled).
   - React Three Fiber 8.17.10 + Three.js 0.169.0 (exact pin per design.md) + Drei 9.114.3.
   - Zustand 5.0.0 for centralized store.
2. **Design Tokens & Visual System:**
   - Tailwind CSS with dark-fantasy palette:
     - `bg-void`: `#050608`
     - `bg-emerald-deep`: `#0a1f1c`
     - `accent-cyan`: `#67e8f9`
     - `accent-glow`: `#22d3aa`
     - Palettes for the 4 emotions: Hope (golden/yellow), Sadness (blue), Curiosity (emerald/mint), Fear (purple/dark).
     - Glassmorphism utility classes and glowing shadows.
3. **Hard Rule Guard (HR-1 / C-7):**
   - Configured in `eslint.config.js` to strictly forbid imports of `react`, `react-dom`, `three`, and `@react-three/*` within `src/story/` and `src/ai/`.
4. **Vercel Serverless Architecture (C-2, FR-7):**
   - Single serverless function proxy at `api/dialogue.ts`.
   - Never exposes server secrets to the client.
5. **Testing Backbone:**
   - Vitest + Testing Library + jsdom for deterministic property and unit tests.

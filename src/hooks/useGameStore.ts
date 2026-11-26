// Centralized Zustand Game Store (Phase 3)
// Bridges the pure deterministic story engine, atmosphere controller, persistence, and UI.

import { create } from 'zustand';
import type { Emotion, StoryVars, StoryFlags, Choice, ReactionKey } from '../story/storyState';
import {
  createInitialStoryState,
  INITIAL_STORY_VARS,
  INITIAL_STORY_FLAGS,
} from '../story/storyState';
import { advance, availableChoices, getNode, isTerminalNode } from '../story/storyEngine';
import { getEnding, getEndingAtmosphereKey } from '../story/endings';
import type { AtmosphereKey } from '../game/atmosphereProfiles';
import {
  saveGame,
  loadGame,
  clearSavedGame,
  DEFAULT_SETTINGS,
  type GameSettings,
} from '../services/persistence';

export type GameScreen = 'landing' | 'emotion_selection' | 'exploration' | 'ending';

export type ArtifactType = 'clock' | 'book' | 'crystal';

const OBJECTIVE_MAP: Record<string, string> = {
  n_intro: 'Find the source of the fading light.',
  n_clock: 'Investigate the Forgotten Clock.',
  n_clock_echo_wind: 'The clock stirs — feel the consequence.',
  n_clock_echo_leave: 'Leave the clock undisturbed.',
  n_clock_echo_break: 'The clock is shattered.',
  n_clock_echo_study: 'Ancient glyphs decoded.',
  n_clock_after: 'Seek the voice hidden in the Living Book.',
  n_midpoint: 'Find the Living Book in the deep grove.',
  n_book: 'Engage with the Living Book.',
  n_book_echo_trust: 'The grove responds to your trust.',
  n_book_echo_reject: 'The book falls silent.',
  n_book_echo_partial: 'Historical knowledge gathered.',
  n_book_after: 'Cross into the final sanctuary.',
  n_crossing: 'Ascend to the Last Crystal.',
  n_crystal_intro: 'Approach the Last Crystal.',
  n_crystal: 'Decide the fate of the Last Crystal.',
  n_crystal_echo_hymn: 'The crystal resonates — make your final choice.',
  n_end_restore: 'The ancient light is restored.',
  n_end_transform: 'The world is transformed.',
  n_end_dark: 'The last light fades.',
};

export interface GameState {
  // Navigation / Screen State
  screen: GameScreen;

  // Story & Core State
  emotion: Emotion | null;
  node: string;
  act: 1 | 2 | 3;
  vars: StoryVars;
  flags: StoryFlags;
  choices: Choice[];

  // Environment & Atmosphere State
  atmosphereKey: AtmosphereKey;
  lastReaction: ReactionKey | null;

  // Settings
  settings: GameSettings;

  // UI & AI Presentation State (Strictly separate from authoritative story state)
  activeDialogue: string | null;
  activeHint: string | null;
  hintTier: 0 | 1 | 2;
  isAiLoading: boolean;
  isInteractionPanelOpen: boolean;
  activeArtifact: ArtifactType | null;

  // Camera & Objective (Phase 5 quality)
  cameraMode: 'follow' | 'pushIn' | 'hold';
  objectiveText: string;

  // Actions
  goToScreen: (screen: GameScreen) => void;
  startNewJourney: (emotion: Emotion) => void;
  continueJourney: () => boolean;
  makeChoice: (choiceId: string) => void;
  setAiEnrichment: (dialogue: string, hint: string) => void;
  setAiLoading: (loading: boolean) => void;
  setHintTier: (tier: 0 | 1 | 2) => void;
  toggleMute: () => void;
  toggleReducedMotion: () => void;
  openArtifactPanel: (artifact: ArtifactType) => void;
  closeArtifactPanel: () => void;
  setCameraMode: (mode: 'follow' | 'pushIn' | 'hold') => void;
  resetGame: () => void;
}

// Debounce timer for saving state changes (~300ms)
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(state: {
  emotion: Emotion;
  node: string;
  vars: StoryVars;
  flags: StoryFlags;
  settings: GameSettings;
}) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveGame({
      emotion: state.emotion,
      storyNodeId: state.node,
      vars: state.vars,
      flags: state.flags,
      settings: state.settings,
    });
  }, 300);
}

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'landing',
  emotion: null,
  node: 'n_intro',
  act: 1,
  vars: { ...INITIAL_STORY_VARS },
  flags: { ...INITIAL_STORY_FLAGS },
  choices: availableChoices(createInitialStoryState('hope')),

  atmosphereKey: 'hope',
  lastReaction: null,

  settings: { ...DEFAULT_SETTINGS },

  activeDialogue: null,
  activeHint: null,
  hintTier: 0,
  isAiLoading: false,
  isInteractionPanelOpen: false,
  activeArtifact: null,

  cameraMode: 'follow',
  objectiveText: 'Find the source of the fading light.',

  goToScreen: (screen) => set({ screen }),

  startNewJourney: (emotion) => {
    // Clear any previous save
    clearSavedGame();

    const initialState = createInitialStoryState(emotion);
    const initialChoices = availableChoices(initialState);
    const currentNode = getNode('n_intro');

    set({
      screen: 'exploration',
      emotion,
      node: 'n_intro',
      act: 1,
      vars: initialState.vars,
      flags: initialState.flags,
      choices: initialChoices,
      atmosphereKey: emotion,
      lastReaction: null,
      activeDialogue: currentNode?.fallback.dialogue.join(' ') ?? null,
      activeHint: currentNode?.fallback.hintLadder[0] ?? null,
      hintTier: 0,
      isAiLoading: false,
      isInteractionPanelOpen: false,
      activeArtifact: null,
      cameraMode: 'follow',
      objectiveText: OBJECTIVE_MAP['n_intro'],
    });

    debouncedSave({
      emotion,
      node: 'n_intro',
      vars: initialState.vars,
      flags: initialState.flags,
      settings: get().settings,
    });
  },

  continueJourney: () => {
    const saved = loadGame();
    if (!saved) {
      return false;
    }

    const savedState = {
      node: saved.storyNodeId,
      vars: saved.vars,
      flags: saved.flags,
      emotion: saved.emotion,
    };

    const nodeData = getNode(saved.storyNodeId);
    const act = nodeData ? nodeData.act : 1;
    const currentChoices = availableChoices(savedState);
    const isTerminal = isTerminalNode(saved.storyNodeId);

    // Derive correct atmosphere key based on saved node and ending state
    let atmosphereKey: AtmosphereKey = saved.emotion;
    if (isTerminal) {
      const ending = getEnding(savedState);
      atmosphereKey = getEndingAtmosphereKey(ending);
    } else if (saved.storyNodeId === 'n_midpoint') {
      atmosphereKey = 'midpoint';
    } else if (saved.storyNodeId === 'n_crossing') {
      atmosphereKey = 'act3';
    }

    set({
      screen: isTerminal ? 'ending' : 'exploration',
      emotion: saved.emotion,
      node: saved.storyNodeId,
      act,
      vars: saved.vars,
      flags: saved.flags,
      choices: currentChoices,
      settings: saved.settings,
      atmosphereKey,
      lastReaction: null,
      activeDialogue: nodeData?.fallback.dialogue.join(' ') ?? null,
      activeHint: nodeData?.fallback.hintLadder[0] ?? null,
      hintTier: 0,
      isAiLoading: false,
      isInteractionPanelOpen: false,
      activeArtifact: null,
      cameraMode: 'follow',
      objectiveText: OBJECTIVE_MAP[saved.storyNodeId] ?? 'Explore the sanctuary.',
    });

    return true;
  },

  makeChoice: (choiceId) => {
    const { node, vars, flags, emotion, settings } = get();
    if (!emotion) return;

    const currentState = { node, vars, flags, emotion };

    // Advance story via the pure deterministic story engine
    const nextState = advance(currentState, choiceId);
    const nextNodeData = getNode(nextState.node);
    const nextChoices = availableChoices(nextState);
    const isTerminal = isTerminalNode(nextState.node);

    // Identify if the choice emitted an environmental reaction
    const currentChoices = get().choices;
    const selectedChoice = currentChoices.find((c) => c.id === choiceId);
    const reaction = selectedChoice?.envReaction ?? null;

    // Compute updated atmosphere profile key
    let atmosphereKey = get().atmosphereKey;
    if (isTerminal) {
      const ending = getEnding(nextState);
      atmosphereKey = getEndingAtmosphereKey(ending);
    } else if (nextState.node === 'n_midpoint') {
      atmosphereKey = 'midpoint';
    } else if (nextState.node === 'n_crossing') {
      atmosphereKey = 'act3';
    }

    set({
      node: nextState.node,
      act: nextNodeData ? nextNodeData.act : get().act,
      vars: nextState.vars,
      flags: nextState.flags,
      choices: nextChoices,
      atmosphereKey,
      lastReaction: reaction,
      screen: isTerminal ? 'ending' : 'exploration',
      activeDialogue: nextNodeData?.fallback.dialogue.join(' ') ?? null,
      activeHint: nextNodeData?.fallback.hintLadder[0] ?? null,
      hintTier: 0,
      isAiLoading: false,
      isInteractionPanelOpen: false,
      activeArtifact: null,
      cameraMode: 'follow',
      objectiveText: OBJECTIVE_MAP[nextState.node] ?? 'Explore the sanctuary.',
    });

    debouncedSave({
      emotion,
      node: nextState.node,
      vars: nextState.vars,
      flags: nextState.flags,
      settings,
    });
  },

  setAiEnrichment: (dialogue, hint) => {
    // Presentation-only enrichment: strictly updates UI presentation text
    set({
      activeDialogue: dialogue,
      activeHint: hint,
      isAiLoading: false,
    });
  },

  setAiLoading: (loading) => set({ isAiLoading: loading }),

  setHintTier: (tier) => {
    const { node } = get();
    const nodeData = getNode(node);
    const hint = nodeData?.fallback.hintLadder[tier] ?? get().activeHint;
    set({ hintTier: tier, activeHint: hint });
  },

  toggleMute: () => {
    const currentSettings = get().settings;
    const updatedSettings = { ...currentSettings, muted: !currentSettings.muted };
    set({ settings: updatedSettings });

    const { emotion, node, vars, flags } = get();
    if (emotion) {
      debouncedSave({ emotion, node, vars, flags, settings: updatedSettings });
    }
  },

  toggleReducedMotion: () => {
    const currentSettings = get().settings;
    const updatedSettings = {
      ...currentSettings,
      reducedMotion: !currentSettings.reducedMotion,
    };
    set({ settings: updatedSettings });

    const { emotion, node, vars, flags } = get();
    if (emotion) {
      debouncedSave({ emotion, node, vars, flags, settings: updatedSettings });
    }
  },

  openArtifactPanel: (artifact) => {
    set({ isInteractionPanelOpen: true, activeArtifact: artifact, cameraMode: 'pushIn' });
  },

  closeArtifactPanel: () => {
    set({ isInteractionPanelOpen: false, activeArtifact: null, cameraMode: 'follow' });
  },

  setCameraMode: (mode) => set({ cameraMode: mode }),

  resetGame: () => {
    clearSavedGame();
    set({
      screen: 'landing',
      emotion: null,
      node: 'n_intro',
      act: 1,
      vars: { ...INITIAL_STORY_VARS },
      flags: { ...INITIAL_STORY_FLAGS },
      choices: [],
      atmosphereKey: 'hope',
      lastReaction: null,
      settings: { ...DEFAULT_SETTINGS },
      activeDialogue: null,
      activeHint: null,
      hintTier: 0,
      isAiLoading: false,
      isInteractionPanelOpen: false,
      activeArtifact: null,
      cameraMode: 'follow',
      objectiveText: 'Find the source of the fading light.',
    });
  },
}));

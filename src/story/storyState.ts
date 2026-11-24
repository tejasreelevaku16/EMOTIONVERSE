// Pure TypeScript Story State & Types (HR-1: No React, Three.js, or DOM dependencies)

export type Emotion = 'hope' | 'sadness' | 'curiosity' | 'fear';

export interface StoryVars {
  resolve: number;
  memory: number;
  light: number;
}

export interface StoryFlags {
  clockWound: boolean;
  clockBroken: boolean;
  bookTrusted: boolean;
  crystalShared: boolean;
}

export type Gate = (vars: StoryVars, flags: StoryFlags, emotion: Emotion) => boolean;

export interface Choice {
  id: string;
  label: string;
  gate?: Gate;
  effects?: Partial<StoryVars>;
  setFlags?: Partial<StoryFlags>;
  next: string;
  envReaction?: ReactionKey;
}

export interface StoryNode {
  id: string;
  act: 1 | 2 | 3;
  speaker: 'narrator' | 'clock' | 'book' | 'crystal';
  fallback: {
    dialogue: string[];
    hintLadder: [string, string, string];
  };
  choices: Choice[];
}

export interface StoryState {
  node: string;
  vars: StoryVars;
  flags: StoryFlags;
  emotion: Emotion;
}

export type ReactionKey =
  | 'CLOCK_WOUND_LIGHT'
  | 'BOOK_TRUSTED_BLOOM'
  | 'CRYSTAL_SHARED_BLOOM'
  | 'ACT_2'
  | 'ACT_3'
  | 'ENDING_RESTORE'
  | 'ENDING_TRANSFORM'
  | 'ENDING_DARK';

export type EndingType = 'RESTORATION' | 'TRANSFORMATION' | 'DARKNESS';

export const INITIAL_STORY_VARS: StoryVars = {
  resolve: 1,
  memory: 0,
  light: 0,
};

export const INITIAL_STORY_FLAGS: StoryFlags = {
  clockWound: false,
  clockBroken: false,
  bookTrusted: false,
  crystalShared: false,
};

export function createInitialStoryState(emotion: Emotion): StoryState {
  return {
    node: 'n_intro',
    vars: { ...INITIAL_STORY_VARS },
    flags: { ...INITIAL_STORY_FLAGS },
    emotion,
  };
}

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Landing } from '../Landing';
import { EmotionSelection } from '../EmotionSelection';
import { GameUI } from '../GameUI';
import { EndingScreen } from '../EndingScreen';
import { useGameStore } from '../../hooks/useGameStore';
import { saveGame } from '../../services/persistence';

describe('Cinematic UI Components (Phase 4)', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetGame();
  });

  it('Landing renders branding, tagline, and New Journey action', () => {
    render(<Landing />);

    expect(screen.getByText('EMOTIONVERSE')).toBeInTheDocument();
    expect(
      screen.getByText('"Feel the World. Shape the Story. Change Your Destiny."')
    ).toBeInTheDocument();
    expect(screen.getByText('New Journey')).toBeInTheDocument();
  });

  it('Landing displays Continue button when a valid saved game exists', () => {
    saveGame({
      emotion: 'hope',
      storyNodeId: 'n_clock',
      vars: { resolve: 2, memory: 0, light: 1 },
      flags: { clockWound: true, clockBroken: false, bookTrusted: false, crystalShared: false },
      settings: { muted: false, reducedMotion: false },
    });

    render(<Landing />);
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('EmotionSelection displays all four emotion cards with unique titles', () => {
    render(<EmotionSelection />);

    expect(screen.getByText('HOPE')).toBeInTheDocument();
    expect(screen.getByText('SADNESS')).toBeInTheDocument();
    expect(screen.getByText('CURIOSITY')).toBeInTheDocument();
    expect(screen.getByText('FEAR')).toBeInTheDocument();
  });

  it('Clicking an emotion initiates a new journey and switches to exploration', () => {
    render(<EmotionSelection />);

    const hopeCard = screen.getByText('HOPE');
    fireEvent.click(hopeCard);

    expect(useGameStore.getState().screen).toBe('exploration');
    expect(useGameStore.getState().emotion).toBe('hope');
  });

  it('GameUI displays current act, emotion badge, and story stats', () => {
    useGameStore.getState().startNewJourney('curiosity');

    render(<GameUI />);

    expect(screen.getByText('Act I — The Forgotten Clock')).toBeInTheDocument();
    expect(screen.getByText(/curiosity/i)).toBeInTheDocument();
  });

  it('EndingScreen presents the correct ending narrative and restart action', () => {
    useGameStore.getState().startNewJourney('hope');

    // Simulate Transformation ending state
    useGameStore.setState({
      node: 'n_end_transform',
      flags: { clockWound: false, clockBroken: false, bookTrusted: false, crystalShared: true },
      screen: 'ending',
    });

    render(<EndingScreen />);

    expect(screen.getByText('TRANSFORMATION')).toBeInTheDocument();
    expect(screen.getByText('Awaken Anew')).toBeInTheDocument();

    // Click Awaken Anew -> resets game back to landing
    const restartBtn = screen.getByText('Awaken Anew');
    fireEvent.click(restartBtn);

    expect(useGameStore.getState().screen).toBe('landing');
    expect(useGameStore.getState().emotion).toBeNull();
  });
});

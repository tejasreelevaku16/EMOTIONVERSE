import { useEffect, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGameStore } from '../hooks/useGameStore';
import { GameUI } from './GameUI';
import { StoryPanel } from './StoryPanel';
import { InteractionPrompt } from './InteractionPrompt';
import { World } from '../game/World';
import { requestDialogue } from '../ai/aiClient';
import { getNode } from '../story/storyEngine';

export function ExplorationScreen() {
  const {
    emotion,
    act,
    node,
    setAiEnrichment,
    setAiLoading,
    choices,
    isInteractionPanelOpen,
    openArtifactPanel,
    objectiveText,
  } = useGameStore();

  const [nearbyArtifact, setNearbyArtifact] = useState<'clock' | 'book' | 'crystal' | null>(null);

  // Trigger optional AI enrichment when story node changes
  useEffect(() => {
    if (!emotion) return;
    const nodeData = getNode(node);
    if (!nodeData) return;
    let isMounted = true;
    setAiLoading(true);
    requestDialogue({
      nodeId: node,
      emotion,
      act,
      speaker: nodeData.speaker,
      availableChoiceLabels: choices.map((c) => c.label),
    })
      .then((res) => {
        if (isMounted) setAiEnrichment(res.dialogue, res.hint);
      })
      .catch(() => {})
      .finally(() => { if (isMounted) setAiLoading(false); });
    return () => { isMounted = false; };
  }, [node, emotion, act, setAiEnrichment, setAiLoading, choices]);

  // E key proximity interaction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && nearbyArtifact && !isInteractionPanelOpen) {
        openArtifactPanel(nearbyArtifact);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearbyArtifact, isInteractionPanelOpen, openArtifactPanel]);

  const handleProximityChange = useCallback((nearby: 'clock' | 'book' | 'crystal' | null) => {
    setNearbyArtifact(nearby);
  }, []);

  const activeArtifactData = nearbyArtifact ? {
    clock: { id: 'clock' as const, name: 'The Forgotten Clock' },
    book:  { id: 'book'  as const, name: 'The Living Book' },
    crystal: { id: 'crystal' as const, name: 'The Last Crystal' },
  }[nearbyArtifact] : null;

  return (
    <div className='relative w-full h-full min-h-screen bg-void select-none overflow-hidden'>

      {/* Full-screen R3F Canvas */}
      <div className='absolute inset-0 z-0'>
        <Canvas
          camera={{ position: [0, 2.8, 5.6], fov: 60 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <World onProximityChange={handleProximityChange} />
        </Canvas>
      </div>

      {/* Top HUD */}
      <GameUI />

      {/* Objective Bar */}
      <div className='fixed top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none'>
        <div className='glass-panel px-4 py-1.5 rounded-full border border-emerald-glow/20 flex items-center space-x-2 text-xs font-mono text-emerald-200/80 max-w-xs sm:max-w-sm'>
          <span className='w-1.5 h-1.5 rounded-full bg-emerald-glow animate-pulse flex-shrink-0' />
          <span className='truncate'>{objectiveText}</span>
        </div>
      </div>

      {/* Directional Landmark Guide */}
      {!nearbyArtifact && !isInteractionPanelOpen && (
        <div className='fixed bottom-32 right-6 z-30 pointer-events-none'>
          <div className='glass-panel p-2.5 rounded-xl border border-white/10 text-center'>
            <div className='w-5 h-5 rounded-full border-2 border-cyan-glow/60 flex items-center justify-center mx-auto mb-1'>
              <div className='w-1.5 h-1.5 rounded-full bg-cyan-glow animate-pulse' />
            </div>
            <p className='text-[9px] font-mono text-gray-400 leading-tight max-w-[56px] whitespace-pre-line'>
              {act === 1 ? 'Clock\nNorth' : act === 2 ? 'Book\nWest' : 'Crystal\nEast'}
            </p>
          </div>
        </div>
      )}

      {/* Controls hint (bottom left) */}
      <div className='fixed bottom-6 left-6 z-30 hidden sm:flex items-center space-x-3 glass-panel px-4 py-2.5 rounded-xl border border-white/10 text-xs font-mono text-gray-300 pointer-events-none'>
        <div className='flex items-center space-x-1.5'>
          <kbd className='px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-bold text-cyan-200'>W</kbd>
          <kbd className='px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-bold text-cyan-200'>A</kbd>
          <kbd className='px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-bold text-cyan-200'>S</kbd>
          <kbd className='px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-bold text-cyan-200'>D</kbd>
          <span>to Explore</span>
        </div>
        <span className='text-white/20'>|</span>
        <span>Drag to Orbit</span>
      </div>

      {/* Proximity Interaction Prompt */}
      {activeArtifactData && !isInteractionPanelOpen && (
        <InteractionPrompt
          artifactName={activeArtifactData.name}
          onInteract={() => openArtifactPanel(activeArtifactData.id)}
        />
      )}

      {/* Compact Story Panel — always visible */}
      <div className='fixed bottom-4 left-4 right-4 sm:bottom-5 sm:left-1/2 sm:-translate-x-1/2 z-30 max-w-2xl w-full pointer-events-auto'>
        <StoryPanel />
      </div>

    </div>
  );
}
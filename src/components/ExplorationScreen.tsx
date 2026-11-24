import { useEffect, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGameStore } from '../hooks/useGameStore';
import { GameUI } from './GameUI';
import { StoryPanel } from './StoryPanel';
import { InteractionPrompt } from './InteractionPrompt';
import { World } from '../game/World';
import { requestDialogue } from '../ai/aiClient';
import { getNode } from '../story/storyEngine';
import { Clock, BookOpen, Gem, Sparkles, MessageSquare, Eye } from 'lucide-react';

const ARTIFACT_INFO = {
  clock: {
    id: 'clock' as const,
    name: 'The Forgotten Clock',
    icon: Clock,
    description: 'An ancient chronometer embedded in an altar of petrified stone, frozen at the twilight hour.',
    accentColor: '#facc15',
  },
  book: {
    id: 'book' as const,
    name: 'The Living Book',
    icon: BookOpen,
    description: 'A leather-bound tome whose leaves rustle softly with the memories and sorrows of former keepers.',
    accentColor: '#60a5fa',
  },
  crystal: {
    id: 'crystal' as const,
    name: 'The Last Crystal',
    icon: Gem,
    description: 'A radiant prism suspended above the sacred dais, vibrating with the final cosmic essence of Emotionverse.',
    accentColor: '#22d3aa',
  },
};

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
    closeArtifactPanel,
  } = useGameStore();

  const [nearbyArtifact, setNearbyArtifact] = useState<'clock' | 'book' | 'crystal' | null>(null);
  const [isDialoguePanelExpanded, setIsDialoguePanelExpanded] = useState(true);

  // Trigger optional AI enrichment in the background when story node changes
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
        if (isMounted) {
          setAiEnrichment(res.dialogue, res.hint);
        }
      })
      .catch(() => {
        // Fallback is automatically handled inside aiClient
      })
      .finally(() => {
        if (isMounted) {
          setAiLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [node, emotion, act, setAiEnrichment, setAiLoading, choices]);

  // Listen for the 'E' key for proximity interaction
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

  const activeArtifactData = nearbyArtifact ? ARTIFACT_INFO[nearbyArtifact] : null;

  return (
    <div className="relative w-full h-full min-h-screen bg-void select-none overflow-hidden">
      {/* ========================================================
          FULL-SCREEN REACT THREE FIBER 3D CANVAS LAYER
         ======================================================== */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 2.8, 5.6], fov: 60 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <World onProximityChange={handleProximityChange} />
        </Canvas>
      </div>

      {/* ========================================================
          2D UI OVERLAYS (Floating on top of 3D Canvas)
         ======================================================== */}
      {/* Top HUD: Act, Emotion, Story Stats, Mute, Hints */}
      <GameUI />

      {/* Exploration Controls Hint Pill (Bottom Left) */}
      <div className="fixed bottom-6 left-6 z-30 hidden sm:flex items-center space-x-3 glass-panel px-4 py-2.5 rounded-xl border border-white/10 text-xs font-mono text-gray-300 pointer-events-none">
        <div className="flex items-center space-x-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-bold text-cyan-200">W</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-bold text-cyan-200">A</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-bold text-cyan-200">S</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-bold text-cyan-200">D</kbd>
          <span>to Explore</span>
        </div>
        <span className="text-white/20">|</span>
        <div className="flex items-center space-x-1.5">
          <Eye className="w-3.5 h-3.5 text-cyan- glow" />
          <span>Click & Drag to Orbit</span>
        </div>
      </div>

      {/* Proximity Interaction Prompt (Appears when near Clock, Book, or Crystal) */}
      {activeArtifactData && !isInteractionPanelOpen && (
        <InteractionPrompt
          artifactName={activeArtifactData.name}
          onInteract={() => openArtifactPanel(activeArtifactData.id)}
        />
      )}

      {/* Bottom Center Story & Choice Dialogue Panel */}
      <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 z-30 max-w-3xl w-full pointer-events-auto">
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setIsDialoguePanelExpanded(!isDialoguePanelExpanded)}
            className="glass-panel px-3 py-1 rounded-full text-xs font-mono text-cyan-200 hover:text-white flex items-center space-x-1.5 cursor-pointer border border-cyan-glow/20"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{isDialoguePanelExpanded ? 'Minimize Story Panel' : 'Show Story Panel'}</span>
          </button>
        </div>

        {isDialoguePanelExpanded && <StoryPanel />}
      </div>

      {/* Artifact Detailed Lore Inspection Modal */}
      {isInteractionPanelOpen && activeArtifactData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl max-w-md w-full border border-cyan-glow/40 text-center animate-in fade-in zoom-in-95 duration-200">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center border shadow-lg"
              style={{
                backgroundColor: `${activeArtifactData.accentColor}20`,
                borderColor: `${activeArtifactData.accentColor}80`,
              }}
            >
              <activeArtifactData.icon className="w-8 h-8" style={{ color: activeArtifactData.accentColor }} />
            </div>

            <h3 className="font-cinzel text-xl font-bold text-white mb-2">
              {activeArtifactData.name}
            </h3>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed font-light">
              {activeArtifactData.description}
            </p>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-6 text-xs text-cyan-200 font-mono flex items-center justify-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-glow" />
              <span>Use the story panel below to shape its fate.</span>
            </div>

            <button
              onClick={closeArtifactPanel}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-cinzel text-xs font-bold tracking-wider hover:opacity-95 cursor-pointer"
            >
              Continue Journey
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

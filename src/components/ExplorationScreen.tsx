import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import { GameUI } from './GameUI';
import { StoryPanel } from './StoryPanel';
import { InteractionPrompt } from './InteractionPrompt';
import { ATMOSPHERE_PROFILES } from '../game/atmosphereProfiles';
import { requestDialogue } from '../ai/aiClient';
import { getNode } from '../story/storyEngine';
import { Clock, BookOpen, Gem, Sparkles } from 'lucide-react';

const ARTIFACT_INFO = {
  1: {
    id: 'clock' as const,
    name: 'The Forgotten Clock',
    icon: Clock,
    description: 'An ancient chronometer embedded in an altar of petrified stone, frozen at the twilight hour.',
    accentColor: '#facc15',
  },
  2: {
    id: 'book' as const,
    name: 'The Living Book',
    icon: BookOpen,
    description: 'A leather-bound tome whose leaves rustle softly with the memories and sorrows of former keepers.',
    accentColor: '#60a5fa',
  },
  3: {
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
    atmosphereKey,
    setAiEnrichment,
    setAiLoading,
    choices,
    isInteractionPanelOpen,
    openArtifactPanel,
    closeArtifactPanel,
  } = useGameStore();

  const [promptDismissed, setPromptDismissed] = useState(false);

  const profile = ATMOSPHERE_PROFILES[atmosphereKey] || ATMOSPHERE_PROFILES.hope;
  const currentArtifact = ARTIFACT_INFO[act];
  const ArtifactIcon = currentArtifact.icon;

  // Trigger optional AI enrichment in the background when node changes
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
    }).then((res) => {
      if (isMounted) {
        setAiEnrichment(res.dialogue, res.hint);
      }
    }).catch(() => {
      // Fallback is automatically handled inside aiClient
    }).finally(() => {
      if (isMounted) {
        setAiLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [node, emotion, act, setAiEnrichment, setAiLoading, choices]);

  // Determine atmospheric background gradient style
  const backgroundStyle = useMemo(() => {
    return {
      background: `radial-gradient(circle at 50% 30%, ${profile.skyColor}15 0%, ${profile.fogColor}20 50%, #050608 100%)`,
    };
  }, [profile]);

  return (
    <div
      style={backgroundStyle}
      className="relative w-full h-full min-h-screen flex flex-col justify-between p-4 sm:p-8 overflow-hidden select-none transition-colors duration-1000"
    >
      {/* Dynamic Lighting Orb corresponding to Atmosphere profile */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none transition-all duration-1000 opacity-30"
        style={{ backgroundColor: profile.sunColor }}
      />

      {/* Floating ambient particles representation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-3 h-3 rounded-full blur-xs top-1/4 left-1/5 animate-float opacity-60"
          style={{ backgroundColor: profile.particleColor }}
        />
        <div
          className="absolute w-2 h-2 rounded-full blur-xs top-2/3 right-1/4 animate-float opacity-40 delay-1000"
          style={{ backgroundColor: profile.particleColor }}
        />
        <div
          className="absolute w-4 h-4 rounded-full blur-sm bottom-1/4 left-1/3 animate-float opacity-30 delay-2000"
          style={{ backgroundColor: profile.particleColor }}
        />
      </div>

      {/* Top HUD */}
      <GameUI />

      {/* Center 3D Atmosphere / Artifact Focal Stage */}
      <main className="flex-1 flex flex-col items-center justify-center my-auto z-20 py-8">
        <div
          onClick={() => {
            openArtifactPanel(currentArtifact.id);
            setPromptDismissed(true);
          }}
          className="group relative cursor-pointer flex flex-col items-center"
        >
          {/* Artifact Pulsing Aura */}
          <div
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center glass-panel border border-white/20 shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:shadow-glow-cyan"
            style={{
              borderColor: `${currentArtifact.accentColor}60`,
              boxShadow: `0 0 40px -10px ${currentArtifact.accentColor}40`,
            }}
          >
            <ArtifactIcon
              className="w-14 h-14 sm:w-16 sm:h-16 transition-transform group-hover:rotate-6 duration-300"
              style={{ color: currentArtifact.accentColor }}
            />
          </div>

          <div className="mt-4 text-center">
            <h3 className="font-cinzel text-lg sm:text-xl font-bold text-white tracking-wider group-hover:text-cyan-200 transition-colors">
              {currentArtifact.name}
            </h3>
            <p className="text-xs font-mono text-gray-400 mt-1 max-w-xs sm:max-w-md">
              {currentArtifact.description}
            </p>
          </div>
        </div>
      </main>

      {/* Story & Choice Dialogue Panel */}
      <div className="w-full z-30">
        <StoryPanel />
      </div>

      {/* Proximity Interaction Prompt */}
      {!promptDismissed && !isInteractionPanelOpen && (
        <InteractionPrompt
          artifactName={currentArtifact.name}
          onInteract={() => {
            openArtifactPanel(currentArtifact.id);
            setPromptDismissed(true);
          }}
        />
      )}

      {/* Artifact Detailed Inspection Modal */}
      {isInteractionPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl max-w-md w-full border border-cyan-glow/40 text-center animate-in fade-in zoom-in-95 duration-200">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center border shadow-lg"
              style={{
                backgroundColor: `${currentArtifact.accentColor}20`,
                borderColor: `${currentArtifact.accentColor}80`,
              }}
            >
              <ArtifactIcon className="w-8 h-8" style={{ color: currentArtifact.accentColor }} />
            </div>

            <h3 className="font-cinzel text-xl font-bold text-white mb-2">
              {currentArtifact.name}
            </h3>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed font-light">
              {currentArtifact.description}
            </p>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-6 text-xs text-cyan-200 font-mono flex items-center justify-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-glow" />
              <span>Make your choice in the story panel below.</span>
            </div>

            <button
              onClick={closeArtifactPanel}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-cinzel text-xs font-bold tracking-wider hover:opacity-95 cursor-pointer"
            >
              Return to Story
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import { audioService } from '../services/audio';
import {
  Volume2,
  VolumeX,
  Eye,
  HelpCircle,
  Sun,
  CloudRain,
  Compass,
  Ghost,
  Shield,
  Book,
  Sparkles,
  X,
  ChevronRight,
} from 'lucide-react';
import { getNode } from '../story/storyEngine';

const EMOTION_ICONS = {
  hope: Sun,
  sadness: CloudRain,
  curiosity: Compass,
  fear: Ghost,
};

const EMOTION_COLORS = {
  hope: 'text-hope-glow border-hope-glow/40 bg-hope-glow/10',
  sadness: 'text-sadness-glow border-sadness-glow/40 bg-sadness-glow/10',
  curiosity: 'text-cyan-glow border-cyan-glow/40 bg-cyan-glow/10',
  fear: 'text-fear-glow border-fear-glow/40 bg-fear-glow/10',
};

const ACT_NAMES = {
  1: 'Act I — The Forgotten Clock',
  2: 'Act II — The Living Memory',
  3: 'Act III — The Last Sanctuary',
};

export function GameUI() {
  const {
    emotion,
    act,
    vars,
    node,
    settings,
    toggleMute,
    toggleReducedMotion,
    hintTier,
    setHintTier,
    activeHint,
  } = useGameStore();

  const [showHintModal, setShowHintModal] = useState(false);

  const EmotionIcon = emotion ? EMOTION_ICONS[emotion] : Compass;
  const emotionBadgeClass = emotion ? EMOTION_COLORS[emotion] : 'text-cyan-glow';

  const nodeData = getNode(node);
  const currentHint = activeHint || nodeData?.fallback.hintLadder[hintTier] || 'Explore the sanctuary.';

  const handleNextHintTier = () => {
    if (hintTier < 2) {
      setHintTier((hintTier + 1) as 0 | 1 | 2);
    }
  };

  return (
    <>
      {/* Top HUD Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 p-4 sm:p-6 flex justify-between items-start pointer-events-none select-none">
        {/* Left Side: Act & Emotion Status */}
        <div className="flex flex-col space-y-2 pointer-events-auto">
          {/* Act Badge */}
          <div className="glass-panel px-4 py-1.5 rounded-full border border-white/10 flex items-center space-x-2 text-xs font-cinzel text-cyan-100">
            <span className="w-2 h-2 rounded-full bg-emerald-glow animate-pulse" />
            <span>{ACT_NAMES[act]}</span>
          </div>

          {/* Emotion Badge */}
          {emotion && (
            <div className={`glass-panel px-3.5 py-1.5 rounded-full border flex items-center space-x-2 text-xs font-mono tracking-wider ${emotionBadgeClass}`}>
              <EmotionIcon className="w-3.5 h-3.5" />
              <span className="uppercase font-semibold">{emotion}</span>
            </div>
          )}
        </div>

        {/* Right Side: Stats & Utility Controls */}
        <div className="flex items-center space-x-3 pointer-events-auto">
          {/* Player Story Variables Bar */}
          <div className="hidden sm:flex items-center space-x-4 glass-panel px-4 py-2 rounded-xl border border-white/10 text-xs font-mono text-gray-300">
            <div className="flex items-center space-x-1.5" title="Resolve: Courage & Willpower">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>{vars.resolve}</span>
            </div>
            <div className="w-px h-3 bg-white/20" />
            <div className="flex items-center space-x-1.5" title="Memory: Lore & Ancient Knowledge">
              <Book className="w-3.5 h-3.5 text-cyan-300" />
              <span>{vars.memory}</span>
            </div>
            <div className="w-px h-3 bg-white/20" />
            <div className="flex items-center space-x-1.5" title="Light: Saved Primordial Essence">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>{vars.light}</span>
            </div>
          </div>

          {/* Hint Escalation Button */}
          <button
            onClick={() => setShowHintModal(true)}
            className="glass-button p-2.5 rounded-xl text-cyan-200 hover:text-white border border-cyan-glow/30 hover:border-cyan-glow cursor-pointer"
            title="Need Guidance? (3-Tier Hint Ladder)"
            aria-label="Hints"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Sound Mute Toggle */}
          <button
            onClick={() => {
              toggleMute();
              audioService.setMuted(!settings.muted);
            }}
            className="glass-button p-2.5 rounded-xl text-gray-300 hover:text-white cursor-pointer"
            title={settings.muted ? 'Unmute Ambient Sound' : 'Mute Ambient Sound'}
            aria-label="Toggle audio"
          >
            {settings.muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-glow" />}
          </button>

          {/* Reduced Motion Toggle */}
          <button
            onClick={toggleReducedMotion}
            className={`glass-button p-2.5 rounded-xl ${settings.reducedMotion ? 'text-amber-400 border-amber-400/50' : 'text-gray-300 hover:text-white'} cursor-pointer`}
            title="Toggle Reduced Motion"
            aria-label="Toggle reduced motion"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progressive 3-Tier Hint Modal */}
      {showHintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl max-w-lg w-full border border-cyan-glow/30 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowHintModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1"
              aria-label="Close hints"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-cyan-200 text-xs font-mono uppercase tracking-widest mb-2">
              <Sparkles className="w-4 h-4 text-emerald-glow" />
              <span>Whispers of Guidance</span>
            </div>

            <h2 className="font-cinzel text-xl font-bold text-white mb-4">
              Hint Ladder: Tier {hintTier + 1} of 3
            </h2>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6 text-sm text-gray-200 leading-relaxed italic">
              "{currentHint}"
            </div>

            {/* Hint Tier Pills */}
            <div className="flex items-center space-x-2 mb-6">
              {[0, 1, 2].map((tier) => (
                <div
                  key={tier}
                  className={`flex-1 h-1.5 rounded-full ${tier <= hintTier ? 'bg-cyan-glow' : 'bg-white/10'}`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              {hintTier < 2 ? (
                <button
                  onClick={handleNextHintTier}
                  className="py-2.5 px-4 rounded-xl glass-button text-xs font-mono text-cyan-200 hover:text-white flex items-center space-x-2 cursor-pointer border border-cyan-glow/30"
                >
                  <span>Need Stronger Hint?</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-xs text-gray-400 font-mono">Explicit direction displayed.</span>
              )}

              <button
                onClick={() => setShowHintModal(false)}
                className="py-2.5 px-5 rounded-xl bg-cyan-600/80 hover:bg-cyan-500 text-white font-cinzel text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

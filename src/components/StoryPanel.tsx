import { useMemo } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import { useTypewriter } from '../hooks/useTypewriter';
import { getNode } from '../story/storyEngine';
import { Sparkles, ArrowRight, Clock, BookOpen, Gem, User } from 'lucide-react';

interface StoryPanelProps {
  onChoiceMade?: (choiceId: string) => void;
}

const SPEAKER_ICONS = {
  narrator: User,
  clock: Clock,
  book: BookOpen,
  crystal: Gem,
};

const SPEAKER_NAMES = {
  narrator: 'Chronicles of the Realm',
  clock: 'The Forgotten Clock',
  book: 'The Living Book',
  crystal: 'The Last Crystal',
};

export function StoryPanel({ onChoiceMade }: StoryPanelProps) {
  const {
    node,
    choices,
    makeChoice,
    activeDialogue,
    isAiLoading,
    settings,
  } = useGameStore();

  const nodeData = useMemo(() => getNode(node), [node]);

  // Use AI dialogue if present, otherwise node's fallback dialogue
  const fullText = useMemo(() => {
    if (activeDialogue) return activeDialogue;
    return nodeData?.fallback.dialogue.join(' ') ?? 'The ancient realm listens in silence...';
  }, [activeDialogue, nodeData]);

  const speaker = nodeData?.speaker ?? 'narrator';
  const SpeakerIcon = SPEAKER_ICONS[speaker];
  const speakerName = SPEAKER_NAMES[speaker];

  const { displayedText, isComplete, skip } = useTypewriter(fullText, {
    speed: 18,
    reducedMotion: settings.reducedMotion,
  });

  const handleChoiceClick = (choiceId: string) => {
    makeChoice(choiceId);
    onChoiceMade?.(choiceId);
  };

  return (
    <div className="w-full max-w-3xl mx-auto z-40 transition-all">
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-cyan-glow/20 shadow-glow-cyan/20 backdrop-blur-xl relative">
        {/* Speaker Header */}
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-deep/80 border border-cyan-glow/40 flex items-center justify-center text-cyan-200">
              <SpeakerIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase font-mono tracking-widest text-emerald-glow">
                Speaker
              </p>
              <h2 className="font-cinzel text-base sm:text-lg font-bold text-white">
                {speakerName}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isAiLoading && (
              <span className="flex items-center space-x-1.5 text-xs text-cyan-300 font-mono animate-pulse bg-cyan-950/40 px-2.5 py-1 rounded-full border border-cyan-500/20">
                <Sparkles className="w-3 h-3" />
                <span>AI Weaving...</span>
              </span>
            )}
            {!isComplete && (
              <button
                onClick={skip}
                className="text-xs text-gray-400 hover:text-cyan-200 font-mono underline cursor-pointer px-2 py-1"
              >
                Skip Typewriter
              </button>
            )}
          </div>
        </div>

        {/* Narrative Dialogue Body */}
        <div
          onClick={skip}
          className="text-gray-200 text-sm sm:text-base leading-relaxed font-light min-h-[4.5rem] mb-6 cursor-pointer select-none"
        >
          <p className="italic">{displayedText}</p>
        </div>

        {/* Choice Buttons List */}
        {isComplete && choices.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-xs uppercase tracking-widest text-gray-400 font-mono mb-2">
              Select Your Path:
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleChoiceClick(choice.id)}
                  className="w-full text-left p-3.5 sm:p-4 rounded-xl glass-button text-gray-200 hover:text-white text-xs sm:text-sm font-medium flex items-center justify-between group transition-all cursor-pointer border border-white/10 hover:border-cyan-glow/50 hover:bg-cyan-950/20"
                >
                  <span className="leading-snug flex-1 pr-3">{choice.label}</span>
                  <ArrowRight className="w-4 h-4 text-cyan-glow transform group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
